import { createServerClient, getUser, methodNotAllowed } from '../../../../lib/supabase-server';

const BUCKET = 'dt-voices';
const MAX_BYTES = 1024 * 1024;
const SIGNED_URL_TTL = 3600;
export const config = { api: { bodyParser: { sizeLimit: '1100kb' } } };

export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);
  const { dayId } = req.query;
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const storagePath = `${user.id}/${dayId}.webm`;

  if (req.method === 'GET') {
    const { data: row } = await supabase.from('dt_voices').select('storage_path, duration_seconds').eq('student_id', user.id).eq('day_id', dayId).maybeSingle();
    if (!row) return res.status(404).json({ url: null, duration: null });
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(row.storage_path, SIGNED_URL_TTL);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ url: data.signedUrl, duration: row.duration_seconds });
  }

  if (req.method === 'POST') {
    const { base64, mimeType = 'audio/webm', durationSeconds } = req.body ?? {};
    if (!base64) return res.status(400).json({ error: 'base64 is required' });
    const buf = Buffer.from(base64, 'base64');
    if (buf.length > MAX_BYTES) return res.status(400).json({ error: `Voice memo exceeds ${MAX_BYTES / 1024}KB limit` });
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buf, { contentType: mimeType, upsert: true });
    if (uploadError) return res.status(500).json({ error: uploadError.message });
    await supabase.from('dt_voices').upsert({ student_id: user.id, day_id: dayId, storage_path: storagePath, duration_seconds: durationSeconds ?? null, bytes: buf.length }, { onConflict: 'student_id,day_id' });
    return res.status(200).json({ ok: true });
  }

  const { data: row } = await supabase.from('dt_voices').select('storage_path').eq('student_id', user.id).eq('day_id', dayId).maybeSingle();
  if (!row) return res.status(404).json({ error: 'Not found' });
  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from('dt_voices').delete().eq('student_id', user.id).eq('day_id', dayId);
  return res.status(200).json({ ok: true });
}
