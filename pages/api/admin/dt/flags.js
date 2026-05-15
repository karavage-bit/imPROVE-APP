import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../lib/supabase-server';

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST']);
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });

  if (req.method === 'GET') {
    const { status, severity, studentId } = req.query;
    let query = supabase.from('dt_flags').select('*, profiles!student_id(display_name, email)').order('created_at', { ascending: false });
    if (status) query = query.eq('status', status);
    if (severity) query = query.eq('severity', severity);
    if (studentId) query = query.eq('student_id', studentId);
    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ flags: data });
  }

  const { studentId, dayId, excerpt, notes } = req.body ?? {};
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });
  const { data, error } = await supabase.from('dt_flags').insert({ student_id: studentId, day_id: dayId ?? null, flag_type: 'manual', severity: 'attention', excerpt: excerpt ?? null, notes: notes ?? null }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ flag: data });
}
