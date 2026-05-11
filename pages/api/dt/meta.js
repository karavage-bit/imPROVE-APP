import { createServerClient, getUser, methodNotAllowed } from '../../../lib/supabase-server';

export default async function handler(req, res) {
  if (!['GET', 'POST', 'PATCH'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'PATCH']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'GET') {
    const { data: meta } = await supabase
      .from('dt_meta')
      .select('*')
      .eq('student_id', user.id)
      .maybeSingle();

    // Also return cohort info if enrolled
    const { data: enrollment } = await supabase
      .from('dt_enrollments')
      .select('cohort_id, dt_cohorts(id, name, start_date, end_date, atlas_unlock_date, atlas_unlock_threshold)')
      .eq('student_id', user.id)
      .maybeSingle();

    return res.status(200).json({ meta: meta ?? null, cohort: enrollment?.dt_cohorts ?? null });
  }

  const { name, value1, value2 } = req.body ?? {};

  if (req.method === 'POST') {
    if (!value1 || !value2) return res.status(400).json({ error: 'value1 and value2 are required' });

    const { data, error } = await supabase
      .from('dt_meta')
      .upsert({
        student_id: user.id,
        name: name ?? null,
        value1,
        value2,
        onboarded_at: new Date().toISOString(),
      }, { onConflict: 'student_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ meta: data });
  }

  // PATCH — partial update
  const patch = {};
  if (name !== undefined) patch.name = name;
  if (value1 !== undefined) patch.value1 = value1;
  if (value2 !== undefined) patch.value2 = value2;

  const { data, error } = await supabase
    .from('dt_meta')
    .update(patch)
    .eq('student_id', user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ meta: data });
}
