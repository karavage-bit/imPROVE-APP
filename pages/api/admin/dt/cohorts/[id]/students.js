import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../../../lib/supabase-server';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });
  const { id: cohortId } = req.query;

  if (req.method === 'GET') {
    const { data: enrollments, error } = await supabase.from('dt_enrollments').select('student_id, enrolled_at, profiles(id, display_name, email)').eq('cohort_id', cohortId);
    if (error) return res.status(500).json({ error: error.message });
    const studentIds = (enrollments ?? []).map(e => e.student_id);
    const [{ data: entries }, { data: metas }, { data: flags }] = await Promise.all([
      supabase.from('dt_entries').select('student_id, completed, updated_at').in('student_id', studentIds),
      supabase.from('dt_meta').select('student_id, name, value1, value2, onboarded_at').in('student_id', studentIds),
      supabase.from('dt_flags').select('student_id, flag_type, severity, status').in('student_id', studentIds).eq('status', 'open'),
    ]);
    const entryMap = new Map();
    for (const e of entries ?? []) { if (!entryMap.has(e.student_id)) entryMap.set(e.student_id, { total: 0, completed: 0, lastActivity: null }); const s = entryMap.get(e.student_id); s.total++; if (e.completed) s.completed++; if (!s.lastActivity || e.updated_at > s.lastActivity) s.lastActivity = e.updated_at; }
    const metaMap = new Map((metas ?? []).map(m => [m.student_id, m]));
    const flagMap = new Map();
    for (const f of flags ?? []) { if (!flagMap.has(f.student_id)) flagMap.set(f.student_id, []); flagMap.get(f.student_id).push(f); }
    const students = (enrollments ?? []).map(e => ({ id: e.student_id, name: metaMap.get(e.student_id)?.name ?? e.profiles?.display_name ?? 'Unknown', email: e.profiles?.email ?? null, enrolledAt: e.enrolled_at, onboarded: !!metaMap.get(e.student_id)?.onboarded_at, values: [metaMap.get(e.student_id)?.value1, metaMap.get(e.student_id)?.value2].filter(Boolean), charted: entryMap.get(e.student_id)?.completed ?? 0, totalEntries: entryMap.get(e.student_id)?.total ?? 0, lastActivity: entryMap.get(e.student_id)?.lastActivity ?? null, openFlags: flagMap.get(e.student_id) ?? [] }));
    return res.status(200).json({ students });
  }

  const { studentId } = req.body ?? {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });
  const { data, error } = await supabase.from('dt_enrollments').insert({ student_id: studentId, cohort_id: cohortId }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ enrollment: data });
}
