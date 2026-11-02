import React, { useState } from 'react';

/** Two-tone bar chart (quoted vs won), matching the approved "Quotes and sales" card. */
export function BarChart({ data, height = 240, max = 60 }: { data: { m: string; quoted: number; won: number }[]; height?: number; max?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const ticks = [60, 50, 40, 30, 20, 10, 0].filter(t => t <= max);
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height, fontSize: 11, color: 'var(--muted)', paddingBottom: 22 }}>
        {ticks.map(t => <span key={t}>{t ? `£${t}k` : '0'}</span>)}
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height, position: 'relative' }}>
        {data.map((d, i) => {
          const last = i === data.length - 1;
          return (
            <div key={d.m} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: 'default' }}>
              {hover === i && (
                <div style={{ position: 'absolute', bottom: `calc(${(d.quoted / max) * 100}% + 4px)`, background: '#0b1f1b', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 11, whiteSpace: 'nowrap', zIndex: 2 }}>
                  <b>{d.m}</b><br />Quoted £{d.quoted}k · Won £{d.won}k
                </div>
              )}
              <div style={{ width: 44, height: `calc((100% - 22px) * ${d.quoted / max})`, background: '#dfe5e3', borderRadius: '6px 6px 0 0', position: 'relative', display: 'flex', alignItems: 'flex-end' }}>
                <div style={{ width: '100%', height: `${(d.won / d.quoted) * 100}%`, background: last ? '#00c7a1' : '#0b6e5c', borderRadius: '6px 6px 0 0' }} />
              </div>
              <span style={{ fontSize: 11, color: 'var(--muted)', height: 14 }}>{d.m}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Donut chart with centre label. */
export function Donut({ parts, size = 200, thickness = 38, center, sub }: { parts: { v: number; c: string }[]; size?: number; thickness?: number; center?: React.ReactNode; sub?: string }) {
  const total = parts.reduce((a, p) => a + p.v, 0);
  const r = (size - thickness) / 2, C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: '0 0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {parts.map((p, i) => {
          const len = (p.v / total) * C;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.c} strokeWidth={thickness} strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} />;
          acc += len;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: size - thickness * 2 - 24, height: size - thickness * 2 - 24, borderRadius: '50%', background: '#fff', display: 'grid', placeItems: 'center', alignContent: 'center', textAlign: 'center' }}>
          <b style={{ fontSize: size > 150 ? 18 : 16 }}>{center}</b>
          {sub && <span className="tiny muted">{sub}</span>}
        </div>
      </div>
    </div>
  );
}

/** Area line chart (payments). */
export function AreaLine({ values, color = '#00c7a1', width = 324, height = 64 }: { values: number[]; color?: string; width?: number; height?: number }) {
  const mx = Math.max(...values), mn = Math.min(...values);
  const pts = values.map((v, i) => [(i * width) / (values.length - 1), 6 + (1 - (v - mn) / (mx - mn || 1)) * (height - 12)]);
  const d = 'M' + pts.map(p => p.join(' ')).join(' L');
  const id = 'g' + color.replace('#', '');
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block', height }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".22" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${width} ${height} L0 ${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Horizontal bars list. */
export function HBars({ rows }: { rows: { label: string; value: number; max: number; color?: string; right?: string }[] }) {
  return (
    <div className="vstack" style={{ gap: 14 }}>
      {rows.map(r => (
        <div key={r.label} className="vstack" style={{ gap: 6 }}>
          <div className="between small"><span className="b" style={{ color: 'var(--text)', fontSize: 13 }}>{r.label}</span><span className="t2">{r.right ?? r.value}</span></div>
          <div className="progress" style={{ height: 8 }}><i style={{ width: `${(r.value / r.max) * 100}%`, background: r.color }} /></div>
        </div>
      ))}
    </div>
  );
}
