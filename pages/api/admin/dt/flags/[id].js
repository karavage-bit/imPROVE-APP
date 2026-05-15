import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../../lib/supabase-server';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res, ['PATCH']);
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });
  const { id } = req.query;
  const { status, notes } = req.body ?? {};
  const validStatuses = ['open', 'reviewed', 'dismissed'];
  if (status && !validStatuses.includes(status)) return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  const patch = { ...(status && { status }), ...(notes !== undefined && { notes }) };
  if (status === 'reviewed') { patch.reviewed_by = user.id; patch.reviewed_at = new Date().toISOString(); }
  const { data, error } = await supabase.from('dt_flags').update(patch).eq('id', id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ flag: data });
}
