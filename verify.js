// API Route: /api/verify
// Generates a permanent, shareable Verification record after a skill is completed.
// Receives the full Defense submission + the evaluator's judgment.

import { getServiceClient } from "../../src/lib/supabase";
import { SKILLS } from "../../src/data/skills";
import { SKILL_VERSIONS } from "../../src/data/versions";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Authentication required" });

  const sb = getServiceClient();
  const { data: userData, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !userData?.user) {
    return res.status(401).json({ error: "Invalid auth token" });
  }
  const userId = userData.user.id;

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
    } = req.body;

    if (typeof skillId !== "number" || skillId < 0 || skillId > 9) {
      return res.status(400).json({ error: "Invalid skillId" });
    }
    if (!hookResponse || !scienceResponse || !challengeResponse) {
      return res.status(400).json({ error: "Missing earlier-step responses" });
    }
    if (!defenseInitial || !defenseQ1 || !defenseQ2 || !defenseQ3) {
      return res.status(400).json({ error: "Missing defense responses" });
    }
    if (!defenseJudgment || !["engaged", "partially_engaged"].includes(defenseJudgment)) {
      return res.status(400).json({ error: "Verification requires engaged or partially_engaged judgment" });
    }

    const skill = SKILLS[skillId];
    if (!skill) return res.status(404).json({ error: "Skill not found" });

    const { data: profile } = await sb.from("profiles").select("display_name").eq("id", userId).single();
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const { data: verification, error: insertErr } = await sb
      .from("verifications")
      .insert({
        user_id: userId,
        display_name: profile.display_name,
        skill_id: skillId,
        skill_name: skill.name,
        skill_version: SKILL_VERSIONS[skillId],
        citations: skill.science.citation,
        hook_response: hookResponse,
        science_response: scienceResponse,
        challenge_response: challengeResponse,
        defense_initial: defenseInitial,
        defense_q1: defenseQ1,
        defense_q2: defenseQ2,
        defense_q3: defenseQ3,
        defense_judgment: defenseJudgment,
        defense_observation: defenseObservation,
        is_public: true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Mark all 5 steps of this skill as completed
    for (let step = 0; step < 5; step++) {
      await sb.from("skill_progress").upsert(
        {
          user_id: userId,
          skill_id: skillId,
          skill_version: SKILL_VERSIONS[skillId],
          step,
          step_status: "completed",
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id,skill_id,step,skill_version" }
      );
    }

    // Schedule spaced revisit nudges
    const now = new Date();
    const intervals = [
      { type: "challenge_followup", days: 2 },
      { type: "spaced_revisit_30", days: 30 },
      { type: "spaced_revisit_90", days: 90 },
      { type: "spaced_revisit_180", days: 180 },
    ];

    for (const { type, days } of intervals) {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() + days);
      await sb.from("nudges").insert({
        user_id: userId,
        skill_id: skillId,
        nudge_type: type,
        scheduled_for: scheduled.toISOString(),
      });
    }

    await sb.from("audit_log").insert({
      user_id: userId,
      event_type: "skill_verified",
      event_data: { skill_id: skillId, slug: verification.public_slug, judgment: defenseJudgment },
    });

    return res.status(200).json({
      slug: verification.public_slug,
      url: `/v/${verification.public_slug}`,
      verification,
    });
  } catch (err) {
    console.error("Verify API error:", err);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
