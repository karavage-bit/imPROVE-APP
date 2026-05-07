// API Route: /api/evaluate-defense
// ONE-SHOT AI evaluator. No live conversation.
// Receives the student's complete defense (initial + 3 follow-up responses)
// and returns a structured judgment: engaged | partially_engaged | evaded
// + one specific observation about what was missed if not fully engaged.
//
// Why this is safer than live Socratic chat:
// - No real-time pushback that could escalate with a vulnerable student
// - One API call instead of 6-15 (cheaper + dramatically less surface area)
// - Deterministic structure (we control the questions, not the AI)
// - Easier to QA: same input → roughly same evaluation
// - The student does the cognitive work; the AI only judges, never guides

import Anthropic from "@anthropic-ai/sdk";
import { getServiceClient } from "../../src/lib/supabase";
import { detectCrisisContent } from "../../src/lib/crisis";
import { SKILLS } from "../../src/data/skills";
import { SKILL_VERSIONS } from "../../src/data/versions";

export const config = {
  maxDuration: 30,
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RATE_LIMIT_MAX = 30; // evaluations per hour per user (generous)
const rateLimitStore = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const hour = Math.floor(now / 3_600_000);
  const key = `${userId}:${hour}`;
  const count = (rateLimitStore.get(key) || 0) + 1;
  rateLimitStore.set(key, count);

  if (rateLimitStore.size > 1000) {
    for (const [k] of rateLimitStore) {
      const h = parseInt(k.split(":")[1], 10);
      if (h < hour - 1) rateLimitStore.delete(k);
    }
  }
  return count <= RATE_LIMIT_MAX;
}

const EVALUATION_TOOL = [
  {
    name: "evaluate_defense",
    description:
      "Provide a structured judgment of the student's defense submission and one specific observation about what was missed (if applicable).",
    input_schema: {
      type: "object",
      properties: {
        judgment: {
          type: "string",
          enum: ["engaged", "partially_engaged", "evaded"],
          description:
            "'engaged' = the student substantively addressed each prompt with specificity and self-honesty, not generic talking points. 'partially_engaged' = real attempt with at least one prompt clearly evaded or answered with vague generalities. 'evaded' = consistently surface-level responses, deflection, or restating the prompt without genuine reflection.",
        },
        observation: {
          type: "string",
          description:
            "ONE specific sentence about what the student missed or evaded. If judgment is 'engaged', this should briefly note the strongest piece of their defense. If 'partially_engaged' or 'evaded', this should name the specific evasion clearly and constructively, without being harsh. Maximum 2 sentences. Never reference crisis content. Never give psychological advice. Never make claims about who they are as a person — only about what was demonstrated in the responses themselves.",
        },
      },
      required: ["judgment", "observation"],
    },
  },
];

function buildEvaluationPrompt(skill, defense) {
  return `You are an evaluator for the imPROVED skill platform. Your job is narrow: judge whether a student's written Defense submission demonstrates substantive engagement with the prompts they were given.

You are NOT a coach. You do NOT push back. You do NOT give advice. You do NOT psychoanalyze. You evaluate what is on the page.

SKILL: ${skill.name}
RESEARCH FOUNDATION: ${skill.science.citation}

SCENARIO THE STUDENT WAS GIVEN:
${defense.scenario}

INITIAL DEFENSE PROMPT: "What's your move?"
STUDENT'S INITIAL DEFENSE:
"""
${defense.initial}
"""

FOLLOW-UP QUESTION 1: "${defense.q1_question}"
STUDENT'S RESPONSE:
"""
${defense.q1}
"""

FOLLOW-UP QUESTION 2: "${defense.q2_question}"
STUDENT'S RESPONSE:
"""
${defense.q2}
"""

FOLLOW-UP QUESTION 3: "${defense.q3_question}"
STUDENT'S RESPONSE:
"""
${defense.q3}
"""

EVALUATION CRITERIA:
- Did they engage the SPECIFIC question asked, or pivot to a different question they preferred?
- Did they demonstrate self-honesty, or rationalize / deflect?
- Did they offer specifics from their own life or thinking, or generic talking points?
- Did they sit with discomfort, or jump immediately to comfortable resolution?

IMPORTANT RULES FOR YOUR OBSERVATION:
- Address the responses, NOT the person ("the response sidesteps X" not "you are avoiding X")
- Be constructive. Never harsh. Never punitive. Never pathologizing.
- Do not give advice. Do not suggest what they "should" feel or do.
- If you suspect any crisis content, do not engage with it; just judge based on the prompts given.
- Maximum 2 sentences for the observation.

Now use the evaluate_defense tool to provide your structured judgment.`;
}

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

  if (!checkRateLimit(userId)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  try {
    const { skillId, initial, q1, q2, q3, attemptNumber = 1 } = req.body;

    if (typeof skillId !== "number" || skillId < 0 || skillId > 9) {
      return res.status(400).json({ error: "Invalid skillId" });
    }
    if (!initial || !q1 || !q2 || !q3) {
      return res.status(400).json({ error: "All four defense responses required" });
    }

    const skill = SKILLS[skillId];
    if (!skill?.defense) return res.status(404).json({ error: "Skill not found" });

    // Crisis screening on EVERY submitted text - if detected, do NOT call the AI
    // and return a special judgment so the UI can surface resources.
    const allText = [initial, q1, q2, q3].join("\n");
    const crisis = detectCrisisContent(allText);
    if (crisis.detected) {
      // Log the flag (no content stored beyond what's in skill_progress)
      await sb.from("audit_log").insert({
        user_id: userId,
        event_type: "crisis_detected_in_defense",
        event_data: { skill_id: skillId, attempt: attemptNumber },
      });
      return res.status(200).json({
        judgment: "crisis_flag",
        observation: null,
      });
    }

    const defense = {
      scenario: skill.defense.scenario,
      initial,
      q1,
      q1_question: skill.defense.followUps[0],
      q2,
      q2_question: skill.defense.followUps[1],
      q3,
      q3_question: skill.defense.followUps[2],
    };

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 400,
      system:
        "You are a careful, fair evaluator. You judge written work against criteria. You do not coach, advise, or psychoanalyze. You are constructive but honest.",
      messages: [
        {
          role: "user",
          content: buildEvaluationPrompt(skill, defense),
        },
      ],
      tools: EVALUATION_TOOL,
      tool_choice: { type: "tool", name: "evaluate_defense" },
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse) {
      return res.status(500).json({ error: "Evaluator did not return structured response" });
    }

    const { judgment, observation } = toolUse.input;

    // Log the evaluation for audit / drift detection
    await sb.from("defense_evaluations").insert({
      user_id: userId,
      skill_id: skillId,
      skill_version: SKILL_VERSIONS[skillId],
      attempt_number: attemptNumber,
      defense_initial: initial,
      defense_q1: q1,
      defense_q2: q2,
      defense_q3: q3,
      judgment,
      observation,
      tokens_used: (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0),
    });

    return res.status(200).json({
      judgment,
      observation,
      usage: response.usage,
    });
  } catch (err) {
    console.error("Defense evaluation error:", err);
    if (err.status === 429) {
      return res.status(429).json({ error: "Anthropic rate limit hit" });
    }
    if (err.status >= 500) {
      return res.status(503).json({ error: "Anthropic service unavailable" });
    }
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
}
