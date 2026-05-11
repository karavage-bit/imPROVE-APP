// Crisis keyword detection for Distance Traveled entries.
// Returns the first matching keyword or null.

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it', 'want to die', 'hurt myself',
  'self-harm', 'self harm', 'cutting myself', 'no reason to live',
  "can't go on", 'hopeless', 'worthless', 'alone forever',
  'not worth living', 'end my life',
];

export function detectCrisis(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  return CRISIS_KEYWORDS.find(kw => lower.includes(kw)) ?? null;
}

// Insert a dt_flags row if a crisis keyword is found in any text field.
export async function maybeFlagCrisis(supabase, studentId, dayId, fields) {
  const combined = Object.values(fields).filter(Boolean).join(' ');
  const hit = detectCrisis(combined);
  if (!hit) return;

  // Dedup: skip if an open crisis flag already exists for this student+day
  const { data: existing } = await supabase
    .from('dt_flags')
    .select('id')
    .eq('student_id', studentId)
    .eq('day_id', dayId)
    .eq('flag_type', 'crisis_language')
    .eq('status', 'open')
    .maybeSingle();

  if (existing) return;

  const excerpt = combined.slice(0, 200);
  await supabase.from('dt_flags').insert({
    student_id: studentId,
    day_id: dayId,
    flag_type: 'crisis_language',
    severity: 'urgent',
    excerpt,
  });
}
