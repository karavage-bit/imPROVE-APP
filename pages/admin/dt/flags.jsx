import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  paper: '#f1e7d2', ink: '#1a2742', inkLight: '#3a4868',
  gold: '#b8893f', burgundy: '#7a3b3b', smoke: '#5d5547', terra: '#a05a3c',
};
const SEV_COLOR = { info: C.inkLight, attention: C.terra, urgent: C.burgundy };

export async function getServerSideProps(ctx) {
  const { createServerClient } = await import('@supabase/ssr');
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => Object.entries(ctx.req.cookies).map(([name, value]) => ({ name, value })), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/login', permanent: false } };
  const { data: profile } = await supabase.from('profiles').select('is_instructor').eq('id', user.id).single();
  if (!profile?.is_instructor) return { redirect: { destination: '/', permanent: false } };
  return { props: {} };
}

export default function FlagsInbox() {
  const [flags, setFlags] = useState([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/dt/flags?status=${filter}`)
      .then(r => r.json())
      .then(d => { setFlags(d.flags ?? []); setLoading(false); });
  }, [filter]);

  async function update(id, status) {
    await fetch(`/api/admin/dt/flags/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setFlags(prev => prev.filter(f => f.id !== id));
  }

  const byType = flags.reduce((acc, f) => {
    const k = f.flag_type;
    if (!acc[k]) acc[k] = [];
    acc[k].push(f);
    return acc;
  }, {});

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: 'Georgia, serif', color: C.ink }}>
      <div style={{ background: C.ink, color: C.paper, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/admin/dt" style={{ color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, textDecoration: 'none', opacity: 0.7 }}>← DASHBOARD</Link>
        <div style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>FLAG INBOX</div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 28, border: `1px solid ${C.ink}44`, padding: 3, width: 'fit-content' }}>
          {['open', 'reviewed', 'dismissed'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '8px 18px', border: 'none', background: filter === s ? C.ink : 'transparent', color: filter === s ? C.paper : C.ink, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, cursor: 'pointer' }}>{s.toUpperCase()}</button>
          ))}
        </div>

        {loading && <div style={{ color: C.smoke, fontStyle: 'italic' }}>Loading…</div>}
        {!loading && flags.length === 0 && <div style={{ color: C.smoke, fontStyle: 'italic', fontSize: 15 }}>No {filter} flags.</div>}

        {Object.entries(byType).map(([type, items]) => (
          <div key={type} style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 3, color: items[0].severity === 'urgent' ? C.burgundy : C.terra, marginBottom: 14, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 6 }}>
              {type.replace(/_/g, ' ').toUpperCase()} · {items.length}
            </div>
            {items.map(f => (
              <div key={f.id} style={{ marginBottom: 14, padding: '16px 18px', border: `1px solid ${SEV_COLOR[f.severity]}44`, background: '#fff8ee', display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 6 }}>
                    <Link href={`/admin/dt/students/${f.student_id}`} style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600, color: C.ink, textDecoration: 'none' }}>
                      {f.profiles?.display_name ?? f.student_id.slice(0, 12)}
                    </Link>
                    <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1, color: SEV_COLOR[f.severity], border: `1px solid ${SEV_COLOR[f.severity]}55`, padding: '1px 5px' }}>{f.severity.toUpperCase()}</span>
                    <span style={{ fontSize: 11, color: C.smoke }}>{new Date(f.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {f.excerpt && <div style={{ fontSize: 13, color: C.inkLight, lineHeight: 1.5, marginBottom: 4 }}>"{f.excerpt}"</div>}
                  {f.notes && <div style={{ fontSize: 13, fontStyle: 'italic', color: C.smoke }}>{f.notes}</div>}
                </div>
                {filter === 'open' && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => update(f.id, 'reviewed')} style={{ padding: '6px 12px', border: `1px solid ${C.ink}55`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.ink }}>REVIEWED</button>
                    <button onClick={() => update(f.id, 'dismissed')} style={{ padding: '6px 12px', border: `1px solid ${C.smoke}44`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke }}>DISMISS</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
