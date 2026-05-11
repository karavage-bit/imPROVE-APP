import { createServerClient, getUser, methodNotAllowed } from '../../../lib/supabase-server';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);

  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Find the student's cohort (if any)
  const { data: enrollment } = await supabase
    .from('dt_enrollments')
    .select('cohort_id')
    .eq('student_id', user.id)
    .maybeSingle();

  const cohortId = enrollment?.cohort_id ?? null;

  // Return default curriculum (cohort_id IS NULL) merged with any cohort overrides.
  // Cohort rows supersede default rows with the same id.
  let query = supabase
    .from('dt_days')
    .select('*')
    .order('display_order', { ascending: true });

  if (cohortId) {
    query = query.or(`cohort_id.is.null,cohort_id.eq.${cohortId}`);
  } else {
    query = query.is('cohort_id', null);
  }

  const { data: rows, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // If cohort overrides exist, let them win over default rows with same id
  const map = new Map();
  // Default rows first, then overrides overwrite
  const defaults = rows.filter(r => r.cohort_id === null);
  const overrides = rows.filter(r => r.cohort_id !== null);
  defaults.forEach(r => map.set(r.id, r));
  overrides.forEach(r => map.set(r.id, r));

  const days = [...map.values()].sort((a, b) => a.display_order - b.display_order);

  // Normalize to the shape the frontend expects
  const normalized = days.map(d => ({
    id: d.id,
    week: d.week,
    region: d.region,
    date: d.date_label,
    title: d.title,
    type: d.type,
    coords: { x: d.coords_x, y: d.coords_y },
    location: d.location ?? undefined,
    keySkill: d.key_skill,
    concepts: d.concepts,
    theory: {
      name: d.theory_name,
      author: d.theory_author,
      summary: d.theory_summary,
    },
    hook: d.hook,
    note: d.note ?? undefined,
  }));

  res.setHeader('Cache-Control', 'private, max-age=300');
  return res.status(200).json({ days: normalized });
}
