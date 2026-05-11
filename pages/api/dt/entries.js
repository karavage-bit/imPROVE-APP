import { createServerClient, getUser, methodNotAllowed } from '../../../lib/supabase-server';

// GET /api/dt/entries — all entries for the current student, with photo/voice presence flags
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const [{ data: entries }, { data: photos }, { data: voices }] = await Promise.all([
    supabase
      .from('dt_entries')
      .select('day_id, real_moment, horizon, pin, completed, completed_at, updated_at')
      .eq('student_id', user.id),
    supabase
      .from('dt_photos')
      .select('day_id')
      .eq('student_id', user.id),
    supabase
      .from('dt_voices')
      .select('day_id, duration_seconds')
      .eq('student_id', user.id),
  ]);

  const photoSet = new Set((photos ?? []).map(p => p.day_id));
  const voiceMap = new Map((voices ?? []).map(v => [v.day_id, v.duration_seconds]));

  // Shape: { [dayId]: entryObject } matching the frontend state contract
  const state = {};
  for (const e of (entries ?? [])) {
    state[e.day_id] = {
      realMoment: e.real_moment ?? '',
      horizon: e.horizon ?? '',
      pin: e.pin ?? '',
      completed: e.completed,
      completedAt: e.completed_at,
      updatedAt: e.updated_at,
      hasPhoto: photoSet.has(e.day_id),
      voiceDuration: voiceMap.get(e.day_id) ?? null,
    };
  }

  // Include days that only have media (no text entry yet)
  for (const dayId of photoSet) {
    if (!state[dayId]) state[dayId] = { hasPhoto: true };
  }
  for (const [dayId, dur] of voiceMap) {
    if (!state[dayId]) state[dayId] = {};
    state[dayId].voiceDuration = dur;
  }

  return res.status(200).json({ state });
}
