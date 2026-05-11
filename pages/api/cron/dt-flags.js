import { createClient } from '@supabase/supabase-js';

// Nightly cron — runs at 2 AM UTC via Vercel Cron.
// Detects: stalled students, late starts, valley distress signals.
// Add to vercel.json: { "path": "/api/cron/dt-flags", "schedule": "0 2 * * *" }

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function isCourseActive() {
  const now = new Date();
  const start = new Date('2026-06-22');
  const end = new Date('2026-07-31T23:59:00Z');
  return now >= start && now <= end;
}

function daysSince(dateStr) {
  return (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const secret = req.headers['authorization']?.replace('Bearer ', '');
  if (secret !== process.env.CRON_SECRET) return res.status(401).end();

  if (!isCourseActive()) return res.status(200).json({ skipped: 'course not active' });

  const supabase = serviceClient();
  let flagsCreated = 0;

  // ── 1. Stalled students ─────────────────────────────────
  // No entry update in the last 5 days during active weeks.
  const { data: allStudents } = await supabase
    .from('dt_enrollments')
    .select('student_id');

  for (const { student_id } of allStudents ?? []) {
    const { data: latestEntry } = await supabase
      .from('dt_entries')
      .select('updated_at')
      .eq('student_id', student_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastActivity = latestEntry?.updated_at;
    const staleDays = lastActivity ? daysSince(lastActivity) : 999;

    if (staleDays >= 5) {
      // Dedup: skip if stalled flag already raised within the last 7 days
      const { data: recent } = await supabase
        .from('dt_flags')
        .select('id')
        .eq('student_id', student_id)
        .eq('flag_type', 'stalled')
        .eq('status', 'open')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (!recent) {
        await supabase.from('dt_flags').insert({
          student_id,
          flag_type: 'stalled',
          severity: 'attention',
          excerpt: lastActivity
            ? `Last entry ${Math.floor(staleDays)} days ago`
            : 'No entries recorded',
        });
        flagsCreated++;
      }
    }
  }

  // ── 2. Late start ───────────────────────────────────────
  // No dt_meta by June 24 (day 2 of the course).
  const lateStartCutoff = new Date('2026-06-24T23:59:00Z');
  if (new Date() > lateStartCutoff) {
    const { data: enrollments } = await supabase
      .from('dt_enrollments')
      .select('student_id');

    const { data: onboarded } = await supabase
      .from('dt_meta')
      .select('student_id')
      .not('onboarded_at', 'is', null);

    const onboardedSet = new Set((onboarded ?? []).map(r => r.student_id));

    for (const { student_id } of enrollments ?? []) {
      if (onboardedSet.has(student_id)) continue;

      const { data: existing } = await supabase
        .from('dt_flags')
        .select('id')
        .eq('student_id', student_id)
        .eq('flag_type', 'late_start')
        .maybeSingle();

      if (!existing) {
        await supabase.from('dt_flags').insert({
          student_id,
          flag_type: 'late_start',
          severity: 'attention',
          excerpt: 'Student has not completed onboarding',
        });
        flagsCreated++;
      }
    }
  }

  // ── 3. Valley distress ──────────────────────────────────
  // Week 3 entries with very long real_moment (>200 chars) or long voice (>35s).
  // These are informational signals, not urgent.
  const week3Ids = ['w3-mon-am', 'w3-mon-pm', 'w3-tue', 'w3-wed', 'w3-thu', 'w3-fri', 'w3-internship'];

  const { data: w3Entries } = await supabase
    .from('dt_entries')
    .select('student_id, day_id, real_moment')
    .in('day_id', week3Ids)
    .not('real_moment', 'is', null);

  for (const entry of w3Entries ?? []) {
    if ((entry.real_moment?.length ?? 0) <= 200) continue;

    const { data: existing } = await supabase
      .from('dt_flags')
      .select('id')
      .eq('student_id', entry.student_id)
      .eq('day_id', entry.day_id)
      .eq('flag_type', 'valley_distress')
      .maybeSingle();

    if (!existing) {
      await supabase.from('dt_flags').insert({
        student_id: entry.student_id,
        day_id: entry.day_id,
        flag_type: 'valley_distress',
        severity: 'info',
        excerpt: entry.real_moment.slice(0, 200),
      });
      flagsCreated++;
    }
  }

  // Week 3 long voice memos (>35s)
  const { data: w3Voices } = await supabase
    .from('dt_voices')
    .select('student_id, day_id, duration_seconds')
    .in('day_id', week3Ids)
    .gt('duration_seconds', 35);

  for (const v of w3Voices ?? []) {
    const { data: existing } = await supabase
      .from('dt_flags')
      .select('id')
      .eq('student_id', v.student_id)
      .eq('day_id', v.day_id)
      .eq('flag_type', 'valley_distress')
      .maybeSingle();

    if (!existing) {
      await supabase.from('dt_flags').insert({
        student_id: v.student_id,
        day_id: v.day_id,
        flag_type: 'valley_distress',
        severity: 'info',
        excerpt: `Voice memo: ${v.duration_seconds}s`,
      });
      flagsCreated++;
    }
  }

  return res.status(200).json({ ok: true, flagsCreated });
}
