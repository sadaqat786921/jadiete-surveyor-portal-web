import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconChevronDown, IconX, IconCheck, IconCircleCheck } from '@tabler/icons-react';

export type Tone = 'ok' | 'warn' | 'err' | 'info' | 'jade' | 'grey';
export const toneColor: Record<string, string> = { ok: '#1f9d5b', warn: '#e0a100', err: '#d64545', info: '#0b6e5c', jade: '#0b6e5c', grey: '#3a4a4a' };

export function Tag({ tone = 'jade', children, icon }: { tone?: Tone | string; children: React.ReactNode; icon?: React.ReactNode }) {
  return <span className={`tag ${tone}`}>{icon}{children}</span>;
}

export function Avatar({ i, size = 36, bg, fg, ring }: { i: string; size?: number; bg?: string; fg?: string; ring?: boolean }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.34, background: bg, color: fg, boxShadow: ring ? '0 0 0 2px #fff' : undefined }}>
      {i}
    </span>
  );
}

export function Tile({ icon, color = '#0b6e5c', size = 40, solid, radius = 10 }: { icon: React.ReactNode; color?: string; size?: number; solid?: boolean; radius?: number }) {
  return (
    <span className="tile" style={{ width: size, height: size, borderRadius: radius, background: solid ? color : hexA(color, 0.12), color: solid ? '#fff' : color }}>
      {icon}
    </span>
  );
}

export function hexA(hex: string, a: number) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function Card({ children, className = '', style, onClick }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClick?: () => void }) {
  return <div className={`card ${className}`} style={style} onClick={onClick}>{children}</div>;
}

export function CardHead({ title, sub, right }: { title: React.ReactNode; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card-head">
      <div><h3>{title}</h3>{sub && <div className="sub">{sub}</div>}</div>
      {right && <div className="right">{right}</div>}
    </div>
  );
}

export function Dd({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return <button className="dd">{icon}{children}<IconChevronDown size={14} /></button>;
}

export function PageHead({ title, crumbs, actions }: { title: string; crumbs?: { label: string; to?: string }[]; actions?: React.ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {crumbs && (
          <div className="crumbs">
            {crumbs.map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>/</span>}
                {c.to ? <Link to={c.to}>{c.label}</Link> : <span>{c.label}</span>}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Progress({ value, color, height = 6 }: { value: number; color?: string; height?: number }) {
  return <div className="progress" style={{ height }}><i style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} /></div>;
}

export function Tabs({ items, value, onChange }: { items: { id: string; label: string; n?: number }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="tabs">
      {items.map(t => (
        <button key={t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
          {t.label}{t.n != null && <span className="n">{t.n}</span>}
        </button>
      ))}
    </div>
  );
}

export function Seg({ items, value, onChange }: { items: { id: string; label: string; icon?: React.ReactNode }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="seg">
      {items.map(t => <button key={t.id} className={value === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>{t.icon}{t.label}</button>)}
    </div>
  );
}

export function Switch({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)} aria-pressed={on} />;
}

export function Check({ on, onChange, label }: { on: boolean; onChange?: (v: boolean) => void; label?: React.ReactNode }) {
  return (
    <span className="check" onClick={() => onChange?.(!on)}>
      <span className={`box ${on ? 'on' : ''}`}>{on && <IconCheck size={13} stroke={3} />}</span>
      {label}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>;
}

export function Modal({ title, sub, onClose, children, footer, width = 640 }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  useEsc(onClose);
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h3>{title}</h3>{sub && <div className="small muted" style={{ marginTop: 3 }}>{sub}</div>}</div>
          <button className="icon-btn ml-auto" onClick={onClose} aria-label="Close"><IconX size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ title, sub, onClose, children, footer, width = 520 }: { title: React.ReactNode; sub?: React.ReactNode; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode; width?: number }) {
  useEsc(onClose);
  return (
    <div className="drawer-wrap" onMouseDown={onClose}>
      <div className="drawer" style={{ width }} onMouseDown={e => e.stopPropagation()}>
        <div className="modal-head">
          <div><h3>{title}</h3>{sub && <div className="small muted" style={{ marginTop: 3 }}>{sub}</div>}</div>
          <button className="icon-btn ml-auto" onClick={onClose} aria-label="Close"><IconX size={16} /></button>
        </div>
        <div className="modal-body" style={{ flex: 1 }}>{children}</div>
        {footer && <div className="modal-foot" style={{ borderRadius: 0 }}>{footer}</div>}
      </div>
    </div>
  );
}

function useEsc(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') fn(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fn]);
}

/* ---------- Toast ---------- */
const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(null), 2600); return () => clearTimeout(t); }, [msg]);
  return (
    <ToastCtx.Provider value={setMsg}>
      {children}
      {msg && <div className="toast"><IconCircleCheck size={18} color="#00c7a1" />{msg}</div>}
    </ToastCtx.Provider>
  );
}

export function Empty({ icon, title, sub, action }: { icon: React.ReactNode; title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="empty">
      <Tile icon={icon} size={52} radius={14} />
      <b style={{ color: 'var(--text)', fontSize: 15 }}>{title}</b>
      {sub && <span className="small">{sub}</span>}
      {action}
    </div>
  );
}

export function Photo({ src, w, h, r = 10, style }: { src: string; w: number; h: number; r?: number; style?: React.CSSProperties }) {
  return <img className="thumb" src={src} alt="" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function Stat({ icon, color, value, label, tag, tagTone, foot }: { icon: React.ReactNode; color: string; value: React.ReactNode; label: string; tag?: string; tagTone?: string; foot?: [string, string][] }) {
  return (
    <div className="card stat-card">
      <div className="hstack" style={{ gap: 12, alignItems: 'flex-start' }}>
        <Tile icon={icon} color={color} size={52} radius={10} />
        <div className="vstack" style={{ gap: 2, marginTop: 2 }}>
          <span className="kpi">{value}</span>
          <span className="t2" style={{ fontSize: 13 }}>{label}</span>
        </div>
        {tag && <span className="ml-auto"><Tag tone={tagTone ? `solid-${tagTone}` : 'solid-ok'}>{tag}</Tag></span>}
      </div>
      {foot && (
        <>
          <div className="divider" style={{ margin: '0 -16px' }} />
          <div className="between small t2">{foot.map(([k, v]) => <span key={k}>{k} : <b style={{ color: 'var(--text)' }}>{v}</b></span>)}</div>
        </>
      )}
    </div>
  );
}
