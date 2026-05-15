import { createServerClient, getUser, assertInstructor, methodNotAllowed } from '../../../../../lib/supabase-server';

const BUCKET_PHOTOS = 'dt-photos';
const BUCKET_VOICES = 'dt-voices';
const SIGNED_TTL = 3600;

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res, ['GET']);
  const supabase = createServerClient(req);
  const user = await getUser(supabase);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  if (!(await assertInstructor(supabase, user))) return res.status(403).json({ error: 'Forbidden' });
  const { id: studentId } = req.query;

  const [{ data: meta }, { data: entries }, { data: photos }, { data: voices }, { data: flags }, { data: earned }, { data: days }] = await Promise.all([
    supabase.from('dt_meta').select('*').eq('student_id', studentId).maybeSingle(),
    supabase.from('dt_entries').select('*').eq('student_id', studentId).order('updated_at', { ascending: false }),
    supabase.from('dt_photos').select('*').eq('student_id', studentId),
    supabase.from('dt_voices').select('*').eq('student_id', studentId),
    supabase.from('dt_flags').select('*').eq('student_id', studentId).order('created_at', { ascending: false }),
    supabase.from('dt_earned_moments').select('*').eq('student_id', studentId),
    supabase.from('dt_days').select('id, title, date_label, region, week, display_order').is('cohort_id', null).order('display_order'),
  ]);

  const [photoSigned, voiceSigned] = await Promise.all([
    Promise.all((photos ?? []).map(async p => { const { data } = await supabase.storage.from(BUCKET_PHOTOS).createSignedUrl(p.storage_path, SIGNED_TTL); return { dayId: p.day_id, url: data?.signedUrl ?? null }; })),
    Promise.all((voices ?? []).map(async v => { const { data } = await supabase.storage.from(BUCKET_VOICES).createSignedUrl(v.storage_path, SIGNED_TTL); return { dayId: v.day_id, url: data?.signedUrl ?? null, duration: v.duration_seconds }; })),
  ]);

  const photoUrlMap = new Map(photoSigned.map(p => [p.dayId, p.url]));
  const voiceUrlMap = new Map(voiceSigned.map(v => [v.dayId, v]));
  const dayMeta = new Map((days ?? []).map(d => [d.id, d]));
  const stream = (entries ?? []).map(e => ({ dayId: e.day_id, dayTitle: dayMeta.get(e.day_id)?.title ?? e.day_id, dayDate: dayMeta.get(e.day_id)?.date_label ?? '', region: dayMeta.get(e.day_id)?.region ?? '', realMoment: e.real_moment, horizon: e.horizon, pin: e.pin, completed: e.completed, completedAt: e.completed_at, updatedAt: e.updated_at, photoUrl: photoUrlMap.get(e.day_id) ?? null, voice: voiceUrlMap.get(e.day_id) ?? null }));
  return res.status(200).json({ meta: meta ?? null, stream, flags: flags ?? [], earnedMoments: earned ?? [] });
}
