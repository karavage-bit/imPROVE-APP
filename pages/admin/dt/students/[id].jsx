import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const C = {
  paper: '#f1e7d2', ink: '#1a2742', inkLight: '#3a4868',
  gold: '#b8893f', burgundy: '#7a3b3b', smoke: '#5d5547', terra: '#a05a3c',
};

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

export default function StudentDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [data, setData] = useState(null);
  const [flagNote, setFlagNote] = useState('');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/dt/students/${id}`).then(r => r.json()).then(setData);
  }, [id]);

  async function markFlag(flagId, status) {
    await fetch(`/api/admin/dt/flags/${flagId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setData(prev => ({ ...prev, flags: prev.flags.map(f => f.id === flagId ? { ...f, status } : f) }));
  }

  async function submitManualFlag() {
    if (!flagNote.trim()) return;
    setSubmittingFlag(true);
    await fetch('/api/admin/dt/flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId: id, notes: flagNote.trim() }),
    });
    setFlagNote('');
    setSubmittingFlag(false);
    const refreshed = await fetch(`/api/admin/dt/students/${id}`).then(r => r.json());
    setData(refreshed);
  }

  if (!data) return <div style={{ padding: 80, textAlign: 'center', color: C.smoke, fontFamily: 'serif' }}>Loading…</div>;

  const { meta, stream, flags, earnedMoments } = data;
  const openFlags = flags.filter(f => f.status === 'open');

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: 'Georgia, serif', color: C.ink }}>
      {/* Header */}
      <div style={{ background: C.ink, color: C.paper, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/admin/dt" style={{ color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, textDecoration: 'none', opacity: 0.7 }}>← ROSTER</Link>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>{meta?.name ?? 'Student'}</div>
          {meta && <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>{meta.value1} · {meta.value2}</div>}
        </div>
        {openFlags.length > 0 && <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: '#ffa0a0', border: '1px solid #ffa0a044', padding: '4px 10px' }}>{openFlags.length} OPEN FLAG{openFlags.length > 1 ? 'S' : ''}</div>}
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32 }}>

        {/* Entry stream */}
        <div>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 3, color: C.smoke, marginBottom: 20, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 8 }}>
            ENTRY STREAM · {stream.length} entries
          </div>

          {stream.length === 0 && <div style={{ color: C.smoke, fontStyle: 'italic', fontSize: 14 }}>No entries yet.</div>}

          {stream.map(e => (
            <div key={e.dayId} style={{ marginBottom: 24, padding: '18px 20px', border: `1px solid ${C.ink}22`, background: e.completed ? '#fff8ee' : '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600, color: C.ink }}>{e.dayTitle}</div>
                  <div style={{ fontSize: 12, color: C.smoke, marginTop: 2 }}>{e.region} · {e.dayDate}</div>
                </div>
                {e.completed && <span style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.gold, border: `1px solid ${C.gold}55`, padding: '2px 6px' }}>CHARTED</span>}
              </div>

              {e.realMoment && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 3 }}>WHERE IT SHOWED UP</div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e.realMoment}</div>
                </div>
              )}
              {e.horizon && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 3 }}>FORWARD HORIZON</div>
                  <div style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{e.horizon}</div>
                </div>
              )}
              {e.pin && (
                <div style={{ marginBottom: 10, fontStyle: 'italic', color: C.inkLight }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 3, fontStyle: 'normal' }}>PERSONAL PIN</div>
                  {e.pin}
                </div>
              )}
              {e.photoUrl && <img src={e.photoUrl} alt="" style={{ maxHeight: 180, maxWidth: '100%', border: `1px solid ${C.ink}22`, marginTop: 8 }} />}
              {e.voice?.url && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 4 }}>VOICE MEMO</div>
                  <audio src={e.voice.url} controls style={{ height: 32, width: '100%' }} />
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 11, color: C.smoke }}>Last updated: {new Date(e.updatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
          ))}
        </div>

        {/* Right panel: flags + earned moments */}
        <div>
          {/* Manual flag */}
          <div style={{ marginBottom: 28, padding: '16px', border: `1px solid ${C.ink}22` }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, color: C.smoke, marginBottom: 10 }}>ADD MANUAL FLAG</div>
            <textarea value={flagNote} onChange={e => setFlagNote(e.target.value)} placeholder="Note for this student…" rows={3} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Georgia, serif', fontSize: 13, padding: '8px 10px', border: `1px solid ${C.ink}33`, background: C.paper, color: C.ink, outline: 'none', resize: 'vertical' }} />
            <button onClick={submitManualFlag} disabled={!flagNote.trim() || submittingFlag} style={{ marginTop: 8, padding: '8px 14px', border: `1px solid ${C.ink}`, background: 'transparent', cursor: !flagNote.trim() ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.ink, opacity: !flagNote.trim() ? 0.5 : 1 }}>
              {submittingFlag ? 'ADDING…' : 'FLAG'}
            </button>
          </div>

          {/* Open flags */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, color: C.smoke, marginBottom: 12, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 6 }}>FLAGS ({flags.length})</div>
            {flags.length === 0 && <div style={{ fontSize: 13, color: C.smoke, fontStyle: 'italic' }}>None.</div>}
            {flags.map(f => (
              <div key={f.id} style={{ marginBottom: 12, padding: '10px 12px', border: `1px solid ${C.ink}22`, background: f.status !== 'open' ? '#f5f5f5' : C.paper }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: f.severity === 'urgent' ? C.burgundy : C.terra }}>{f.flag_type.replace('_', ' ').toUpperCase()}</div>
                  <div style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 1, color: C.smoke }}>{f.status.toUpperCase()}</div>
                </div>
                {f.excerpt && <div style={{ fontSize: 12, color: C.smoke, marginTop: 4, whiteSpace: 'pre-wrap' }}>{f.excerpt}</div>}
                {f.notes && <div style={{ fontSize: 12, color: C.inkLight, marginTop: 4, fontStyle: 'italic' }}>{f.notes}</div>}
                {f.status === 'open' && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => markFlag(f.id, 'reviewed')} style={{ fontSize: 10, padding: '3px 8px', fontFamily: 'Cinzel, serif', letterSpacing: 1, border: `1px solid ${C.ink}44`, background: 'transparent', cursor: 'pointer', color: C.ink }}>REVIEWED</button>
                    <button onClick={() => markFlag(f.id, 'dismissed')} style={{ fontSize: 10, padding: '3px 8px', fontFamily: 'Cinzel, serif', letterSpacing: 1, border: `1px solid ${C.smoke}44`, background: 'transparent', cursor: 'pointer', color: C.smoke }}>DISMISS</button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Earned moments */}
          {earnedMoments.length > 0 && (
            <div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, color: C.smoke, marginBottom: 10, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 6 }}>EARNED MOMENTS</div>
              {earnedMoments.map(m => (
                <div key={m.id} style={{ marginBottom: 6, fontSize: 13, color: C.inkLight }}>✦ {m.moment_key}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
