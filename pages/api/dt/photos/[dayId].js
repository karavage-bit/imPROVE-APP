import { createServerClient, getUser, methodNotAllowed } from '../../../../lib/supabase-server';

const BUCKET = 'dt-photos';
const MAX_BYTES = 500 * 1024; // 500 KB
const SIGNED_URL_TTL = 3600;  // 1 hour

export const config = { api: { bodyParser: { sizeLimit: '600kb' } } };

// GET    — returns a signed download URL for the student's photo on this day
// POST   — accepts { base64: '...', mimeType: 'image/jpeg' }, uploads to storage
// DELETE — removes the photo
export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) return methodNotAllowed(res, ['GET', 'POST', 'DELETE']);

  const { dayId } = req.query;
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const storagePath = `${user.id}/${dayId}.jpg`;

  if (req.method === 'GET') {
    const { data: row } = await supabase
      .from('dt_photos')
      .select('storage_path')
      .eq('student_id', user.id)
      .eq('day_id', dayId)
      .maybeSingle();

    if (!row) return res.status(404).json({ url: null });

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(row.storage_path, SIGNED_URL_TTL);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ url: data.signedUrl });
  }

  if (req.method === 'POST') {
    const { base64, mimeType = 'image/jpeg' } = req.body ?? {};
    if (!base64) return res.status(400).json({ error: 'base64 is required' });

    const buf = Buffer.from(base64, 'base64');
    if (buf.length > MAX_BYTES)
      return res.status(400).json({ error: `Photo exceeds ${MAX_BYTES / 1024}KB limit` });

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buf, { contentType: mimeType, upsert: true });

    if (uploadError) return res.status(500).json({ error: uploadError.message });

    await supabase.from('dt_photos').upsert(
      { student_id: user.id, day_id: dayId, storage_path: storagePath, bytes: buf.length },
      { onConflict: 'student_id,day_id' }
    );

    return res.status(200).json({ ok: true });
  }

  // DELETE
  const { data: row } = await supabase
    .from('dt_photos')
    .select('storage_path')
    .eq('student_id', user.id)
    .eq('day_id', dayId)
    .maybeSingle();

  if (!row) return res.status(404).json({ error: 'Not found' });

  await supabase.storage.from(BUCKET).remove([row.storage_path]);
  await supabase.from('dt_photos').delete().eq('student_id', user.id).eq('day_id', dayId);

  return res.status(200).json({ ok: true });
}
