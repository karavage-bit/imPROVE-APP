import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../lib/supabase-server';

// GET   /api/admin/dt/days?cohortId=...  — list days (default or cohort-scoped)
export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });

  const { cohortId } = req.query;

  let query = supabase
    .from('dt_days')
    .select('*')
    .order('display_order', { ascending: true });

  if (cohortId) {
    query = query.or(`cohort_id.is.null,cohort_id.eq.${cohortId}`);
  } else {
    query = query.is('cohort_id', null);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ days: data });
}
