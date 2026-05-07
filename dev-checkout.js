// API Route: /api/dev-checkout
// LOCAL DEVELOPMENT ONLY. Bypasses Stripe entirely.
// Grants paid tier access and generates a magic link for the student.
// This route is hard-disabled in production.

import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail } from "../../src/lib/email";

export default async function handler(req, res) {
  // SAFETY: This route only works when DEV_MODE is explicitly enabled.
  // In production, leave DEV_MODE unset or set to "false".
  if (process.env.DEV_MODE !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { studentEmail, parentEmail, tier = "paid" } = req.body;

    if (!studentEmail) {
      return res.status(400).json({ error: "studentEmail required" });
    }

    const sb = getServiceClient();

    // Generate magic link for the student
    const { data: linkData, error: linkErr } = await sb.auth.admin.generateLink({
      type: "magiclink",
      email: studentEmail,
      options: { redirectTo: `${process.env.APP_URL}/welcome` },
    });

    if (linkErr) throw linkErr;

    const magicLink = linkData?.properties?.action_link;
    const userId = linkData?.user?.id;

    if (userId) {
      await sb.from("profiles").upsert(
        {
          id: userId,
          email: studentEmail,
          display_name: studentEmail.split("@")[0],
          tier,
          paid_at: new Date().toISOString(),
          parent_attestation_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    }

    // Try to email it (works if Resend is configured), but always return the link
    if (parentEmail) {
      await sendEmail({
        to: parentEmail,
        subject: "[DEV] Your test imPROVED access",
        html: `
          <p><strong>DEV MODE — no payment processed.</strong></p>
          <p>Magic link for ${studentEmail}:</p>
          <p><a href="${magicLink}">${magicLink}</a></p>
        `,
      });
    }

    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "dev_checkout_used",
      event_data: { tier, student_email: studentEmail },
    });

    return res.status(200).json({
      success: true,
      magicLink, // returned directly so you can copy/paste even if email fails
      message: "DEV mode: account created, no payment processed.",
    });
  } catch (err) {
    console.error("Dev checkout error:", err);
    return res.status(500).json({ error: err.message });
  }
}
