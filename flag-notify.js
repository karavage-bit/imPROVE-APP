// API Route: /api/flag-notify
// Called when content is flagged as concerning or inappropriate.
// 1. Creates a flag_lock record (locks the account)
// 2. Emails the student — calm, non-punitive, explains what happens next
// 3. Emails the parent — explains the flag, gives them a confirmation link
// Platform stays locked until parent clicks the confirmation link.
//
// IMPORTANT: We store the flag TYPE and CATEGORY but NOT the flagged content
// in the flag_locks table. The content stays only in the review_queue or
// skill_progress — accessible to Blueprint but not surfaced to parents
// without careful context.

import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail } from "../../src/lib/email";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  // This route is called from server-side only (from other API routes).
  // Verify the internal secret so it can't be called directly from the browser.
  const internalSecret = req.headers["x-internal-secret"];
  if (internalSecret !== process.env.INTERNAL_API_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { userId, flagType, flagCategory, studentEmail, parentEmail } = req.body;

    if (!userId || !flagType || !studentEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sb = getServiceClient();

    // Create the flag lock record
    const { data: lock, error: lockErr } = await sb
      .from("flag_locks")
      .insert({
        user_id: userId,
        flag_type: flagType,
        flag_category: flagCategory || "general",
        student_email: studentEmail,
        parent_email: parentEmail || null,
        is_active: true,
      })
      .select()
      .single();

    if (lockErr) throw lockErr;

    const confirmUrl = `${process.env.APP_URL}/api/parent-confirm-flag?token=${lock.confirm_token}`;

    // Email to student — calm, clear, not punitive
    const studentEmailResult = await sendEmail({
      to: studentEmail,
      subject: "A note about your imPROVED submission",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2a2a2a;">
          <p style="font-size: 16px; line-height: 1.7;">Hi,</p>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            Something in your recent writing on imPROVED was flagged by our safety system.
            This happens automatically when certain words or phrases are detected that might
            indicate you're going through something difficult.
          </p>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            Your access to the platform has been paused temporarily. This is not a punishment
            and it doesn't mean you did anything wrong. It means we take seriously the
            possibility that you might need support.
          </p>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            Your parent or guardian has been notified and will receive an email asking them
            to review this. Once they confirm they've seen it, your access will be restored.
          </p>

          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="font-size: 14px; color: #444; margin: 0 0 12px; font-weight: 600;">
              If you're going through something difficult right now:
            </p>
            <p style="font-size: 14px; color: #555; margin: 0 0 8px;">
              📞 <strong>988 Suicide and Crisis Lifeline</strong> — Call or text 988, available 24/7
            </p>
            <p style="font-size: 14px; color: #555; margin: 0 0 8px;">
              💬 <strong>Crisis Text Line</strong> — Text HOME to 741741
            </p>
            <p style="font-size: 14px; color: #555; margin: 0;">
              You don't have to be in immediate danger to reach out. That's what they're there for.
            </p>
          </div>

          <p style="font-size: 14px; color: #666; line-height: 1.7;">
            If this was flagged in error and you're completely fine, that's okay too.
            Your parent's confirmation will restore your access and you can continue.
          </p>

          <p style="font-size: 14px; color: #666;">— The imPROVED Team</p>
        </div>
      `,
    });

    await sb
      .from("flag_locks")
      .update({ student_notified_at: new Date().toISOString() })
      .eq("id", lock.id);

    // Email to parent — clear, actionable, non-alarming but honest
    if (parentEmail) {
      await sendEmail({
        to: parentEmail,
        subject: "Action needed: imPROVED flagged content in your student's submission",
        html: `
          <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2a2a2a;">
            <p style="font-size: 16px; line-height: 1.7;">Hello,</p>

            <p style="font-size: 15px; line-height: 1.85; color: #444;">
              Our platform's safety system flagged something in your student's recent writing
              on imPROVED. We've temporarily paused their access to the platform.
            </p>

            <p style="font-size: 15px; line-height: 1.85; color: #444;">
              We're not able to share the specific content in this email — that conversation
              belongs between you and your student. What we can tell you is that our system
              detected language that may indicate emotional distress or difficulty.
            </p>

            <p style="font-size: 15px; line-height: 1.85; color: #444;">
              <strong>We're asking you to check in with your student directly.</strong>
              Once you've done that, click the button below to confirm you've reviewed this
              situation. That will restore their access to the platform.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${confirmUrl}"
                style="display: inline-block; padding: 14px 32px; background: #1B2845;
                color: #E8B84B; border-radius: 8px; text-decoration: none;
                font-weight: 600; font-size: 15px;">
                I've reviewed this with my student — restore access →
              </a>
            </div>

            <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="font-size: 14px; color: #444; margin: 0 0 8px; font-weight: 600;">
                Crisis resources if needed:
              </p>
              <p style="font-size: 14px; color: #555; margin: 0 0 6px;">
                📞 988 Suicide and Crisis Lifeline — Call or text 988
              </p>
              <p style="font-size: 14px; color: #555; margin: 0 0 6px;">
                💬 Crisis Text Line — Text HOME to 741741
              </p>
              <p style="font-size: 14px; color: #555; margin: 0;">
                🔒 Childhelp Child Abuse Hotline — 1-800-422-4453
              </p>
            </div>

            <p style="font-size: 13px; color: #888; line-height: 1.7;">
              This notification is part of imPROVED's safety policy, which was disclosed
              in the platform's terms of service and student welcome flow. If you have
              questions, reply to this email.
            </p>

            <p style="font-size: 13px; color: #888;">
              — John Karavage, imPROVED
            </p>
          </div>
        `,
      });

      await sb
        .from("flag_locks")
        .update({ parent_notified_at: new Date().toISOString() })
        .eq("id", lock.id);
    }

    // Audit log
    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "content_flagged",
      event_data: {
        flag_type: flagType,
        flag_category: flagCategory,
        lock_id: lock.id,
        parent_notified: !!parentEmail,
      },
    });

    return res.status(200).json({
      success: true,
      lockId: lock.id,
      parentNotified: !!parentEmail,
    });
  } catch (err) {
    console.error("Flag notify error:", err);
    return res.status(500).json({ error: err.message });
  }
}
