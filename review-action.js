// API Route: /api/review-action
// Blueprint approves or returns a submission.
// On approve: creates the verification record, notifies student.
// On return: notifies student with Blueprint's specific feedback.

import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail } from "../../src/lib/email";
import { SKILLS } from "../../src/data/skills";
import { SKILL_VERSIONS } from "../../src/data/versions";

const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL || "hello@improvedskills.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  const sb = getServiceClient();

  const { data: userData } = await sb.auth.getUser(token);
  if (!userData?.user || userData.user.email !== REVIEWER_EMAIL) {
    return res.status(403).json({ error: "Access denied" });
  }

  const { submissionId, action, feedback } = req.body;
  if (!submissionId || !["approved", "returned"].includes(action)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const { data: submission } = await sb
    .from("review_queue")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (!submission) return res.status(404).json({ error: "Submission not found" });
  if (submission.status !== "pending") {
    return res.status(400).json({ error: "Submission already actioned" });
  }

  const skill = SKILLS[submission.skill_id];
  const now = new Date().toISOString();

  // Update the review queue record
  await sb.from("review_queue").update({
    status: action,
    reviewer_feedback: feedback || null,
    reviewed_at: now,
  }).eq("id", submissionId);

  if (action === "approved") {
    // Create the verification record
    const { data: verification } = await sb.from("verifications").insert({
      user_id: submission.user_id,
      display_name: submission.display_name,
      skill_id: submission.skill_id,
      skill_name: skill.name,
      skill_version: SKILL_VERSIONS[submission.skill_id],
      citations: skill.science.citation,
      hook_response: submission.hook_response,
      science_response: submission.science_response,
      challenge_response: submission.challenge_response,
      defense_initial: submission.defense_initial,
      defense_q1: submission.defense_q1,
      defense_q2: submission.defense_q2,
      defense_q3: submission.defense_q3,
      defense_judgment: submission.defense_judgment,
      defense_observation: submission.defense_observation,
      is_public: true,
    }).select().single();

    if (!verification) return res.status(500).json({ error: "Failed to create verification" });

    // Mark skill steps complete
    for (let step = 0; step < 5; step++) {
      await sb.from("skill_progress").upsert({
        user_id: submission.user_id,
        skill_id: submission.skill_id,
        skill_version: SKILL_VERSIONS[submission.skill_id],
        step,
        step_status: "completed",
        completed_at: now,
      }, { onConflict: "user_id,skill_id,step,skill_version" });
    }

    // Schedule spaced revisit nudges
    const intervals = [
      { type: "challenge_followup", days: 2 },
      { type: "spaced_revisit_30", days: 30 },
      { type: "spaced_revisit_90", days: 90 },
      { type: "spaced_revisit_180", days: 180 },
    ];
    for (const { type, days } of intervals) {
      const scheduled = new Date();
      scheduled.setDate(scheduled.getDate() + days);
      await sb.from("nudges").insert({
        user_id: submission.user_id,
        skill_id: submission.skill_id,
        nudge_type: type,
        scheduled_for: scheduled.toISOString(),
      });
    }

    const verifyUrl = `${process.env.APP_URL}/v/${verification.public_slug}`;

    // Email student — approved
    await sendEmail({
      to: submission.student_email,
      subject: `Your ${skill.name} skill has been verified — imPROVED`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2a2a2a;">
          <h2 style="color: #1B2845;">Your work has been reviewed and approved.</h2>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            I reviewed your ${skill.name} submission personally. Here's what I want you to know:
            completing this — without anyone requiring it — says something about who you are.
            That's not something every student does.
          </p>

          ${feedback ? `
          <div style="background:#f8f9fa;border-left:4px solid #E8B84B;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
            <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#888;">Note from your reviewer</strong>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.8;">${feedback}</p>
          </div>` : ""}

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            Your verification is live at the link below. You can share it with employers,
            college applications, or anyone you want to show your work to.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${verifyUrl}"
              style="display:inline-block;padding:14px 32px;background:#1B2845;color:#E8B84B;
              border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              View your verification →
            </a>
          </div>

          <p style="font-size: 13px; color: #888; line-height: 1.7;">
            — John Karavage, imPROVED<br>
            17+ years teaching Psychology and Leadership
          </p>
        </div>
      `,
    });

    await sb.from("audit_log").insert({
      user_id: submission.user_id,
      event_type: "skill_verified",
      event_data: { skill_id: submission.skill_id, slug: verification.public_slug, reviewer: "blueprint" },
    });

    return res.status(200).json({ success: true, slug: verification.public_slug });
  }

  if (action === "returned") {
    // Email student — returned with feedback
    await sendEmail({
      to: submission.student_email,
      subject: `Your ${skill.name} submission — feedback from your reviewer`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; color: #2a2a2a;">
          <h2 style="color: #1B2845;">Your submission needs a little more work.</h2>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            I reviewed your ${skill.name} submission. The standard on this platform is high
            because the credential means something. Here's my specific feedback:
          </p>

          <div style="background:#f8f9fa;border-left:4px solid #1B2845;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;">
            <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#888;">Feedback from your reviewer</strong>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.8;">${feedback}</p>
          </div>

          <p style="font-size: 15px; line-height: 1.85; color: #444;">
            Log back into imPROVED to revise and resubmit. Your previous responses are saved —
            you don't have to start from scratch. Read my feedback, revise what needs revising,
            and resubmit when you're ready.
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.APP_URL}/dashboard"
              style="display:inline-block;padding:14px 32px;background:#1B2845;color:#E8B84B;
              border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
              Return to imPROVED →
            </a>
          </div>

          <p style="font-size: 13px; color: #888; line-height: 1.7;">
            — John Karavage, imPROVED<br>
            17+ years teaching Psychology and Leadership
          </p>
        </div>
      `,
    });

    await sb.from("audit_log").insert({
      user_id: submission.user_id,
      event_type: "submission_returned",
      event_data: { skill_id: submission.skill_id, feedback_length: feedback?.length || 0 },
    });

    return res.status(200).json({ success: true });
  }
}
