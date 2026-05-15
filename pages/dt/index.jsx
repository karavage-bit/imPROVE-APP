import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// THE ATLAS OF DISTANCE TRAVELED
// Theories of Leadership · Summer 2026 Intensive
// CIHS · University of Pittsburgh
// ============================================================

let _sb = null;
function sb() {
  if (!_sb) {
    _sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return _sb;
}

const C = {
  paper:    '#f1e7d2',
  paperDk:  '#e6d8b8',
  ink:      '#1a2742',
  inkLight: '#3a4868',
  gold:     '#b8893f',
  goldLt:   '#d9b56a',
  burgundy: '#7a3b3b',
  sage:     '#6b7a5b',
  terra:    '#a05a3c',
  smoke:    '#5d5547',
};

const REGION_TINT = {
  0: C.smoke, 1: C.terra, 2: C.sage, 3: C.burgundy,
  4: C.gold, 5: C.inkLight, 6: C.smoke, 7: C.gold,
};

const REGIONS = [
  { week: 0, name: 'The Compass Harbor',        subtitle: 'Pre-Course · June 8 – 21',    y: 70,   theme: 'Identity & Values' },
  { week: 1, name: 'The Character Range',       subtitle: 'Week 1 · June 22 – 27',       y: 410,  theme: 'Character Mechanics & The Sponge Mindset' },
  { week: 2, name: 'The Forking River',         subtitle: 'Week 2 · June 29 – July 4',   y: 1240, theme: 'Cognitive Agility & Narrative Intelligence' },
  { week: 3, name: 'The Compass Valley',        subtitle: 'Week 3 · July 6 – 10',        y: 2060, theme: 'Resilience & Intelligent Failure' },
  { week: 4, name: 'The Bridge of Crossing',   subtitle: 'Week 4 · July 13 – 17',       y: 2920, theme: 'Collective Intelligence' },
  { week: 5, name: 'The Synthesis Plateau',    subtitle: 'Week 5 · July 20 – 24',       y: 3780, theme: 'Innovation, Synthesis & Vision' },
  { week: 6, name: 'Distance Traveled Lookout',subtitle: 'Week 6 · July 27 – 31',       y: 4530, theme: 'Final Synthesis' },
  { week: 7, name: 'The Horizon',              subtitle: 'Senior Year Bridge Protocol', y: 5300, theme: 'What Continues' },
];

const TYPE_LABEL = {
  foundation: 'Foundation', class: 'Morning Class', evening: 'Evening Class',
  field: 'Field Experience', internship: 'Internship Floor', async: 'Asynchronous',
  deadline: 'Final Deadline', horizon: 'Bridge Protocol',
};

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

function useFonts() {
  useEffect(() => {
    const id = 'tol-atlas-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=IM+Fell+English+SC&display=swap';
    document.head.appendChild(link);
  }, []);
}

function CompassRose({ size = 80, color = C.ink, accent = C.gold, opacity = 0.85 }) {
  const r = size / 2, c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity }}>
      <circle cx={c} cy={c} r={r * 0.96} fill="none" stroke={color} strokeWidth={0.7} />
      <circle cx={c} cy={c} r={r * 0.78} fill="none" stroke={color} strokeWidth={0.4} strokeDasharray="2 2" />
      <circle cx={c} cy={c} r={r * 0.5}  fill="none" stroke={color} strokeWidth={0.4} />
      <g transform={`translate(${c},${c})`}>
        <polygon points={`0,-${r*.92} ${r*.12},-${r*.12} ${r*.92},0 ${r*.12},${r*.12} 0,${r*.92} -${r*.12},${r*.12} -${r*.92},0 -${r*.12},-${r*.12}`} fill={color} opacity={0.92} />
        <polygon points={`${r*.55},-${r*.55} ${r*.08},-${r*.08} ${r*.55},${r*.55} ${r*.08},${r*.08} -${r*.55},${r*.55} -${r*.08},${r*.08} -${r*.55},-${r*.55} -${r*.08},-${r*.08}`} fill={accent} opacity={0.85} />
        <circle r={r * 0.07} fill={color} />
      </g>
      <text x={c} y={r * 0.22} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={r * 0.18} fill={color}>N</text>
      <text x={size - 4} y={c + 4} textAnchor="end" fontFamily="Cinzel, serif" fontSize={r * 0.18} fill={color}>E</text>
      <text x={c} y={size - 2} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={r * 0.18} fill={color}>S</text>
      <text x={4} y={c + 4} textAnchor="start" fontFamily="Cinzel, serif" fontSize={r * 0.18} fill={color}>W</text>
    </svg>
  );
}

function CompassRoseInline() {
  return (
    <g>
      <polygon points="0,-12 1.6,-1.6 12,0 1.6,1.6 0,12 -1.6,1.6 -12,0 -1.6,-1.6" fill={C.ink} opacity={0.92} />
      <polygon points="6.6,-6.6 1,-1 6.6,6.6 1,1 -6.6,6.6 -1,1 -6.6,-6.6 -1,-1" fill={C.gold} opacity={0.88} />
      <circle r={1} fill={C.ink} />
    </g>
  );
}

function Star({ size = 24, fill = C.gold, stroke = 'none', strokeWidth = 0 }) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size / 2 : size / 4.5;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    pts.push(`${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`);
  }
  return <polygon points={pts.join(' ')} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function PaperTexture() {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse at 30% 20%, rgba(255,236,200,0.4) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(184,137,63,0.08) 0%, transparent 70%)', mixBlendMode: 'multiply' }} />
      <svg style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, opacity: 0.18 }} width="100%" height="100%">
        <filter id="paperNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
          <feColorMatrix values="0 0 0 0 0.4   0 0 0 0 0.3   0 0 0 0 0.2   0 0 0 0.45 0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#paperNoise)" />
      </svg>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 2, boxShadow: 'inset 0 0 240px 60px rgba(60,40,20,0.28)' }} />
    </>
  );
}

function DayNode({ day, completed, hovered, hasInk, onClick, onMouseEnter, onMouseLeave }) {
  const tint = REGION_TINT[day.week] || C.ink;
  let mainShape;

  if (day.type === 'foundation') {
    mainShape = <g><circle r={26} fill={completed ? C.goldLt : C.paper} stroke={C.ink} strokeWidth={1.4} /><circle r={20} fill="none" stroke={C.ink} strokeWidth={0.5} strokeDasharray="2 2" /><CompassRoseInline /></g>;
  } else if (day.type === 'field') {
    mainShape = <g><Star size={28} fill={completed ? C.gold : C.paper} stroke={C.ink} strokeWidth={1.5} /><Star size={11} fill={C.ink} stroke="none" /></g>;
  } else if (day.type === 'internship') {
    mainShape = <g><rect x={-26} y={-15} width={52} height={30} fill={completed ? C.goldLt : C.paper} stroke={C.ink} strokeWidth={1.2} /><rect x={-26} y={-15} width={52} height={6} fill={C.ink} opacity={0.85} /><text x={0} y={8} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={9} fill={C.ink} letterSpacing={1}>FIELD</text></g>;
  } else if (day.type === 'horizon') {
    mainShape = <g><circle r={26} fill={C.paper} stroke={C.gold} strokeWidth={1.6} strokeDasharray="3 2" /><circle r={18} fill={completed ? C.gold : 'none'} stroke={C.ink} strokeWidth={1} /><Star size={16} fill={C.ink} /></g>;
  } else if (day.type === 'deadline') {
    mainShape = <g><circle r={30} fill={completed ? C.burgundy : C.paper} stroke={C.burgundy} strokeWidth={2} /><circle r={22} fill="none" stroke={completed ? C.paper : C.burgundy} strokeWidth={0.6} strokeDasharray="1 2" /><text x={0} y={4} textAnchor="middle" fontFamily="Cinzel, serif" fontSize={11} fill={completed ? C.paper : C.burgundy} fontWeight={600}>VII·31</text></g>;
  } else {
    mainShape = <g><circle r={hovered ? 17 : 15} fill={C.paper} stroke={C.ink} strokeWidth={1.2} /><circle r={hovered ? 10 : 9} fill={completed ? C.gold : 'transparent'} stroke={completed ? 'none' : C.ink} strokeWidth={0.5} />{day.type === 'evening' && <circle r={4} fill={C.ink} opacity={0.6} />}{day.type === 'async' && <line x1={-7} y1={0} x2={7} y2={0} stroke={C.ink} strokeWidth={0.8} />}</g>;
  }

  return (
    <g transform={`translate(${day.coords.x}, ${day.coords.y})`} style={{ cursor: 'pointer', transition: 'transform 200ms' }} onClick={() => onClick(day)} onMouseEnter={() => onMouseEnter(day)} onMouseLeave={onMouseLeave}>
      {(hovered || completed || hasInk) && <circle r={hovered ? 32 : 24} fill="none" stroke={completed ? C.gold : tint} strokeWidth={completed ? 0.9 : 0.6} strokeDasharray="2 2" opacity={hovered ? 0.7 : 0.45} />}
      {mainShape}
      {hasInk && !completed && <circle cx={18} cy={-18} r={4} fill={C.terra} stroke={C.paper} strokeWidth={1} />}
      <text y={50} textAnchor="middle" fontFamily="IM Fell English SC, Cinzel, serif" fontSize={11} fill={C.ink} letterSpacing={1.5}>{day.date.split(' — ')[0].replace('Internship Week ', 'WK ').replace('Internship ', '').replace('Week ', 'WK ').toUpperCase()}</text>
      <text y={64} textAnchor="middle" fontFamily="Lora, serif" fontStyle="italic" fontSize={11} fill={C.smoke}>{day.title.length > 32 ? day.title.slice(0, 30) + '…' : day.title}</text>
    </g>
  );
}

function RegionLabel({ region }) {
  const isHard = region.week === 3;
  return (
    <g transform={`translate(500, ${region.y})`}>
      <line x1={-220} y1={28} x2={-100} y2={28} stroke={C.ink} strokeWidth={0.6} /><line x1={100} y1={28} x2={220} y2={28} stroke={C.ink} strokeWidth={0.6} />
      <line x1={-220} y1={28} x2={-220} y2={22} stroke={C.ink} strokeWidth={0.6} /><line x1={220} y1={28} x2={220} y2={22} stroke={C.ink} strokeWidth={0.6} />
      <circle cx={0} cy={28} r={2.5} fill={C.gold} stroke={C.ink} strokeWidth={0.6} />
      <line x1={-100} y1={28} x2={-10} y2={28} stroke={C.ink} strokeWidth={0.4} strokeDasharray="2 3" /><line x1={10} y1={28} x2={100} y2={28} stroke={C.ink} strokeWidth={0.4} strokeDasharray="2 3" />
      <text textAnchor="middle" y={0} fontFamily="Cinzel, serif" fontSize={32} fontWeight={600} letterSpacing={4} fill={C.ink}>{region.name.toUpperCase()}</text>
      <text textAnchor="middle" y={66} fontFamily="IM Fell English SC, serif" fontSize={13} fill={C.smoke} letterSpacing={3}>{region.subtitle}</text>
      <text textAnchor="middle" y={88} fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize={15} fill={isHard ? C.burgundy : C.inkLight}>{region.theme}</text>
    </g>
  );
}

function JourneyPath({ days }) {
  const main = days.filter(d => d.type !== 'internship').sort((a, b) => a.coords.y - b.coords.y);
  let d = `M ${main[0].coords.x} ${main[0].coords.y}`;
  for (let i = 1; i < main.length; i++) {
    const prev = main[i - 1], curr = main[i];
    const midY = (prev.coords.y + curr.coords.y) / 2;
    d += ` C ${prev.coords.x} ${midY}, ${curr.coords.x} ${midY}, ${curr.coords.x} ${curr.coords.y}`;
  }
  const branches = days.filter(x => x.type === 'internship').map(b => {
    const nearest = main.reduce((acc, m) => Math.abs(m.coords.y - b.coords.y) < Math.abs(acc.coords.y - b.coords.y) ? m : acc, main[0]);
    return `M ${nearest.coords.x} ${nearest.coords.y} Q ${(nearest.coords.x + b.coords.x) / 2} ${b.coords.y - 30}, ${b.coords.x} ${b.coords.y}`;
  }).join(' ');
  return (
    <g>
      <path d={d} fill="none" stroke={C.ink} strokeWidth={1.6} strokeDasharray="3 5" opacity={0.55} />
      <path d={branches} fill="none" stroke={C.terra} strokeWidth={1.2} strokeDasharray="1 4" opacity={0.7} />
    </g>
  );
}

function TerrainDecorations() {
  return (
    <g opacity={0.55}>
      <g transform="translate(500, 320)"><path d="M -180 0 Q -150 -10, -120 0 T -60 0 T 0 0 T 60 0 T 120 0 T 180 0" fill="none" stroke={C.smoke} strokeWidth={0.7} /><path d="M -180 12 Q -150 2, -120 12 T -60 12 T 0 12 T 60 12 T 120 12 T 180 12" fill="none" stroke={C.smoke} strokeWidth={0.5} opacity={0.6} /></g>
      <g transform="translate(500, 1100)" stroke={C.terra} strokeWidth={0.9} fill="none"><path d="M -300 80 L -240 -10 L -190 50 L -130 -40 L -70 30 L 0 -50 L 70 30 L 130 -40 L 190 50 L 240 -10 L 300 80" /><path d="M -240 -10 L -220 -25 M -130 -40 L -110 -55 M 0 -50 L 18 -65 M 130 -40 L 150 -55 M 240 -10 L 260 -25" stroke={C.smoke} strokeWidth={0.5} /></g>
      <g transform="translate(500, 1640)" stroke={C.sage} strokeWidth={1.1} fill="none"><path d="M -260 -100 Q -200 -40, -240 30 T -180 130 T -100 170" /><path d="M 260 -100 Q 200 -40, 240 30 T 180 130 T 100 170" /><path d="M -100 170 Q -50 200, 0 180 Q 50 200, 100 170" strokeWidth={1.4} /></g>
      <g transform="translate(500, 2480)"><ellipse cx={0} cy={0} rx={300} ry={170} fill="none" stroke={C.burgundy} strokeWidth={0.7} strokeDasharray="2 4" opacity={0.55} /><ellipse cx={0} cy={0} rx={220} ry={120} fill="none" stroke={C.burgundy} strokeWidth={0.5} strokeDasharray="1 3" opacity={0.45} /><g transform="translate(-60, -60)"><CompassRose size={120} color={C.burgundy} accent={C.gold} opacity={0.32} /></g></g>
      <g transform="translate(500, 3380)" stroke={C.gold} strokeWidth={1.2} fill="none"><path d="M -260 100 Q -200 -50, 0 -30 T 260 100" /><path d="M -260 100 L -260 130 M 260 100 L 260 130" strokeWidth={1.5} />{[-180, -90, 0, 90, 180].map(x => <line key={x} x1={x} y1={-30 + Math.abs(x) * 0.3} x2={x} y2={130} strokeWidth={0.6} opacity={0.75} />)}</g>
      <g transform="translate(500, 4180)" stroke={C.inkLight} strokeWidth={0.9} fill="none"><path d="M -300 100 L -200 100 L -160 60 L -100 60 L -60 100 L 60 100 L 100 60 L 160 60 L 200 100 L 300 100" /><line x1={-160} y1={60} x2={160} y2={60} strokeDasharray="3 4" opacity={0.6} /></g>
      <g transform="translate(500, 4940)" stroke={C.smoke} strokeWidth={0.8} fill="none"><path d="M -250 80 L -120 -50 L 0 30 L 120 -50 L 250 80" /><path d="M -120 -50 L -100 -65 M 120 -50 L 140 -65" strokeWidth={0.5} /></g>
      <g transform="translate(500, 5350)" stroke={C.gold} strokeWidth={0.5} fill="none" opacity={0.65}><path d="M -250 0 Q -200 -15, -150 -5 T -50 0 T 50 -5 T 150 5 T 250 0" /><path d="M -200 20 Q -120 10, -50 20 T 100 18 T 200 22" opacity={0.5} /></g>
    </g>
  );
}

function PhotoUpload({ dayId, hasPhoto, onUploaded }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!hasPhoto) { setPreviewUrl(null); return; }
    fetch(`/api/dt/photos/${dayId}`)
      .then(r => r.json())
      .then(d => { if (d.url) setPreviewUrl(d.url); });
  }, [dayId, hasPhoto]);

  async function handleFile(ev) {
    const file = ev.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { alert('Photo must be under 500KB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result.split(',')[1];
      await fetch(`/api/dt/photos/${dayId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64, mimeType: file.type }),
      });
      setPreviewUrl(URL.createObjectURL(file));
      setUploading(false);
      onUploaded?.();
    };
    reader.readAsDataURL(file);
  }

  async function handleDelete() {
    if (!confirm('Remove this photo?')) return;
    await fetch(`/api/dt/photos/${dayId}`, { method: 'DELETE' });
    setPreviewUrl(null);
    onUploaded?.();
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, fontWeight: 500, marginBottom: 6 }}>Field Photo</div>
      {previewUrl ? (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img src={previewUrl} alt="Field photo" style={{ maxWidth: '100%', maxHeight: 220, border: `1px solid ${C.ink}33`, display: 'block' }} />
          <button onClick={handleDelete} style={{ position: 'absolute', top: 6, right: 6, background: C.burgundy, border: 'none', color: C.paper, borderRadius: 2, padding: '3px 8px', cursor: 'pointer', fontSize: 11, fontFamily: 'Cinzel, serif' }}>REMOVE</button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ padding: '8px 14px', border: `1px dashed ${C.ink}55`, background: 'transparent', cursor: uploading ? 'wait' : 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.smoke }}>
          {uploading ? 'UPLOADING…' : '+ ADD PHOTO'}
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

function VoiceRecorder({ dayId, voiceDuration, onRecorded }) {
  const [recording, setRecording] = useState(false);
  const [hasVoice, setHasVoice] = useState(!!voiceDuration);
  const [duration, setDuration] = useState(voiceDuration);
  const [audioUrl, setAudioUrl] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!hasVoice) { setAudioUrl(null); return; }
    fetch(`/api/dt/voices/${dayId}`)
      .then(r => r.json())
      .then(d => { if (d.url) setAudioUrl(d.url); });
  }, [dayId, hasVoice]);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    chunksRef.current = [];
    mr.ondataavailable = e => chunksRef.current.push(e.data);
    mr.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());
      clearInterval(timerRef.current);
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      if (blob.size > 1024 * 1024) { alert('Voice memo exceeds 1MB limit'); return; }
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        await fetch(`/api/dt/voices/${dayId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, mimeType: 'audio/webm', durationSeconds: elapsed }),
        });
        setHasVoice(true);
        setDuration(elapsed);
        setAudioUrl(URL.createObjectURL(blob));
        onRecorded?.();
      };
      reader.readAsDataURL(blob);
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  async function handleDelete() {
    if (!confirm('Remove this voice memo?')) return;
    await fetch(`/api/dt/voices/${dayId}`, { method: 'DELETE' });
    setHasVoice(false);
    setAudioUrl(null);
    setDuration(null);
    onRecorded?.();
  }

  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, fontWeight: 500, marginBottom: 6 }}>Voice Memo</div>
      {hasVoice && audioUrl ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <audio src={audioUrl} controls style={{ height: 36, flex: 1 }} />
          {duration && <span style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, color: C.smoke }}>{fmt(duration)}</span>}
          <button onClick={handleDelete} style={{ background: 'transparent', border: `1px solid ${C.burgundy}66`, color: C.burgundy, padding: '4px 8px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 10 }}>REMOVE</button>
        </div>
      ) : recording ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.burgundy, animation: 'dtPulse 1s infinite' }} />
          <span style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 12, color: C.burgundy, letterSpacing: 2 }}>{fmt(elapsed)}</span>
          <button onClick={stopRecording} style={{ padding: '6px 14px', border: `1px solid ${C.ink}`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.ink }}>STOP</button>
        </div>
      ) : (
        <button onClick={startRecording} style={{ padding: '8px 14px', border: `1px dashed ${C.ink}55`, background: 'transparent', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.smoke }}>
          ● REC VOICE MEMO
        </button>
      )}
      <style>{`@keyframes dtPulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }`}</style>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ marginTop: 22, marginBottom: 8, fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 3, color: C.smoke, borderBottom: `1px solid ${C.ink}22`, paddingBottom: 4 }}>{children}</div>;
}
function FieldLabel({ children }) {
  return <div style={{ marginTop: 14, marginBottom: 6, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, fontWeight: 500 }}>{children}</div>;
}
function Textarea({ value, onChange, placeholder, rows = 3, maxLength }) {
  return (
    <div>
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} maxLength={maxLength}
        style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'Lora, Georgia, serif', fontSize: 14, lineHeight: 1.55, background: '#fbf6e7', border: `1px solid ${C.ink}33`, color: C.ink, outline: 'none', resize: 'vertical' }}
        onFocus={ev => ev.target.style.borderColor = C.gold}
        onBlur={ev => ev.target.style.borderColor = `${C.ink}33`}
      />
      {maxLength && <div style={{ textAlign: 'right', fontFamily: 'Lora, serif', fontSize: 11, color: C.smoke, marginTop: 2 }}>{(value || '').length}/{maxLength}</div>}
    </div>
  );
}

function DayPanel({ day, entry, onUpdate, onClose }) {
  if (!day) return null;
  const e = entry || {};
  const [saving, setSaving] = useState(false);

  const save = useCallback(async (patch) => {
    setSaving(true);
    await fetch(`/api/dt/entries/${day.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    setSaving(false);
  }, [day.id]);

  const debouncedSave = useDebounce(save, 600);

  const handle = (k) => (ev) => {
    const val = ev.target.value;
    const next = { ...e, [k]: val };
    onUpdate(day.id, next);
    debouncedSave(next);
  };

  const toggle = async () => {
    const next = { ...e, completed: !e.completed };
    onUpdate(day.id, next);
    await save(next);
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(26, 39, 66, 0.35)', animation: 'tolFade 280ms ease-out' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(560px, 100vw)', background: C.paper, borderLeft: `1px solid ${C.ink}`, boxShadow: '-12px 0 40px rgba(60,40,20,0.25)', zIndex: 50, overflowY: 'auto', fontFamily: 'Lora, Georgia, serif', color: C.ink, animation: 'tolSlideIn 380ms cubic-bezier(0.2, 0.8, 0.2, 1)' }}>
        <style>{`@keyframes tolSlideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes tolFade { from { opacity: 0; } to { opacity: 1; } }`}</style>

        <div style={{ position: 'sticky', top: 0, zIndex: 2, background: C.paper, borderBottom: `1px solid ${C.ink}33`, padding: '20px 28px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 3, color: C.smoke }}>{(day.region || '').toUpperCase()} · {(TYPE_LABEL[day.type] || '').toUpperCase()}</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 22, fontWeight: 600, letterSpacing: 1, color: C.ink, marginTop: 6, lineHeight: 1.2 }}>{day.title}</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 14, fontStyle: 'italic', color: C.smoke, marginTop: 2 }}>{day.date}{day.location ? ` · ${day.location}` : ''}</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: `1px solid ${C.ink}55`, padding: '6px 10px', cursor: 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 2, color: C.ink, flexShrink: 0 }}>CLOSE</button>
        </div>

        <div style={{ padding: '20px 28px 80px' }}>
          <div style={{ padding: '14px 18px', borderLeft: `3px solid ${C.gold}`, background: '#00000007', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 17, lineHeight: 1.5, color: C.ink }}>
            <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 2.5, color: C.smoke, marginBottom: 6, fontStyle: 'normal' }}>HOOK</div>
            {day.hook}
          </div>

          {day.note && <div style={{ marginTop: 16, padding: '10px 14px', borderTop: `1px solid ${C.burgundy}55`, borderBottom: `1px solid ${C.burgundy}55`, fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 13, color: C.burgundy, lineHeight: 1.55 }}>{day.note}</div>}

          <SectionLabel>The Skill</SectionLabel>
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, color: C.ink, fontWeight: 500, letterSpacing: 0.5 }}>{day.keySkill}</div>

          <SectionLabel>Concepts &amp; Frameworks</SectionLabel>
          <ul style={{ paddingLeft: 20, margin: 0, fontSize: 14.5, lineHeight: 1.6 }}>
            {day.concepts.map((c, i) => <li key={i} style={{ color: C.ink, marginBottom: 4 }}>{c}</li>)}
          </ul>

          <SectionLabel>Leadership Theory</SectionLabel>
          <div style={{ padding: '12px 14px', background: `${C.gold}15`, border: `1px solid ${C.gold}55` }}>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 14, color: C.ink, letterSpacing: 1, fontWeight: 600 }}>{day.theory.name}</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: C.smoke, marginBottom: 6 }}>{day.theory.author}</div>
            <div style={{ fontSize: 13.5, lineHeight: 1.5, color: C.ink }}>{day.theory.summary}</div>
          </div>

          <div style={{ marginTop: 28, padding: '18px 18px 20px', border: `1px dashed ${C.ink}55`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -10, left: 14, padding: '0 8px', background: C.paper, fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 2.5, color: C.smoke }}>YOUR INK</div>

            <FieldLabel>Where it showed up at the internship — or in real life</FieldLabel>
            <Textarea value={e.realMoment || ''} onChange={handle('realMoment')} placeholder="A specific moment, conversation, decision, or pattern. The more concrete the better." maxLength={280} />

            <FieldLabel>Forward Horizon — what this opens up next</FieldLabel>
            <Textarea value={e.horizon || ''} onChange={handle('horizon')} placeholder="One specific thing you can now do or attempt because of this skill. Senior year. College. Family. A relationship. A team." maxLength={200} />

            <FieldLabel>Personal Pin — quote, observation, image link, or note</FieldLabel>
            <Textarea value={e.pin || ''} onChange={handle('pin')} rows={2} placeholder="A line that stuck. A quote from your supervisor. A link to a photo. Whatever you want to find again later." />

            <PhotoUpload dayId={day.id} hasPhoto={!!e.hasPhoto} onUploaded={() => onUpdate(day.id, { ...e, hasPhoto: true })} />
            <VoiceRecorder dayId={day.id} voiceDuration={e.voiceDuration} onRecorded={() => onUpdate(day.id, { ...e, hasVoice: true })} />
          </div>

          <div style={{ marginTop: 22 }}>
            <button onClick={toggle} style={{ width: '100%', padding: '12px 16px', cursor: 'pointer', background: e.completed ? C.gold : 'transparent', border: `1.5px solid ${e.completed ? C.gold : C.ink}`, color: e.completed ? C.paper : C.ink, fontFamily: 'Cinzel, serif', fontSize: 13, letterSpacing: 2.5, fontWeight: 500, transition: 'all 200ms' }}>
              {e.completed ? '❆   LANDMARK CHARTED   ❆' : 'MARK LANDMARK CHARTED'}
            </button>
          </div>

          <div style={{ marginTop: 18, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 12, color: C.smoke, textAlign: 'center' }}>
            {saving ? 'Saving…' : 'Your responses are saved automatically.'}
          </div>
        </div>
      </div>
    </>
  );
}

function MapView({ days, state, onSelect, hovered, setHovered }) {
  return (
    <div style={{ position: 'relative', width: '100%', padding: '0 0 40px' }}>
      <svg viewBox="0 0 1000 5600" width="100%" preserveAspectRatio="xMidYMin meet" style={{ display: 'block' }}>
        <rect x={20} y={20} width={960} height={5560} fill="none" stroke={C.ink} strokeWidth={1.2} />
        <rect x={32} y={32} width={936} height={5536} fill="none" stroke={C.ink} strokeWidth={0.4} strokeDasharray="2 3" />
        <g transform="translate(500, 110)">
          <text textAnchor="middle" fontFamily="Cinzel, serif" fontSize={48} fontWeight={700} fill={C.ink} letterSpacing={6}>THE ATLAS</text>
          <text textAnchor="middle" y={42} fontFamily="Cormorant Garamond, serif" fontStyle="italic" fontSize={22} fill={C.burgundy} letterSpacing={1}>of Distance Traveled</text>
          <line x1={-150} y1={62} x2={-30} y2={62} stroke={C.ink} strokeWidth={0.5} /><line x1={30} y1={62} x2={150} y2={62} stroke={C.ink} strokeWidth={0.5} />
          <circle cx={0} cy={62} r={2} fill={C.gold} />
          <text textAnchor="middle" y={86} fontFamily="IM Fell English SC, serif" fontSize={14} fill={C.smoke} letterSpacing={4}>THEORIES OF LEADERSHIP · SUMMER MMXXVI</text>
          <text textAnchor="middle" y={104} fontFamily="Cormorant Garamond, serif" fontSize={13} fill={C.smoke} fontStyle="italic">CIHS · University of Pittsburgh · Six Weeks · Two Tracks · One Compass</text>
        </g>
        <TerrainDecorations />
        {REGIONS.map(r => <RegionLabel key={r.week} region={r} />)}
        <JourneyPath days={days} />
        {days.map(day => {
          const e = state[day.id] || {};
          const hasInk = !!(e.realMoment || e.horizon || e.pin);
          return <DayNode key={day.id} day={day} completed={!!e.completed} hasInk={hasInk} hovered={hovered === day.id} onClick={onSelect} onMouseEnter={d => setHovered(d.id)} onMouseLeave={() => setHovered(null)} />;
        })}
        <g transform="translate(500, 5550)">
          <line x1={-220} y1={0} x2={-30} y2={0} stroke={C.ink} strokeWidth={0.5} /><line x1={30} y1={0} x2={220} y2={0} stroke={C.ink} strokeWidth={0.5} />
          <circle cx={0} cy={0} r={3} fill={C.gold} stroke={C.ink} strokeWidth={0.5} />
          <text textAnchor="middle" y={20} fontFamily="IM Fell English SC, serif" fontSize={11} fill={C.smoke} letterSpacing={3}>FINIS · vel · INITIUM</text>
        </g>
      </svg>
    </div>
  );
}

function CompassView({ days, state, onJumpToDay }) {
  const theories = useMemo(() => {
    const seen = new Map();
    days.forEach(d => {
      if (!seen.has(d.theory.name)) seen.set(d.theory.name, { ...d.theory, days: [d] });
      else seen.get(d.theory.name).days.push(d);
    });
    return [...seen.values()];
  }, [days]);

  return (
    <div style={{ padding: '40px 24px 80px', maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 12, letterSpacing: 4, color: C.smoke }}>THE BEZEL OF</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 40, fontWeight: 600, color: C.ink, letterSpacing: 4, margin: '6px 0 0' }}>LEADERSHIP THEORIES</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 17, color: C.smoke, marginTop: 6, maxWidth: 640, marginLeft: 'auto', marginRight: 'auto' }}>Every research-grounded framework named in the course, ringed around the compass. Each fills with gold ink as you chart its day.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {theories.map((t, i) => {
          const done = t.days.filter(d => state[d.id]?.completed).length;
          const total = t.days.length;
          return (
            <div key={t.name} onClick={() => onJumpToDay(t.days[0])} style={{ padding: '18px 18px 16px', border: `1px solid ${C.ink}55`, background: done === total ? `${C.gold}15` : C.paper, position: 'relative', cursor: 'pointer', transition: 'transform 200ms, box-shadow 200ms' }}
              onMouseEnter={ev => { ev.currentTarget.style.transform = 'translateY(-2px)'; ev.currentTarget.style.boxShadow = '0 8px 24px rgba(60,40,20,0.12)'; }}
              onMouseLeave={ev => { ev.currentTarget.style.transform = 'translateY(0)'; ev.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ position: 'absolute', top: -10, left: 14, background: C.paper, padding: '0 8px', fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 2, color: C.smoke }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 17, fontWeight: 600, color: C.ink, letterSpacing: 1, lineHeight: 1.25 }}>{t.name}</div>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.smoke, marginTop: 2 }}>{t.author}</div>
              <div style={{ fontFamily: 'Lora, serif', fontSize: 13.5, lineHeight: 1.55, color: C.ink, marginTop: 10 }}>{t.summary}</div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 2, background: `${C.ink}22` }}><div style={{ height: '100%', width: `${(done / total) * 100}%`, background: C.gold }} /></div>
                <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 1.5, color: C.smoke }}>{done}/{total} CHARTED</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AtlasView({ days, state }) {
  const charted = days.filter(d => state[d.id]?.completed);
  return (
    <div style={{ padding: '40px 24px 100px', maxWidth: 880, margin: '0 auto', position: 'relative', zIndex: 3 }}>
      <style>{`@media print { body { background: ${C.paper} !important; } .no-print { display: none !important; } .atlas-page { page-break-after: always; } }`}</style>
      <div style={{ textAlign: 'center', padding: '40px 0 60px', borderBottom: `2px solid ${C.ink}` }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><CompassRose size={140} /></div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 52, fontWeight: 700, color: C.ink, letterSpacing: 6, margin: '24px 0 4px' }}>THE EXPEDITION</h1>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 26, color: C.burgundy, marginBottom: 18 }}>a private record of distance traveled</div>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 13, letterSpacing: 4, color: C.smoke }}>THEORIES OF LEADERSHIP · SUMMER MMXXVI</div>
        <div style={{ marginTop: 28, fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: C.ink, lineHeight: 1.6 }}>
          {charted.length} of {days.length} landmarks charted.<br />
          {charted.length === days.length ? 'The atlas is complete.' : charted.length === 0 ? 'The atlas is yet to begin.' : 'The atlas is yet underway.'}
        </div>
        <button onClick={() => window.print()} className="no-print" style={{ marginTop: 32, padding: '12px 22px', cursor: 'pointer', background: 'transparent', border: `1.5px solid ${C.ink}`, color: C.ink, fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 3, fontWeight: 500 }}>❆  PRINT THE ATLAS  ❆</button>
      </div>

      {charted.length === 0 && <div style={{ textAlign: 'center', padding: '80px 0', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 18, color: C.smoke }}>The atlas is empty.<br />Open the map, choose a landmark, and begin to chart.</div>}

      {REGIONS.map(region => {
        const regionDays = charted.filter(d => d.week === region.week);
        if (!regionDays.length) return null;
        return (
          <div key={region.week} className="atlas-page" style={{ marginTop: 60 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 4, color: C.smoke }}>CHAPTER {String(region.week + 1).toUpperCase()}</div>
              <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 600, color: C.ink, letterSpacing: 3, margin: '6px 0 4px' }}>{region.name.toUpperCase()}</h2>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15, color: C.smoke }}>{region.subtitle} · {region.theme}</div>
            </div>
            {regionDays.map(d => {
              const e = state[d.id] || {};
              return (
                <div key={d.id} style={{ padding: '22px 0', borderTop: `1px solid ${C.ink}33` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
                    <h3 style={{ fontFamily: 'Cinzel, serif', fontSize: 19, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: 0.5 }}>{d.title}</h3>
                    <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 2, color: C.smoke }}>{d.date.toUpperCase()}</div>
                  </div>
                  <div style={{ marginTop: 6, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.burgundy }}>Skill: {d.keySkill}</div>
                  <div style={{ marginTop: 12, fontFamily: 'Lora, serif', fontSize: 14, lineHeight: 1.6 }}><em style={{ color: C.smoke }}>Theory:</em> <strong>{d.theory.name}</strong> ({d.theory.author})</div>
                  {e.realMoment && <BlockEntry label="Where it showed up">{e.realMoment}</BlockEntry>}
                  {e.horizon && <BlockEntry label="Forward Horizon">{e.horizon}</BlockEntry>}
                  {e.pin && <BlockEntry label="Personal Pin" italic>{e.pin}</BlockEntry>}
                </div>
              );
            })}
          </div>
        );
      })}

      {charted.length > 0 && (
        <div style={{ marginTop: 80, textAlign: 'center', padding: '40px 0', borderTop: `2px solid ${C.ink}` }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}><CompassRose size={64} opacity={0.65} /></div>
          <div style={{ marginTop: 16, fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 4, color: C.smoke }}>FINIS · VEL · INITIUM</div>
          <div style={{ marginTop: 6, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.smoke }}>the end · or · the beginning</div>
        </div>
      )}
    </div>
  );
}

function BlockEntry({ label, children, italic }) {
  return (
    <div style={{ marginTop: 12, padding: '10px 14px', borderLeft: `2px solid ${C.gold}`, background: `${C.gold}0d` }}>
      <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 3, color: C.smoke, marginBottom: 4 }}>{label.toUpperCase()}</div>
      <div style={{ fontFamily: 'Lora, serif', fontStyle: italic ? 'italic' : 'normal', fontSize: 14.5, lineHeight: 1.55, color: C.ink, whiteSpace: 'pre-wrap' }}>{children}</div>
    </div>
  );
}

function StreamView({ days, state, onSelect }) {
  const entries = days
    .filter(d => state[d.id]?.realMoment || state[d.id]?.horizon || state[d.id]?.pin || state[d.id]?.hasPhoto)
    .reverse();

  if (!entries.length) {
    return (
      <div style={{ padding: '80px 24px', textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 18, color: C.smoke, zIndex: 3, position: 'relative' }}>
        The stream is empty.<br />Open the map and leave your first entry.
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 24px 80px', maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 12, letterSpacing: 4, color: C.smoke }}>THE</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, fontWeight: 600, color: C.ink, letterSpacing: 4, margin: '4px 0 0' }}>FIELD STREAM</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15, color: C.smoke, marginTop: 6 }}>Every entry you have written, in reverse order.</p>
      </div>
      {entries.map(d => {
        const e = state[d.id] || {};
        return (
          <div key={d.id} onClick={() => onSelect(d)} style={{ marginBottom: 32, cursor: 'pointer', padding: '20px 22px', border: `1px solid ${C.ink}22`, background: e.completed ? `${C.gold}0a` : C.paper, transition: 'box-shadow 200ms' }}
            onMouseEnter={ev => ev.currentTarget.style.boxShadow = '0 4px 16px rgba(60,40,20,0.1)'}
            onMouseLeave={ev => ev.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
              <div style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 600, color: C.ink, letterSpacing: 0.5 }}>{d.title}</div>
              <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 2, color: C.smoke }}>{REGION_TINT[d.week] ? d.region : ''}</div>
            </div>
            {e.realMoment && <BlockEntry label="Where it showed up">{e.realMoment}</BlockEntry>}
            {e.horizon && <BlockEntry label="Forward Horizon">{e.horizon}</BlockEntry>}
            {e.pin && <BlockEntry label="Personal Pin" italic>{e.pin}</BlockEntry>}
          </div>
        );
      })}
    </div>
  );
}

function ReelView({ days }) {
  const [slides, setSlides] = useState(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    fetch('/api/dt/reel').then(r => r.json()).then(d => setSlides(d.slides ?? []));
  }, []);

  if (!slides) return <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: C.smoke }}>Assembling the reel…</div>;
  if (!slides.length) return <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 18, color: C.smoke }}>No charted landmarks yet.<br />Mark your first landmark complete to begin the reel.</div>;

  const slide = slides[current];

  return (
    <div style={{ padding: '40px 24px 80px', maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 3 }}>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 12, letterSpacing: 4, color: C.smoke }}>THE</div>
        <h1 style={{ fontFamily: 'Cinzel, serif', fontSize: 36, fontWeight: 600, color: C.ink, letterSpacing: 4, margin: '4px 0 0' }}>EXPEDITION REEL</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 15, color: C.smoke }}>{current + 1} of {slides.length}</p>
      </div>

      <div style={{ border: `1px solid ${C.ink}33`, padding: '28px 28px 24px', background: C.paper }}>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 3, color: C.smoke }}>{slide.region}</div>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 24, fontWeight: 600, color: C.ink, margin: '6px 0 4px', letterSpacing: 1 }}>{slide.title}</h2>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 13, color: C.smoke, marginBottom: 20 }}>{slide.date}</div>

        {slide.photoUrl && <img src={slide.photoUrl} alt="Field photo" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', marginBottom: 20, border: `1px solid ${C.ink}22` }} />}

        {slide.voice?.url && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 10, letterSpacing: 2, color: C.smoke, marginBottom: 6 }}>VOICE MEMO</div>
            <audio src={slide.voice.url} controls style={{ width: '100%', height: 36 }} />
          </div>
        )}

        {slide.realMoment && <BlockEntry label="Where it showed up">{slide.realMoment}</BlockEntry>}
        {slide.horizon && <BlockEntry label="Forward Horizon">{slide.horizon}</BlockEntry>}
        {slide.pin && <BlockEntry label="Personal Pin" italic>{slide.pin}</BlockEntry>}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} style={{ padding: '10px 20px', border: `1px solid ${C.ink}55`, background: 'transparent', cursor: current === 0 ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, color: current === 0 ? C.smoke : C.ink, opacity: current === 0 ? 0.4 : 1 }}>← PREV</button>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {slides.map((_, i) => <div key={i} onClick={() => setCurrent(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: i === current ? C.gold : `${C.ink}33`, cursor: 'pointer', transition: 'background 200ms' }} />)}
        </div>
        <button onClick={() => setCurrent(c => Math.min(slides.length - 1, c + 1))} disabled={current === slides.length - 1} style={{ padding: '10px 20px', border: `1px solid ${C.ink}55`, background: 'transparent', cursor: current === slides.length - 1 ? 'not-allowed' : 'pointer', fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, color: current === slides.length - 1 ? C.smoke : C.ink, opacity: current === slides.length - 1 ? 0.4 : 1 }}>NEXT →</button>
      </div>
    </div>
  );
}

function TopBar({ view, setView, charted, total }) {
  const pct = Math.round((charted / total) * 100);
  const tabs = [{ id: 'map', label: 'Map' }, { id: 'compass', label: 'Compass' }, { id: 'stream', label: 'Stream' }, { id: 'reel', label: 'Reel' }, { id: 'atlas', label: 'Atlas' }];
  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 20, background: `linear-gradient(180deg, ${C.paper} 0%, ${C.paper}f5 80%, ${C.paper}aa 100%)`, borderBottom: `1px solid ${C.ink}33`, backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', padding: '14px 22px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 'auto' }}>
          <CompassRose size={36} opacity={0.95} />
          <div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: 16, fontWeight: 600, color: C.ink, letterSpacing: 3, lineHeight: 1 }}>THE ATLAS</div>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 12, color: C.smoke, marginTop: 2 }}>of Distance Traveled</div>
          </div>
        </div>
        <nav style={{ display: 'flex', gap: 4, border: `1px solid ${C.ink}55`, padding: 3 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setView(t.id)} style={{ padding: '8px 16px', cursor: 'pointer', border: 'none', background: view === t.id ? C.ink : 'transparent', color: view === t.id ? C.paper : C.ink, fontFamily: 'Cinzel, serif', fontSize: 11, letterSpacing: 3, fontWeight: 500, transition: 'all 200ms' }}>{t.label.toUpperCase()}</button>)}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
          <div style={{ flex: 1, height: 4, background: `${C.ink}22`, position: 'relative' }}><div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: C.gold, transition: 'width 400ms' }} /></div>
          <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 2, color: C.smoke, whiteSpace: 'nowrap' }}>{charted}/{total} CHARTED</div>
        </div>
      </div>
    </div>
  );
}

function OnboardingModal({ onComplete }) {
  const [step, setStep] = useState('intro');
  const [name, setName] = useState('');
  const [value1, setValue1] = useState('');
  const [value2, setValue2] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value1.trim() || !value2.trim()) return;
    setSaving(true);
    await fetch('/api/dt/meta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim() || null, value1: value1.trim(), value2: value2.trim() }),
    });
    setSaving(false);
    onComplete({ name: name.trim(), value1: value1.trim(), value2: value2.trim() });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(26, 39, 66, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'tolFade 320ms ease-out' }}>
      <style>{`@keyframes tolFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <div style={{ maxWidth: 560, width: '100%', background: C.paper, padding: '36px 36px 30px', border: `1px solid ${C.ink}`, boxShadow: '0 30px 60px rgba(20,15,5,0.5)', fontFamily: 'Lora, Georgia, serif', color: C.ink }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><CompassRose size={64} /></div>
        <div style={{ fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 4, color: C.smoke, textAlign: 'center' }}>A NOTE BEFORE YOU SET OUT</div>
        <h2 style={{ fontFamily: 'Cinzel, serif', fontSize: 28, fontWeight: 600, letterSpacing: 3, color: C.ink, textAlign: 'center', margin: '8px 0 16px' }}>THE ATLAS</h2>

        {step === 'intro' ? (
          <>
            <div style={{ fontSize: 15, lineHeight: 1.65 }}>
              <p style={{ margin: '0 0 12px' }}>This is not a tracker. It is the territory you are about to cross.</p>
              <p style={{ margin: '0 0 12px' }}>Each landmark is a real day in the course. Tap one to read the hook, the skill, the concepts, and the leadership theory. Then leave three things in your own ink:</p>
              <ul style={{ margin: '0 0 12px', paddingLeft: 22 }}>
                <li><em>Where it showed up</em> at the internship or in real life.</li>
                <li><em>The Forward Horizon</em> — what this skill now opens up next.</li>
                <li><em>A Personal Pin</em> — quote, photo link, or note worth finding again.</li>
              </ul>
              <p style={{ margin: '0', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: C.burgundy }}>On July 31st, the Atlas view becomes a printable record of the road you traveled.</p>
            </div>
            <button onClick={() => setStep('values')} style={{ marginTop: 24, width: '100%', padding: '12px 16px', cursor: 'pointer', background: C.ink, border: 'none', color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 3, fontWeight: 500 }}>
              FORGE THE COMPASS NEEDLE →
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: '0 0 20px', fontSize: 14, lineHeight: 1.6, color: C.inkLight }}>Before you begin, name the two values that will guide you this summer. These anchor your compass needle and appear in your Atlas at the end.</p>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, marginBottom: 4 }}>Your name (optional)</div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="How you want to be addressed" style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'Lora, serif', fontSize: 14, background: '#fbf6e7', border: `1px solid ${C.ink}33`, color: C.ink, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, marginBottom: 4 }}>First core value <span style={{ color: C.burgundy }}>*</span></div>
              <input value={value1} onChange={e => setValue1(e.target.value)} placeholder="e.g. Courage, Integrity, Curiosity…" style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'Lora, serif', fontSize: 14, background: '#fbf6e7', border: `1px solid ${C.ink}33`, color: C.ink, outline: 'none' }} />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14, color: C.ink, marginBottom: 4 }}>Second core value <span style={{ color: C.burgundy }}>*</span></div>
              <input value={value2} onChange={e => setValue2(e.target.value)} placeholder="e.g. Resilience, Honesty, Growth…" style={{ width: '100%', padding: '10px 12px', boxSizing: 'border-box', fontFamily: 'Lora, serif', fontSize: 14, background: '#fbf6e7', border: `1px solid ${C.ink}33`, color: C.ink, outline: 'none' }} />
            </div>

            <button onClick={submit} disabled={!value1.trim() || !value2.trim() || saving} style={{ width: '100%', padding: '12px 16px', cursor: (!value1.trim() || !value2.trim() || saving) ? 'not-allowed' : 'pointer', background: (!value1.trim() || !value2.trim()) ? `${C.ink}55` : C.ink, border: 'none', color: C.paper, fontFamily: 'Cinzel, serif', fontSize: 12, letterSpacing: 3, fontWeight: 500 }}>
              {saving ? 'SAVING…' : '❆   BEGIN THE EXPEDITION   ❆'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const { createServerClient: createSSR } = await import('@supabase/ssr');
  const supabase = createSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => Object.entries(ctx.req.cookies).map(([name, value]) => ({ name, value })),
        setAll: (cookies) => cookies.forEach(({ name, value, options }) => { ctx.res.setHeader('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`); }),
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { redirect: { destination: '/login?next=/dt', permanent: false } };
  return { props: {} };
}

export default function DistanceTraveled() {
  useFonts();
  const [days, setDays] = useState([]);
  const [state, setState] = useState({});
  const [activeDay, setActiveDay] = useState(null);
  const [view, setView] = useState('map');
  const [hovered, setHovered] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    async function boot() {
      const [metaRes, daysRes, entriesRes] = await Promise.all([
        fetch('/api/dt/meta'),
        fetch('/api/dt/days'),
        fetch('/api/dt/entries'),
      ]);
      const metaData = await metaRes.json();
      const daysData = await daysRes.json();
      const entriesData = await entriesRes.json();

      setDays(daysData.days ?? []);
      setState(entriesData.state ?? {});
      setLoaded(true);

      if (!metaData.meta?.onboarded_at) setShowOnboarding(true);
    }
    boot();
  }, []);

  const updateDay = useCallback((id, entryData) => {
    setState(prev => ({ ...prev, [id]: entryData }));
  }, []);

  const charted = Object.values(state).filter(e => e?.completed).length;

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: `linear-gradient(180deg, ${C.paper} 0%, ${C.paperDk} 100%)`, position: 'relative', fontFamily: 'Lora, Georgia, serif' }}>
      <PaperTexture />

      <div style={{ position: 'relative', zIndex: 3 }}>
        <TopBar view={view} setView={setView} charted={charted} total={days.length || 40} />

        {!loaded ? (
          <div style={{ padding: 80, textAlign: 'center', fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: C.smoke }}>Unrolling the chart…</div>
        ) : (
          <>
            {view === 'map'     && <MapView days={days} state={state} hovered={hovered} setHovered={setHovered} onSelect={setActiveDay} />}
            {view === 'compass' && <CompassView days={days} state={state} onJumpToDay={d => setActiveDay(d)} />}
            {view === 'stream'  && <StreamView days={days} state={state} onSelect={d => { setActiveDay(d); setView('map'); }} />}
            {view === 'reel'    && <ReelView days={days} />}
            {view === 'atlas'   && <AtlasView days={days} state={state} />}
          </>
        )}

        <footer style={{ padding: '24px 24px 40px', textAlign: 'center', fontFamily: 'IM Fell English SC, serif', fontSize: 11, letterSpacing: 3, color: C.smoke, borderTop: `1px solid ${C.ink}22`, marginTop: 40 }}>
          THEORIES OF LEADERSHIP · CIHS · UNIVERSITY OF PITTSBURGH · MMXXVI
        </footer>
      </div>

      {activeDay && <DayPanel day={activeDay} entry={state[activeDay.id]} onUpdate={updateDay} onClose={() => setActiveDay(null)} />}
      {showOnboarding && loaded && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
    </div>
  );
}
