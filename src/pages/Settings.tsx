// Settings for the surveyor: profile and area, what to be told about, Outlook and Framepoint, sign-in.
import React, { useState } from 'react';
import { IconDeviceMobile, IconLock, IconBrandWindows, IconPlugConnected, IconRefresh, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Field, Switch, Avatar, Tabs, useToast, Tag } from '../components/ui';
import { me } from '../data/mock';

export default function Settings() {
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const [n, setN] = useState<Record<string, boolean>>({ booked: true, moved: true, office: true, revised: true, daily: true });
  const [sync, setSync] = useState({ outlook: '2 minutes ago', fp: '5 minutes ago' });
  const [days, setDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [max, setMax] = useState(4);
  return (
    <>
      <PageHead title="Settings" crumbs={[{ label: 'Today', to: '/' }, { label: 'Settings' }]} actions={<button className="btn btn-primary" onClick={() => toast('Settings saved')}>Save changes</button>} />
      <Tabs value={tab} onChange={setTab} items={[{ id: 'profile', label: 'My profile' }, { id: 'notifications', label: 'Notifications' }, { id: 'connections', label: 'Outlook and Framepoint' }, { id: 'security', label: 'Sign-in and security' }]} />
      {tab === 'profile' && (
        <Card style={{ maxWidth: 820 }}>
          <div className="hstack" style={{ gap: 16 }}><Avatar i={me.initials} size={72} bg="#00c7a1" fg="#0b1f1b" /><div className="vstack" style={{ gap: 4 }}><b style={{ fontSize: 18 }}>{me.name}</b><span className="muted">{me.role} · {me.area}</span><button className="link" style={{ alignSelf: 'flex-start' }} onClick={() => toast('Photo updated')}>Change photo</button></div></div>
          <div className="grid-2">
            <Field label="Full name"><input className="input" defaultValue={me.name} /></Field>
            <Field label="Email"><input className="input" defaultValue={me.email} /></Field>
            <Field label="Mobile (for sign-in codes and texts to customers)"><input className="input" defaultValue={me.phone} /></Field>
            <Field label="Role" hint="Roles are managed by the System Admin"><input className="input" defaultValue={me.role} disabled style={{ background: 'var(--bg)' }} /></Field>
            <Field label="Area I cover" hint="The office uses this when booking your visits"><input className="input" defaultValue={me.area} /></Field>
            <Field label="Most visits in one day"><select className="select" value={max} onChange={x => setMax(+x.target.value)}>{[2, 3, 4, 5].map(m => <option key={m} value={m}>{m}</option>)}</select></Field>
          </div>
          <Field label="Days I work">
            <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <button key={d} type="button" className={`chip ${days.includes(d) ? 'on' : ''}`} onClick={() => setDays(ds => (ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d]))}>{d}</button>)}</div>
          </Field>
        </Card>
      )}
      {tab === 'notifications' && (
        <Card style={{ maxWidth: 820 }}>
          <CardHead title="Tell me when…" sub="On your phone and by email" />
          <div className="list">
            {[['booked', 'The office books a visit for me'], ['moved', 'A visit is moved or cancelled'], ['office', 'The office sends me a message'], ['revised', 'A quote is revised after my survey'], ['daily', 'Send me my route for tomorrow at 6pm']].map(([k, l]) => (
              <div key={k} className="between" style={{ padding: '14px 0' }}><span>{l}</span><Switch on={n[k]} onChange={v => { setN({ ...n, [k]: v }); toast(v ? 'Turned on' : 'Turned off'); }} /></div>
            ))}
          </div>
        </Card>
      )}
      {tab === 'connections' && (
        <div className="vstack" style={{ gap: 16, maxWidth: 820 }}>
          <Card>
            <div className="hstack" style={{ gap: 12 }}><span className="tile" style={{ width: 42, height: 42, borderRadius: 10, background: '#e8f1fb', color: '#0b6e5c' }}><IconBrandWindows size={22} /></span><div className="vstack" style={{ gap: 2, flex: 1 }}><b>Outlook calendar</b><span className="small muted">{me.email} · synced {sync.outlook}</span></div><Tag tone="ok" icon={<IconCircleCheck size={12} />}>Connected</Tag><button className="btn btn-outline btn-sm" onClick={() => { setSync(x => ({ ...x, outlook: 'just now' })); toast('Synced with Outlook'); }}><IconRefresh size={14} />Sync now</button></div>
            <span className="small t2">Every visit the office books for you goes into Outlook. Busy times in Outlook stop the office booking you then.</span>
          </Card>
          <Card>
            <div className="hstack" style={{ gap: 12 }}><span className="tile" style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--tint)', color: '#0b6e5c' }}><IconPlugConnected size={22} /></span><div className="vstack" style={{ gap: 2, flex: 1 }}><b>Framepoint</b><span className="small muted">Read only · synced {sync.fp}</span></div><Tag tone="ok" icon={<IconCircleCheck size={12} />}>Connected</Tag><button className="btn btn-outline btn-sm" onClick={() => { setSync(x => ({ ...x, fp: 'just now' })); toast('Synced with Framepoint'); }}><IconRefresh size={14} />Sync now</button></div>
            <span className="small t2">You see every item, size and product the salesperson measured, so you know exactly what to check. Changes to the quote are made by the salesperson.</span>
          </Card>
          <div className="alert info small"><IconInfoCircle size={16} />Connections are set up by the System Admin. Ask the office if one stops working.</div>
        </div>
      )}
      {tab === 'security' && (
        <Card style={{ maxWidth: 820 }}>
          <div className="hstack" style={{ gap: 12 }}><IconDeviceMobile size={22} color="#0b6e5c" /><div className="vstack" style={{ gap: 2, flex: 1 }}><b>Two-step sign-in is on</b><span className="small muted">We text a code to •• 104 each time you sign in on a new device.</span></div><button className="btn btn-outline btn-sm" onClick={() => toast('A code was sent to your new number')}>Change phone</button></div>
          <div className="divider" />
          <div className="hstack" style={{ gap: 12 }}><IconLock size={22} color="#0b6e5c" /><div className="vstack" style={{ gap: 2, flex: 1 }}><b>Password</b><span className="small muted">Last changed 4 months ago</span></div><button className="btn btn-outline btn-sm" onClick={() => toast('We emailed you a link to change your password')}>Change password</button></div>
          <div className="divider" />
          <div className="hstack" style={{ gap: 12 }}><IconDeviceMobile size={22} color="#0b6e5c" /><div className="vstack" style={{ gap: 2, flex: 1 }}><b>Signed in on</b><span className="small muted">Work tablet · iPhone (Jadeite Surveyor app)</span></div><button className="btn btn-outline btn-sm" onClick={() => toast('Signed out of other devices')}>Sign out other devices</button></div>
        </Card>
      )}
    </>
  );
}
