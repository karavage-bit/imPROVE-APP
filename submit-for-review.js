// API Route: /api/submit-for-review
// Called after Defense evaluation is complete.
// Creates a review_queue record and emails Blueprint with everything.
// Verification is NOT issued until Blueprint approves.

import { getServiceClient } from "../../src/lib/supabase";
import { sendEmail } from "../../src/lib/email";
import { SKILLS } from "../../src/data/skills";
import { SKILL_VERSIONS } from "../../src/data/versions";

const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL || "hello@improvedskills.com";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const sb = getServiceClient();
  const { data: userData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userData?.user) return res.status(401).json({ error: "Invalid auth" });

  const userId = userData.user.id;

  // Check if user is locked before accepting submission
  const { data: lockCheck } = await sb.rpc("is_user_locked", { check_user_id: userId });
  if (lockCheck) {
    return res.status(403).json({ error: "Account locked pending parental review" });
  }

  try {
    const {
      skillId,
      hookResponse,
      scienceResponse,
      challengeResponse,
      defenseInitial,
      defenseQ1,
      defenseQ2,
      defenseQ3,
      defenseJudgment,
      defenseObservation,
      behavioralFlags = [],
    } = req.body;

    const skill = SKILLS[skillId];
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    const { data: profile } = await sb
      .from("profiles")
      .select("display_name, email")
      .eq("id", userId)
      .single();

    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Check for existing pending submission for this skill
    const { data: existing } = await sb
      .from("review_queue")
      .select("id, status")
      .eq("user_id", userId)
      .eq("skill_id", skillId)
      .eq("status", "pending")
      .single();

    if (existing) {
      return res.status(200).json({
        success: true,
        alreadyPending: true,
        message: "Your submission is already under review. You'll be notified by email when it's been reviewed.",
      });
    }

    // Insert into review queue
    const { data: submission, error: insertErr } = await sb
      .from("review_queue")
      .insert({
        user_id: userId,
        skill_id: skillId,
        skill_version: SKILL_VERSIONS[skillId],
        display_name: profile.display_name,
        student_email: profile.email,
        hook_response: hookResponse,
        science_response: scienceResponse,
        challenge_response: challengeResponse,
        defense_initial: defenseInitial,
        defense_q1: defenseQ1,
        defense_q2: defenseQ2,
        defense_q3: defenseQ3,
        defense_judgment: defenseJudgment,
        defense_observation: defenseObservation,
        behavioral_flags: behavioralFlags,
        status: "pending",
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Approve URL (one-click from email — must be authenticated as Blueprint)
    const reviewUrl = `${process.env.APP_URL}/review/${submission.id}`;

    // Format behavioral flags for email
    const flagsSection = behavioralFlags.length > 0
      ? `<div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin:16px 0;">
           <strong>⚠️ Behavioral Flags:</strong>
           <ul style="margin:8px 0 0;padding-left:20px;">
             ${behavioralFlags.map(f => `<li style="font-size:13px;">${f}</li>`).join("")}
           </ul>
         </div>`
      : `<p style="color:#28a745;font-size:13px;">✓ No behavioral flags detected</p>`;

    const aiJudgmentColor = defenseJudgment === "engaged" ? "#28a745" : defenseJudgment === "partially_engaged" ? "#ffc107" : "#dc3545";

    // Email to Blueprint
    await sendEmail({
      to: REVIEWER_EMAIL,
      subject: `[imPROVED Review] ${profile.display_name} — ${skill.name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 680px; margin: 0 auto; color: #2a2a2a;">
          <h2 style="color: #1B2845; margin-bottom: 4px;">New submission for review</h2>
          <p style="color: #888; font-size: 13px; margin-bottom: 24px;">
            ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>

          <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
            <tr>
              <td style="padding:8px;background:#f8f9fa;font-weight:600;width:140px;">Student</td>
              <td style="padding:8px;">${profile.display_name}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f8f9fa;font-weight:600;">Email</td>
              <td style="padding:8px;">${profile.email}</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f8f9fa;font-weight:600;">Skill</td>
              <td style="padding:8px;">${skill.name} (${SKILL_VERSIONS[skillId]})</td>
            </tr>
            <tr>
              <td style="padding:8px;background:#f8f9fa;font-weight:600;">AI Judgment</td>
              <td style="padding:8px;"><span style="color:${aiJudgmentColor};font-weight:700;">${defenseJudgment.replace("_", " ").toUpperCase()}</span></td>
            </tr>
          </table>

          ${flagsSection}

          ${defenseObservation ? `
          <div style="background:#e8f4f8;border-left:4px solid #1B2845;padding:12px 16px;margin:16px 0;border-radius:0 8px 8px 0;">
            <strong style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#666;">AI Observation</strong>
            <p style="margin:8px 0 0;font-size:14px;">${defenseObservation}</p>
          </div>` : ""}

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Hook Response</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${hookResponse}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Science Response</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${scienceResponse}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Challenge Documentation</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${challengeResponse}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Initial Defense</h3>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${defenseInitial}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Follow-up 1</h3>
          <p style="font-size:12px;color:#888;font-style:italic;margin-bottom:8px;">${skill.defense.followUps[0]}</p>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${defenseQ1}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Follow-up 2</h3>
          <p style="font-size:12px;color:#888;font-style:italic;margin-bottom:8px;">${skill.defense.followUps[1]}</p>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${defenseQ2}</div>

          <h3 style="color:#1B2845;font-size:14px;text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Follow-up 3</h3>
          <p style="font-size:12px;color:#888;font-style:italic;margin-bottom:8px;">${skill.defense.followUps[2]}</p>
          <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin-bottom:20px;font-size:14px;line-height:1.8;white-space:pre-wrap;">${defenseQ3}</div>

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">

          <div style="text-align:center;">
            <a href="${reviewUrl}"
              style="display:inline-block;padding:14px 32px;background:#1B2845;color:#E8B84B;
              border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-right:12px;">
              Review & Decide →
            </a>
          </div>

          <p style="font-size:11px;color:#aaa;text-align:center;margin-top:20px;">
            Submission ID: ${submission.id} · imPROVED Review System
          </p>
        </div>
      `,
    });

    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "submitted_for_review",
      event_data: { skill_id: skillId, submission_id: submission.id, judgment: defenseJudgment },
    });

    return res.status(200).json({
      success: true,
      submissionId: submission.id,
      message: "Your work has been submitted for review. You'll receive an email once it's been reviewed — typically within 5 business days.",
    });
  } catch (err) {
    console.error("Submit for review error:", err);
    return res.status(500).json({ error: err.message });
  }
}
