import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/router';

const C = { paper: '#f1e7d2', ink: '#1a2742', gold: '#b8893f', smoke: '#5d5547', terra: '#a05a3c' };

export default function Login() {
  const router = useRouter();
  const next = router.query.next ?? '/dt';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push(next);
  }

  return (
    <div style={{ minHeight: '100vh', background: C.paper, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Georgia, serif' }}>
      <div style={{ width: 360, padding: '48px 40px', border: `1px solid ${C.ink}22`, background: '#fff8ee' }}>
        <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 4, color: C.ink, marginBottom: 6, textAlign: 'center' }}>DISTANCE TRAVELED</div>
        <div style={{ fontSize: 12, color: C.smoke, textAlign: 'center', marginBottom: 36 }}>TOL Summer 2026</div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.ink}33`, background: C.paper, fontFamily: 'Georgia, serif', fontSize: 14, color: C.ink, outline: 'none' }} />
          </div>
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'block', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.ink}33`, background: C.paper, fontFamily: 'Georgia, serif', fontSize: 14, color: C.ink, outline: 'none' }} />
          </div>
          {error && <div style={{ fontSize: 13, color: C.terra, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '12px', background: C.ink, color: C.paper, border: 'none', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>{loading ? 'SIGNING IN…' : 'SIGN IN'}</button>
        </form>
      </div>
    </div>
  );
}
