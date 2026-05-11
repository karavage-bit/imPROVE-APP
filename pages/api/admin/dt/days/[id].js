import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../../lib/supabase-server';

// PATCH /api/admin/dt/days/:id?cohortId=...
// Instructors can override any field of a curriculum day for a specific cohort.
// If cohortId is provided, creates/updates a cohort-scoped override row.
// If no cohortId, updates the default row.
export default async function handler(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });

  const { id: dayId, cohortId } = req.query;
  const body = req.body ?? {};

  const allowed = [
    'title', 'date_label', 'type', 'key_skill', 'concepts',
    'theory_name', 'theory_author', 'theory_summary',
    'hook', 'note', 'earned_key', 'location', 'display_order',
  ];

  const patch = {};
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key];
  }

  if (cohortId) {
    // Upsert a cohort-scoped override: copy the default row and apply the patch
    const { data: defaultRow } = await supabase
      .from('dt_days')
      .select('*')
      .eq('id', dayId)
      .is('cohort_id', null)
      .single();

    if (!defaultRow) return res.status(404).json({ error: 'Day not found' });

    const { id: _id, cohort_id: _cid, created_at: _ca, updated_at: _ua, ...base } = defaultRow;
    const overrideRow = { ...base, ...patch, id: dayId, cohort_id: cohortId };

    const { data, error } = await supabase
      .from('dt_days')
      .upsert(overrideRow, { onConflict: 'id,cohort_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ day: data });
  }

  // Update the default row directly
  const { data, error } = await supabase
    .from('dt_days')
    .update(patch)
    .eq('id', dayId)
    .is('cohort_id', null)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ day: data });
}
