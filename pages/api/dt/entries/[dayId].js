import { createServerClient, getUser, methodNotAllowed } from '../../../../lib/supabase-server';
import { maybeFlagCrisis } from '../../../../lib/dt-crisis';

// PUT   /api/dt/entries/:dayId — upsert entry text + completed toggle
// DELETE is intentionally not supported (data is permanent)
export default async function handler(req, res) {
  if (req.method !== 'PUT') return methodNotAllowed(res, ['PUT']);

  const { dayId } = req.query;
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { realMoment, horizon, pin, completed } = req.body ?? {};

  // Enforce char limits at the API layer
  if (realMoment && realMoment.length > 280)
    return res.status(400).json({ error: 'real_moment exceeds 280 characters' });
  if (horizon && horizon.length > 200)
    return res.status(400).json({ error: 'horizon exceeds 200 characters' });

  const payload = {
    student_id: user.id,
    day_id: dayId,
    ...(realMoment !== undefined && { real_moment: realMoment || null }),
    ...(horizon !== undefined && { horizon: horizon || null }),
    ...(pin !== undefined && { pin: pin || null }),
    ...(completed !== undefined && { completed: Boolean(completed) }),
  };

  const { data, error } = await supabase
    .from('dt_entries')
    .upsert(payload, { onConflict: 'student_id,day_id' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Async crisis scan — don't await, don't block response
  maybeFlagCrisis(supabase, user.id, dayId, {
    realMoment: realMoment ?? '',
    horizon: horizon ?? '',
    pin: pin ?? '',
  }).catch(() => {});

  // If completing for the first time, insert earned_moment if the day has an earned_key
  if (completed === true) {
    const { data: day } = await supabase
      .from('dt_days')
      .select('earned_key')
      .eq('id', dayId)
      .maybeSingle();

    if (day?.earned_key) {
      await supabase
        .from('dt_earned_moments')
        .upsert({ student_id: user.id, moment_key: day.earned_key }, { onConflict: 'student_id,moment_key' });
    }
  }

  return res.status(200).json({
    entry: {
      realMoment: data.real_moment ?? '',
      horizon: data.horizon ?? '',
      pin: data.pin ?? '',
      completed: data.completed,
      completedAt: data.completed_at,
      updatedAt: data.updated_at,
    },
  });
}
