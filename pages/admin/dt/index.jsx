import { useState, useEffect } from 'react';
import Link from 'next/link';

// ––– Palette (mirrors student side) –––
const C = {
  paper: '#f1e7d2', ink: '#1a2742', inkLight: '#3a4868',
  gold: '#b8893f', burgundy: '#7a3b3b', smoke: '#5d5547', terra: '#a05a3c',
};

const SEV_COLOR = { info: C.inkLight, attention: C.terra, urgent: C.burgundy };
const SEV_LABEL = { info: 'Info', attention: 'Attention', urgent: 'Urgent' };

export async function getServerSideProps(ctx) {
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => Object.entries(ctx.req.cookies).map(([name, value]) => ({ name, value })), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/login?next=/admin/dt', permanent: false } };
  const { data: profile } = await supabase.from('profiles').select('is_instructor').eq('id', user.id).single();
  if (!profile?.is_instructor) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}

export default function InstructorDashboard() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [students, setStudents] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/dt/cohorts').then(r => r.json()).then(d => {
      setCohorts(d.cohorts ?? []);
      if (d.cohorts?.length) setSelectedCohort(d.cohorts[0].id);
      setLoading(false);
    });
    fetch('/api/admin/dt/flags?status=open').then(r => r.json()).then(d => setFlags(d.flags ?? []));
  }, []);

  useEffect(() => {
    if (!selectedCohort) return;
    fetch(`/api/admin/dt/cohorts/${selectedCohort}/students`).then(r => r.json()).then(d => setStudents(d.students ?? []));
  }, [selectedCohort]);

  if (loading) return <div style={{ padding: 80, textAlign: 'center', fontFamily: 'serif', color: C.smoke }}>Loading dashboard…</div>;

  const urgentFlags = flags.filter(f => f.severity === 'urgent');
  const attentionFlags = flags.filter(f => f.severity !== 'urgent');

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: 'Georgia, serif', color: C.ink }}>
      {/* Header */}
      <div style={{ background: C.ink, color: C.paper, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 600, letterSpacing: 3 }}>DISTANCE TRAVELED</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>Instructor Dashboard · TOL Summer 2026</div>
        </div>
        <Link href="/admin/dt/flags" style={{ color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, textDecoration: 'none', border: `1px solid ${C.paper}55`, padding: '6px 14px' }}>
          FLAGS {flags.length > 0 && `(${flags.length})`}
        </Link>
        <Link href="/admin/dt/curriculum" style={{ color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, textDecoration: 'none', border: `1px solid ${C.paper}55`, padding: '6px 14px' }}>
          CURRICULUM
        </Link>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>

        {/* Left: roster */}
        <div>
          {/* Cohort picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <label style={{ fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 2, color: C.smoke }}>COHORT</label>
            <select value={selectedCohort ?? ''} onChange={e => setSelectedCohort(e.target.value)} style={{ fontFamily: 'Georgia, serif', fontSize: 14, padding: '6px 10px', border: `1px solid ${C.ink}44`, background: C.paper, color: C.ink }}>
              {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Pacing summary */}
          {students.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'ENROLLED', value: students.length },
                { label: 'ONBOARDED', value: students.filter(s => s.onboarded).length },
                { label: 'AVG CHARTED', value: (students.reduce((a, s) => a + s.charted, 0) / students.length).toFixed(1) },
                { label: 'OPEN FLAGS', value: flags.length, color: flags.length > 0 ? C.burgundy : C.ink },
              ].map(stat => (
                <div key={stat.label} style={{ padding: '16px 18px', border: `1px solid ${C.ink}22`, background: '#fff8ee' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 3, color: C.smoke, marginBottom: 4 }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 28, fontWeight: 600, color: stat.color ?? C.ink }}>{stat.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* Roster table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Georgia, serif', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${C.ink}` }}>
                {['Student', 'Values', 'Charted', 'Last Active', 'Flags'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.smoke, fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const maxSeverity = s.openFlags.find(f => f.severity === 'urgent') ? 'urgent' : s.openFlags.find(f => f.severity === 'attention') ? 'attention' : null;
                return (
                  <tr key={s.id} style={{ borderBottom: `1px solid ${C.ink}18`, cursor: 'pointer' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#f7f0e4'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <Link href={`/admin/dt/students/${s.id}`} style={{ color: C.ink, textDecoration: 'none', fontWeight: 600 }}>{s.name}</Link>
                      {!s.onboarded && <span style={{ marginLeft: 8, fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1, color: C.terra, border: `1px solid ${C.terra}55`, padding: '1px 5px' }}>NOT ONBOARDED</span>}
                    </td>
                    <td style={{ padding: '10px 12px', color: C.inkLight, fontSize: 13 }}>{s.values.join(' · ') || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 80, height: 4, background: `${C.ink}22` }}><div style={{ height: '100%', width: `${(s.charted / 40) * 100}%`, background: C.gold }} /></div>
                        <span style={{ fontFamily: 'Cinzel, serif', fontSize: 11, color: C.smoke }}>{s.charted}/40</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, color: C.smoke }}>
                      {s.lastActivity ? new Date(s.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      {maxSeverity && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1, color: SEV_COLOR[maxSeverity], border: `1px solid ${SEV_COLOR[maxSeverity]}55`, padding: '2px 6px' }}>{SEV_LABEL[maxSeverity].toUpperCase()}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: flag sidebar */}
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 3, color: C.ink, marginBottom: 16, borderBottom: `1px solid ${C.ink}33`, paddingBottom: 8 }}>OPEN FLAGS</div>

          {urgentFlags.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.burgundy, marginBottom: 8 }}>URGENT</div>
              {urgentFlags.map(f => <FlagCard key={f.id} flag={f} />)}
            </div>
          )}

          {attentionFlags.length > 0 && (
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.terra, marginBottom: 8 }}>ATTENTION</div>
              {attentionFlags.slice(0, 8).map(f => <FlagCard key={f.id} flag={f} />)}
              {attentionFlags.length > 8 && <div style={{ fontSize: 12, color: C.smoke, marginTop: 8 }}>+{attentionFlags.length - 8} more — <Link href="/admin/dt/flags" style={{ color: C.inkLight }}>view all</Link></div>}
            </div>
          )}

          {flags.length === 0 && <div style={{ fontSize: 13, color: C.smoke, fontStyle: 'italic' }}>No open flags.</div>}
        </div>
      </div>
    </div>
  );
}

function FlagCard({ flag }) {
  return (
    <Link href={`/admin/dt/students/${flag.student_id}`} style={{ display: 'block', textDecoration: 'none', marginBottom: 10, padding: '10px 12px', border: `1px solid ${SEV_COLOR[flag.severity]}44`, background: '#fff8ee', color: C.ink }}>
      <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: SEV_COLOR[flag.severity], marginBottom: 3 }}>
        {flag.flag_type.replace('_', ' ').toUpperCase()}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600 }}>{flag.profiles?.display_name ?? flag.student_id.slice(0, 8)}</div>
      {flag.excerpt && <div style={{ fontSize: 12, color: C.smoke, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{flag.excerpt}</div>}
    </Link>
  );
}
