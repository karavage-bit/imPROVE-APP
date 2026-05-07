// Crisis Detection Module
// Runs client-side BEFORE API calls.
// Triggers a resource overlay if input contains crisis indicators.
// Designed to NEVER block legitimate reflection — the user can always continue.

const CRISIS_PATTERNS = [
  // Self-harm and suicide indicators (direct)
  /\b(kill myself|killing myself|end my life|ending my life|suicide|suicidal)\b/i,
  /\b(want to die|wanna die|going to die soon|don'?t want to live|hate being alive)\b/i,
  /\b(cut myself|cutting myself|hurt myself|hurting myself|self harm|self-harm)\b/i,
  /\b(no reason to live|nothing to live for|better off dead|better off without me)\b/i,
  // Active abuse indicators
  /\b(being abused|he hits me|she hits me|they hit me|hits me at home)\b/i,
  /\b(being hurt by|sexually assaulted|raped|molested)\b/i,
];

export function detectCrisisContent(text) {
  if (!text || typeof text !== "string") return { detected: false };
  const matched = CRISIS_PATTERNS.find((p) => p.test(text));
  if (matched) {
    return {
      detected: true,
      pattern: matched.source,
      severity: "high",
    };
  }
  return { detected: false };
}

// Resources shown to users in crisis — always available, never blocking.
// Phone numbers verified for US; localize for other regions in production.
export const CRISIS_RESOURCES = {
  primary: {
    name: "988 Suicide and Crisis Lifeline",
    phone: "988",
    text: "Text 988",
    web: "https://988lifeline.org",
    description: "Free, confidential, 24/7. Call, text, or chat with a trained counselor.",
  },
  secondary: [
    {
      name: "Crisis Text Line",
      action: "Text HOME to 741741",
      web: "https://www.crisistextline.org",
      description: "Free crisis support via text message.",
    },
    {
      name: "Childhelp National Child Abuse Hotline",
      action: "Call 1-800-422-4453",
      web: "https://www.childhelphotline.org",
      description: "If you are being hurt by someone in your life.",
    },
    {
      name: "The Trevor Project (LGBTQ+ youth)",
      action: "Call 1-866-488-7386",
      web: "https://www.thetrevorproject.org",
      description: "Crisis support specifically for LGBTQ+ young people.",
    },
  ],
};
