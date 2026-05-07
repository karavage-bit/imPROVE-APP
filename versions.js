// Skill content versioning
// When skill content is materially updated, bump these versions.
// Verifications record the version a user completed against, so credentials
// remain meaningful even as content evolves.

export const SKILL_VERSIONS = {
  0: "v1.0",  // Self-Awareness
  1: "v1.0",  // Extreme Ownership
  2: "v1.0",  // Self-Regulation
  3: "v1.0",  // Communication
  4: "v1.0",  // Initiative
  5: "v1.0",  // Collaboration
  6: "v1.0",  // Resilience
  7: "v1.0",  // Credibility
  8: "v1.0",  // Cognitive Flexibility
  9: "v1.0",  // Embracing Discomfort
};

export const FREE_SKILL_IDS = [0, 1]; // Skills 1 and 2 are free; rest are paid
export const TOTAL_SKILLS = 10;
export const SOCRATIC_MIN_EXCHANGES = 6;
export const SOCRATIC_MAX_EXCHANGES = 15; // Hard cost ceiling
