import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../lib/supabase-server';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('dt_cohorts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ cohorts: data });
  }

  // POST — create cohort
  const { name, startDate, endDate, atlasUnlockDate, atlasUnlockThreshold } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });

  const { data, error } = await supabase
    .from('dt_cohorts')
    .insert({
      name,
      instructor_id: user.id,
      start_date: startDate ?? null,
      end_date: endDate ?? null,
      atlas_unlock_date: atlasUnlockDate ?? null,
      atlas_unlock_threshold: atlasUnlockThreshold ?? 24,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ cohort: data });
}
