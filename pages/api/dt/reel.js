import { createServerClient, getUser, methodNotAllowed } from '../../../lib/supabase-server';

const BUCKET_PHOTOS = 'dt-photos';
const BUCKET_VOICES = 'dt-voices';
const SIGNED_URL_TTL = 3600;

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const [{ data: entries }, { data: photos }, { data: voices }, { data: days }] = await Promise.all([
    supabase.from('dt_entries').select('day_id, real_moment, horizon, pin, completed, completed_at').eq('student_id', user.id).eq('completed', true),
    supabase.from('dt_photos').select('day_id, storage_path').eq('student_id', user.id),
    supabase.from('dt_voices').select('day_id, storage_path, duration_seconds').eq('student_id', user.id),
    supabase.from('dt_days').select('id, week, region, date_label, title, type, key_skill, theory_name, theory_author, display_order').is('cohort_id', null).order('display_order', { ascending: true }),
  ]);

  const entryMap = new Map((entries ?? []).map(e => [e.day_id, e]));
  const photoMap = new Map((photos ?? []).map(p => [p.day_id, p.storage_path]));
  const voiceMap = new Map((voices ?? []).map(v => [v.day_id, v]));
  const completedDayIds = [...entryMap.keys()];

  const [photoUrls, voiceUrls] = await Promise.all([
    Promise.all(completedDayIds.filter(id => photoMap.has(id)).map(async id => { const { data } = await supabase.storage.from(BUCKET_PHOTOS).createSignedUrl(photoMap.get(id), SIGNED_URL_TTL); return [id, data?.signedUrl ?? null]; })),
    Promise.all(completedDayIds.filter(id => voiceMap.has(id)).map(async id => { const { data } = await supabase.storage.from(BUCKET_VOICES).createSignedUrl(voiceMap.get(id).storage_path, SIGNED_URL_TTL); return [id, { url: data?.signedUrl ?? null, duration: voiceMap.get(id).duration_seconds }]; })),
  ]);

  const photoUrlMap = new Map(photoUrls);
  const voiceUrlMap = new Map(voiceUrls);
  const slides = (days ?? []).filter(d => entryMap.has(d.id)).map(d => { const e = entryMap.get(d.id); return { dayId: d.id, week: d.week, region: d.region, date: d.date_label, title: d.title, type: d.type, keySkill: d.key_skill, theory: { name: d.theory_name, author: d.theory_author }, realMoment: e.real_moment ?? '', horizon: e.horizon ?? '', pin: e.pin ?? '', completedAt: e.completed_at, photoUrl: photoUrlMap.get(d.id) ?? null, voice: voiceUrlMap.get(d.id) ?? null }; });

  res.setHeader('Cache-Control', 'private, no-store');
  return res.status(200).json({ slides });
}
