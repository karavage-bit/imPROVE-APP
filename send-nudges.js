// API Route: /api/cron/send-nudges
// Runs hourly via Vercel Cron. Sends any pending nudges whose scheduled_for <= now.
//
// Configure in vercel.json:
// {
//   "crons": [{ "path": "/api/cron/send-nudges", "schedule": "0 * * * *" }]
// }
//
// Protect with CRON_SECRET environment variable.

import { getServiceClient } from "../../../src/lib/supabase";
import {
  sendEmail,
  buildChallengeFollowupEmail,
  buildSpacedRevisitEmail,
} from "../../../src/lib/email";
import { SKILLS } from "../../../src/data/skills";

export default async function handler(req, res) {
  // Verify this is from Vercel Cron
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const sb = getServiceClient();
  const now = new Date().toISOString();

  // Pull pending nudges (limit batch size to control execution time)
  const { data: pending, error } = await sb
    .from("nudges")
    .select("*, profiles(display_name, email)")
    .lte("scheduled_for", now)
    .is("sent_at", null)
    .limit(50);

  if (error) {
    console.error("Cron query error:", error);
    return res.status(500).json({ error: "Query failed" });
  }

  let sentCount = 0;

  for (const nudge of pending || []) {
    const profile = nudge.profiles;
    if (!profile?.email) continue;

    const skill = nudge.skill_id != null ? SKILLS[nudge.skill_id] : null;
    if (!skill && nudge.skill_id != null) continue;

    let emailContent;

    switch (nudge.nudge_type) {
      case "challenge_followup":
        emailContent = buildChallengeFollowupEmail({
          displayName: profile.display_name,
          skillName: skill.name,
          challengeTitle: skill.challenge.title,
        });
        break;
      case "spaced_revisit_30":
        emailContent = buildSpacedRevisitEmail({
          displayName: profile.display_name,
          skillName: skill.name,
          daysAgo: 30,
        });
        break;
      case "spaced_revisit_90":
        emailContent = buildSpacedRevisitEmail({
          displayName: profile.display_name,
          skillName: skill.name,
          daysAgo: 90,
        });
        break;
      case "spaced_revisit_180":
        emailContent = buildSpacedRevisitEmail({
          displayName: profile.display_name,
          skillName: skill.name,
          daysAgo: 180,
        });
        break;
      default:
        continue;
    }

    const result = await sendEmail({
      to: profile.email,
      ...emailContent,
    });

    if (!result.error) {
      await sb.from("nudges").update({ sent_at: new Date().toISOString() }).eq("id", nudge.id);
      sentCount++;
    }
  }

  return res.status(200).json({
    processed: pending?.length || 0,
    sent: sentCount,
  });
}
