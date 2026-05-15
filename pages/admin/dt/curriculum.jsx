import { useState, useEffect } from 'react';
import Link from 'next/link';

const C = {
  paper: '#f1e7d2', ink: '#1a2742', inkLight: '#3a4868',
  gold: '#b8893f', burgundy: '#7a3b3b', smoke: '#5d5547',
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

export default function CurriculumEditor() {
  const [days, setDays] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState('');
  const [editingDay, setEditingDay] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/dt/days').then(r => r.json()).then(d => setDays(d.days ?? []));
    fetch('/api/admin/dt/cohorts').then(r => r.json()).then(d => setCohorts(d.cohorts ?? []));
  }, []);

  function startEdit(day) {
    setEditingDay(day.id);
    setEditForm({ hook: day.hook, note: day.note ?? '', theory_name: day.theory_name, theory_author: day.theory_author, theory_summary: day.theory_summary, title: day.title });
  }

  async function saveEdit() {
    setSaving(true);
    const url = `/api/admin/dt/days/${editingDay}${selectedCohort ? `?cohortId=${selectedCohort}` : ''}`;
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editForm) });
    setSaving(false);
    setEditingDay(null);
    const refreshed = await fetch(`/api/admin/dt/days${selectedCohort ? `?cohortId=${selectedCohort}` : ''}`).then(r => r.json());
    setDays(refreshed.days ?? []);
  }

  const weeks = [...new Set(days.map(d => d.week))].sort((a, b) => a - b);

  return (
    <div style={{ minHeight: '100vh', background: C.paper, fontFamily: 'Georgia, serif', color: C.ink }}>
      <div style={{ background: C.ink, color: C.paper, padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href="/admin/dt" style={{ color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, textDecoration: 'none', opacity: 0.7 }}>← DASHBOARD</Link>
        <div style={{ flex: 1, fontFamily: 'Cinzel, serif', fontSize: 18, fontWeight: 600, letterSpacing: 2 }}>CURRICULUM EDITOR</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2 }}>OVERRIDE FOR</label>
          <select value={selectedCohort} onChange={e => setSelectedCohort(e.target.value)} style={{ fontFamily: 'Georgia, serif', fontSize: 13, padding: '4px 8px', background: C.paper, color: C.ink, border: '1px solid #ffffff55' }}>
            <option value="">Default (all cohorts)</option>
            {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {weeks.map(week => (
          <div key={week} style={{ marginBottom: 40 }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 3, color: C.smoke, marginBottom: 14, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 6 }}>
              WEEK {week}
            </div>
            {days.filter(d => d.week === week).map(day => (
              <div key={day.id} style={{ marginBottom: 16, padding: '16px 18px', border: `1px solid ${C.ink}22`, background: editingDay === day.id ? '#fff8ee' : C.paper }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600 }}>{day.title}</div>
                    <div style={{ fontSize: 12, color: C.smoke, marginTop: 2 }}>{day.date_label} · {day.type}</div>
                  </div>
                  {editingDay !== day.id && (
                    <button onClick={() => startEdit(day)} style={{ padding: '5px 12px', border: `1px solid ${C.ink}44`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.ink }}>EDIT</button>
                  )}
                </div>

                {editingDay === day.id && (
                  <div style={{ marginTop: 16 }}>
                    {[
                      { key: 'title', label: 'Title', rows: 1 },
                      { key: 'hook', label: 'Hook', rows: 4 },
                      { key: 'note', label: 'Note (burgundy callout)', rows: 2 },
                      { key: 'theory_name', label: 'Theory Name', rows: 1 },
                      { key: 'theory_author', label: 'Theory Author', rows: 1 },
                      { key: 'theory_summary', label: 'Theory Summary', rows: 3 },
                    ].map(({ key, label, rows }) => (
                      <div key={key} style={{ marginBottom: 12 }}>
                        <label style={{ fontFamily: 'Cinzel, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
                        <textarea value={editForm[key] ?? ''} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))} rows={rows} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'Georgia, serif', fontSize: 13, padding: '8px 10px', border: `1px solid ${C.ink}33`, background: '#fbf6e7', color: C.ink, outline: 'none', resize: 'vertical' }} />
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button onClick={saveEdit} disabled={saving} style={{ padding: '8px 18px', border: 'none', background: C.ink, color: C.paper, cursor: saving ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2 }}>{saving ? 'SAVING…' : 'SAVE'}</button>
                      <button onClick={() => setEditingDay(null)} style={{ padding: '8px 18px', border: `1px solid ${C.ink}55`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.ink }}>CANCEL</button>
                    </div>
                    {selectedCohort && <div style={{ marginTop: 8, fontSize: 12, color: C.smoke, fontStyle: 'italic' }}>This edit will only affect the selected cohort.</div>}
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
