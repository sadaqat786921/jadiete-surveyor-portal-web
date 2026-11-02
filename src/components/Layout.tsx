import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  IconLayoutDashboard, IconClipboardCheck, IconTool, IconMessage, IconSettings, IconSearch, IconAlertTriangle,
  IconBell, IconMenu2, IconCalendarCheck, IconRefresh, IconChevronRight, IconArrowRight, IconHelpCircle, IconLogout, IconUser, IconSelector,
} from '@tabler/icons-react';
import { me, IMG } from '../data/mock';
import { useStore, TODAY, fmtDate } from '../data/store';
import { Avatar, Tile, toneColor } from './ui';
import { useMyVisits, isOpenVisit, statusTone } from './survey';


type NavDef = { to: string; label: string; icon: any; count?: number; chev?: boolean; end?: boolean };
const NAV: { section: string; items: NavDef[] }[] = [
  { section: 'Main', items: [{ to: '/', label: 'Today', icon: IconLayoutDashboard, chev: true, end: true }, { to: '/calendar', label: 'My calendar', icon: IconCalendarCheck }] },
  { section: 'My visits', items: [{ to: '/surveys', label: 'Final surveys', icon: IconClipboardCheck }, { to: '/inspections', label: 'Inspections', icon: IconTool }] },
  { section: 'Communicate', items: [{ to: '/messages', label: 'Messages', icon: IconMessage }] },
];

/** Things the surveyor should know about. */
export function useSurveyAlerts() {
  const visits = useMyVisits();
  return useMemo(() => {
    const out: { id: string; title: string; sub: string; to: string; tone: string; icon: string }[] = [];
    visits.filter(v => v.date === TODAY && isOpenVisit(v)).forEach(v => out.push({ id: 't' + v.id, title: `Today ${v.time.split(' ')[0]} · ${v.customer}`, sub: `${v.kind} · ${v.address}`, to: v.to, tone: 'jade', icon: v.kind === 'Final survey' ? 'survey' : 'tool' }));
    visits.filter(v => v.status === 'On site').forEach(v => out.push({ id: 'p' + v.id, title: `Not finished: ${v.customer}`, sub: 'You started this survey but have not submitted it', to: v.to, tone: 'err', icon: 'alert' }));
    visits.filter(v => v.date > TODAY && isOpenVisit(v)).slice(0, 3).forEach(v => out.push({ id: 'b' + v.id, title: `Booked for you: ${v.customer}`, sub: `${fmtDate(v.date)} · ${v.time} · ${v.kind}`, to: v.to, tone: 'ok', icon: 'cal' }));
    visits.filter(v => v.kind === 'Final survey' && v.status === 'Submitted' && (v.changed || 0) > 0 && v.e?.ops?.revision).forEach(v => out.push({ id: 'r' + v.id, title: `Quote revised for ${v.customer}`, sub: `${v.e?.ops?.revision?.from} → ${v.e?.ops?.revision?.to} after your survey`, to: v.to, tone: 'ok', icon: 'survey' }));
    return out;
  }, [visits]);
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const visits = useMyVisits();
  const today = visits.filter(v => v.date === TODAY && isOpenVisit(v));
  const live: Record<string, number> = {
    '/calendar': today.length,
    '/surveys': visits.filter(v => v.kind === 'Final survey' && isOpenVisit(v)).length,
    '/inspections': visits.filter(v => v.kind === 'Inspection' && isOpenVisit(v)).length,
  };
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="brand">
        <img src="images/mark.svg" alt="" />
        <b>Jadeite</b>
        <button className="collapse" onClick={onToggle} aria-label="Collapse menu"><IconMenu2 size={20} /></button>
      </div>
      <div className="workspace">
        <span className="ws-logo"><img src="images/mark.svg" alt="" /></span>
        <span>Jadeite Glazing · Surveys</span>
        <IconSelector size={15} className="ml-auto muted" style={{ marginLeft: 'auto' }} />
      </div>
      {NAV.map(s => (
        <React.Fragment key={s.section}>
          <div className="nav-label">{s.section}</div>
          {s.items.map(it => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} title={it.label}>
              <it.icon size={18} stroke={1.8} />
              <span>{it.label}</span>
              {(live[it.to] ?? it.count) ? <em className="count" style={{ fontStyle: 'normal' }}>{live[it.to] ?? it.count}</em> : it.chev ? <IconChevronRight size={15} className="chev" /> : null}
            </NavLink>
          ))}
        </React.Fragment>
      ))}
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ marginTop: 6 }} title="Settings">
        <IconSettings size={18} stroke={1.8} /><span>Settings</span>
      </NavLink>
      <div className="promo">
        <img src={IMG.house} alt="" style={{ objectPosition: 'center 40%' }} />
        <div>
          <b>{today.length} visit{today.length === 1 ? '' : 's'} today</b>
          <p>{today[0] ? `Next: ${today[0].customer} at ${today[0].time.split(' ')[0]}.` : 'Nothing left for today.'}</p>
          <Link to="/">See my route <IconArrowRight size={13} /></Link>
        </div>
      </div>
    </aside>
  );
}

function CommandSearch({ onClose }: { onClose: () => void }) {
  const visits = useMyVisits();
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [onClose]);
  const s = q.toLowerCase();
  const res = visits.filter(v => !s || (v.customer + v.address + (v.e?.jobId || '') + v.id).toLowerCase().includes(s)).slice(0, 8);
  const go = (to: string) => { onClose(); nav(to); };
  return (
    <div className="overlay" onMouseDown={onClose} style={{ alignItems: 'flex-start' }}>
      <div className="cmd" onMouseDown={e => e.stopPropagation()}>
        <div className="hstack" style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', gap: 10 }}>
          <IconSearch size={18} color="#6b7a78" />
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your visits by customer, address or job…" style={{ border: 0, outline: 0, fontSize: 15, flex: 1 }} />
          <kbd className="tiny muted">Esc</kbd>
        </div>
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: 8 }}>
          <div className="nav-label">My visits</div>
          {res.map(v => (
            <button key={v.kind + v.id} onClick={() => go(v.to)} className="nav-item" style={{ width: '100%', border: 0, background: 'none', height: 52, gap: 12 }}>
              <img src={IMG[v.photo as keyof typeof IMG]} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} alt="" />
              <div className="vstack" style={{ alignItems: 'flex-start', gap: 1 }}><b style={{ fontSize: 13 }}>{v.customer}</b><span className="tiny muted">{v.kind} · {fmtDate(v.date)} · {v.address}</span></div>
              <span className={`tag ml-auto ${statusTone[v.status]}`}>{v.status}</span>
            </button>
          ))}
          {res.length === 0 && <div className="small muted" style={{ padding: 16 }}>No visit of yours matches “{q}”.</div>}
        </div>
      </div>
    </div>
  );
}

const notifIcon: Record<string, any> = { survey: IconClipboardCheck, tool: IconTool, alert: IconAlertTriangle, cal: IconCalendarCheck };

export function Header() {
  const { reset } = useStore();
  const alerts = useSurveyAlerts();
  const [read, setRead] = useState(false);
  const [search, setSearch] = useState(false);
  const [bell, setBell] = useState(false);
  const [menu, setMenu] = useState(false);
  const nav = useNavigate();
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); } };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, []);
  return (
    <header className="header">
      <div className="search" onClick={() => setSearch(true)}><IconSearch size={16} />Search<kbd>⌘K</kbd></div>
      <div className="spacer" />
      <div style={{ position: 'relative' }}>
        <button className="icon-btn" onClick={() => { setBell(!bell); setMenu(false); }} aria-label="Notifications"><IconBell size={18} />{!read && alerts.length > 0 && <span className="dot" />}</button>
        {bell && (
          <div className="popover">
            <div className="between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}><b style={{ fontSize: 14 }}>Notifications</b><button className="link" onClick={() => setRead(true)}>Mark all as read</button></div>
            <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {alerts.map(n => {
                const I = notifIcon[n.icon];
                return (
                  <button key={n.id} className="hstack" onClick={() => { setBell(false); nav(n.to); }} style={{ padding: '12px 16px', gap: 12, alignItems: 'flex-start', width: '100%', border: 0, background: read ? '#fff' : 'var(--tint-2)', textAlign: 'left' }}>
                    <Tile icon={<I size={17} />} color={toneColor[n.tone]} size={34} radius={17} />
                    <div className="vstack" style={{ gap: 2, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{n.title}</b><span className="small muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{n.sub}</span></div>
                  </button>
                );
              })}
              {alerts.length === 0 && <div className="small muted" style={{ padding: 16 }}>Nothing new.</div>}
            </div>
          </div>
        )}
      </div>
      <div style={{ position: 'relative' }}>
        <button className="me" onClick={() => { setMenu(!menu); setBell(false); }}>{me.initials}</button>
        {menu && (
          <div className="popover" style={{ width: 240 }}>
            <div className="hstack" style={{ padding: 14, gap: 10, borderBottom: '1px solid var(--border)' }}><Avatar i={me.initials} size={38} bg="#00c7a1" fg="#0b1f1b" /><div className="vstack" style={{ gap: 1 }}><b>{me.name}</b><span className="tiny muted">{me.role} · {me.area}</span></div></div>
            <div style={{ padding: 6 }}>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); nav('/settings'); }}><IconUser size={17} /><span>My profile</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); nav('/welcome/1'); }}><IconHelpCircle size={17} /><span>Take the tour again</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => { setMenu(false); reset(); nav('/'); }}><IconRefresh size={17} /><span>Reset demo data</span></button>
              <button className="nav-item" style={{ width: '100%', border: 0, background: 'none' }} onClick={() => nav('/login')}><IconLogout size={17} /><span>Sign out</span></button>
            </div>
          </div>
        )}
      </div>
      {search && <CommandSearch onClose={() => setSearch(false)} />}
    </header>
  );
}

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return (
    <div className="app">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="main">
        <Header />
        <main className="content"><Outlet /></main>
        <footer className="footer"><span>© 2026 Jadeite Systems · Jadeite Glazing</span><span>Surveyor portal · Help · Privacy</span></footer>
      </div>
    </div>
  );
}
