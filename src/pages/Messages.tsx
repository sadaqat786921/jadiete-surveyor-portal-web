// Messages: one conversation per customer I am visiting, built from the same history as the record's Communication tab.
// Anything sent or logged here is saved on the record, so it shows everywhere.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { IconSearch, IconPencil, IconMail, IconPhone, IconSend, IconLock, IconPhoneCall, IconExternalLink, IconLink, IconMailQuestion, IconInbox, IconArchive, IconUserPlus, IconBell, IconSettings } from '@tabler/icons-react';
import { PageHead, Avatar, Tag, Seg, useToast, Modal, Field, Empty } from '../components/ui';
import { Row, useRows } from '../components/derive';
import { useMyVisits } from '../components/survey';
import { me } from '../data/mock';
import { useStore, fmtDate } from '../data/store';
import type { Comm } from '../data/lifecycle';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Comm times look like "16 Oct, 08:12" — turn them into a sortable number.
export const commTime = (w: string) => { const m = /(\d{1,2}) (\w{3}),? ?(\d{1,2})?:?(\d{2})?/.exec(w || ''); if (!m) return 0; return (MON.indexOf(m[2]) + 1) * 1e6 + +m[1] * 1e4 + (+(m[3] || 0)) * 100 + +(m[4] || 0); };
const talk = (c: Comm) => ['email-in', 'email-out', 'call', 'note'].includes(c.kind);
export const needsReply = (e: { comms?: Comm[] }) => { const t = (e.comms || []).filter(c => c.kind === 'email-in' || c.kind === 'email-out' || c.kind === 'call'); return t[0]?.kind === 'email-in'; };
const kindIcon: Record<string, any> = { 'email-in': IconMail, 'email-out': IconMail, call: IconPhone, note: IconLock, reminder: IconBell, system: IconSettings };

export function useNeedsReplyCount() { const { enquiries } = useStore(); return enquiries.filter(needsReply).length; }

function CallModal({ r, onClose }: { r: Row; onClose: () => void }) {
  const toast = useToast();
  const { updEnq } = useStore();
  const [dir, setDir] = useState('I called the customer');
  const [out, setOut] = useState('Spoke to customer');
  const [txt, setTxt] = useState('');
  return (
    <Modal title="Log a phone call" sub={`${r.e.name} · ${r.e.phone}`} onClose={onClose} width={520}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!txt.trim()} onClick={() => { updEnq(r.e.id, {}, { kind: 'call', title: `${dir} · ${out}`, body: txt, who: me.name }); toast('Call saved on the record'); onClose(); }}>Save call</button></>}>
      <div className="grid-2">
        <Field label="Who called"><select className="select" value={dir} onChange={e => setDir(e.target.value)}><option>Customer called me</option><option>I called the customer</option></select></Field>
        <Field label="What happened"><select className="select" value={out} onChange={e => setOut(e.target.value)}><option>Spoke to customer</option><option>Left a voicemail</option><option>No answer</option></select></Field>
      </div>
      <Field label="What was said"><textarea className="textarea" value={txt} onChange={e => setTxt(e.target.value)} placeholder="Short summary of the call" /></Field>
    </Modal>
  );
}

function NewMessageModal({ rows, onClose, onPick }: { rows: Row[]; onClose: () => void; onPick: (id: string) => void }) {
  const [id, setId] = useState(rows[0]?.e.id);
  return (
    <Modal title="New message" sub="Choose the customer" onClose={onClose} width={480} footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { onPick(id); onClose(); }}>Write message</button></>}>
      <Field label="Customer"><select className="select" value={id} onChange={e => setId(e.target.value)}>{rows.map(r => <option key={r.e.id} value={r.e.id}>{r.e.name} · {r.e.jobId || r.e.id}</option>)}</select></Field>
    </Modal>
  );
}

export default function Messages() {
  const toast = useToast();
  const { updEnq } = useStore();
  const visits = useMyVisits();
  const rows = useRows();
  const all = useMemo(() => rows.filter(r => visits.some(v => v.e?.id === r.e.id)), [rows, visits]);
  const visitOf = (id: string) => visits.find(v => v.e?.id === id && v.status !== 'No access') || visits.find(v => v.e?.id === id);
  const [f, setF] = useState('reply');
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'email' | 'note'>('note');
  const [txt, setTxt] = useState('');
  const [call, setCall] = useState(false);
  const [nw, setNw] = useState(false);
  const convos = useMemo(() => all.filter(r => (r.e.comms || []).some(talk)).sort((a, b) => commTime((b.e.comms || []).find(talk)!.when) - commTime((a.e.comms || []).find(talk)!.when)), [all]);
  const list = convos.filter(r => (f === 'all' || (f === 'reply' && needsReply(r.e))) && (r.e.name + (r.e.jobId || '') + r.e.postcode).toLowerCase().includes(q.toLowerCase()));
  const [selId, setSel] = useState<string | null>(null);
  const sel = all.find(r => r.e.id === selId) || list[0] || convos[0];
  const thread = sel ? [...(sel.e.comms || [])].reverse() : [];
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { if (box.current) box.current.scrollTop = box.current.scrollHeight; }, [sel?.e.id, thread.length]);
  const send = () => {
    if (!sel || !txt.trim()) return;
    updEnq(sel.e.id, {}, mode === 'note' ? { kind: 'note', title: `Message from ${me.first} (surveyor)`, body: txt, who: me.name } : { kind: 'email-out', title: `Re: ${sel.e.product}`, body: txt, who: me.name });
    toast(mode === 'note' ? 'Sent to the office · staff only' : `Email sent to ${sel.e.email}`); setTxt('');
  };
  return (
    <>
      <PageHead title="Messages" crumbs={[{ label: 'Today', to: '/' }, { label: 'Messages' }]} actions={<><button className="btn btn-grey" disabled={!sel} onClick={() => setCall(true)}><IconPhoneCall size={16} />Log a call</button><button className="btn btn-primary" onClick={() => setNw(true)}><IconPencil size={16} />New message</button></>} />
      <div className="card flush" style={{ flexDirection: 'row', minHeight: 640 }}>
        <div style={{ width: 340, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'grid', gap: 10 }}>
            <div className="input-icon"><IconSearch size={16} /><input className="input" style={{ height: 36 }} placeholder="Search customer or job" value={q} onChange={e => setQ(e.target.value)} /></div>
            <Seg value={f} onChange={setF} items={[{ id: 'reply', label: `Needs reply · ${convos.filter(r => needsReply(r.e)).length}` }, { id: 'all', label: `All · ${convos.length}` }]} />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 640 }}>
            {list.map(r => {
              const last = (r.e.comms || []).find(talk)!;
              const nr = needsReply(r.e);
              const on = sel?.e.id === r.e.id;
              return (
                <button key={r.e.id} onClick={() => setSel(r.e.id)} style={{ width: '100%', textAlign: 'left', border: 0, borderBottom: '1px solid var(--border)', background: on ? 'var(--tint-2)' : '#fff', padding: '14px 16px', display: 'flex', gap: 12, borderLeft: on ? '3px solid var(--primary)' : '3px solid transparent' }}>
                  <Avatar i={r.e.initials} size={38} />
                  <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                    <div className="between"><b style={{ fontSize: 13 }}>{r.e.name}</b><span className="tiny muted">{last.when}</span></div>
                    <span className="small t2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{last.body || last.title}</span>
                    <span className="hstack" style={{ gap: 6 }}><span className="tiny muted">{visitOf(r.e.id)?.kind} · {visitOf(r.e.id) && fmtDate(visitOf(r.e.id)!.date)}</span>{nr && <Tag tone="warn">Needs reply</Tag>}</span>
                  </div>
                </button>
              );
            })}
            {list.length === 0 && <Empty icon={<IconInbox size={22} />} title={f === 'reply' ? 'No one is waiting for a reply' : 'No messages'} sub="Well done." />}
          </div>
        </div>
        {sel ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div className="hstack" style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', gap: 12 }}>
              <Avatar i={sel.e.initials} size={40} />
              <div className="vstack" style={{ gap: 2 }}><b style={{ fontSize: 15 }}>{sel.e.name}</b><span className="small muted">{sel.e.email} · {sel.e.phone}</span></div>
              <span className="ml-auto hstack" style={{ gap: 8 }}>
                <Tag tone="jade">{visitOf(sel.e.id)?.kind} · {visitOf(sel.e.id)?.status}</Tag>
                <Link to={visitOf(sel.e.id)?.to || '/surveys'} className="btn btn-outline btn-sm"><IconExternalLink size={14} />Open visit</Link>
              </span>
            </div>
            <div ref={box} style={{ flex: 1, padding: 20, display: 'flex', flexDirection: 'column', gap: 12, background: '#fbfcfc', overflowY: 'auto', maxHeight: 470 }}>
              {thread.map(c => {
                const I = kindIcon[c.kind] || IconMail;
                if (c.kind === 'system' || c.kind === 'reminder') return <span key={c.id} className="tiny muted hstack" style={{ alignSelf: 'center', gap: 6 }}><I size={12} />{c.title} · {c.when}</span>;
                const cls = c.kind === 'email-in' ? 'in' : c.kind === 'note' ? 'note' : 'out';
                return (
                  <div key={c.id} className={`chat-bubble ${cls}`}>
                    <div className="tiny b hstack" style={{ gap: 6, marginBottom: 4, color: cls === 'note' ? '#8a6400' : cls === 'out' ? 'var(--primary-dark)' : 'var(--t3)' }}><I size={13} />{c.kind === 'call' ? 'Call' : c.kind === 'note' ? 'Internal note' : 'Email'} · {c.who} · {c.when}</div>
                    <b style={{ fontSize: 13 }}>{c.title}</b>{c.body && <div style={{ marginTop: 4 }}>{c.body}</div>}
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'grid', gap: 10 }}>
              <Seg value={mode} onChange={v => setMode(v as any)} items={[{ id: 'note', label: 'Message the office', icon: <IconLock size={14} /> }, { id: 'email', label: 'Email the customer', icon: <IconMail size={14} /> }]} />
              <textarea className="textarea" value={txt} onChange={e => setTxt(e.target.value)} placeholder={mode === 'note' ? 'To Sarah in the office — only staff see this…' : `Write to ${sel.e.name}…`} style={{ background: mode === 'note' ? '#fffbef' : '#fff' }} />
              <div className="hstack"><span className="small muted">{mode === 'note' ? 'Never shown to the customer' : `Sent from ${me.email} to ${sel.e.email} · the office sees it too`}</span><button className="btn btn-primary btn-sm ml-auto" disabled={!txt.trim()} onClick={send}><IconSend size={14} />{mode === 'note' ? 'Send to the office' : 'Send email'}</button></div>
            </div>
          </div>
        ) : <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}><Empty icon={<IconInbox size={22} />} title="Choose a conversation" /></div>}
      </div>
      {call && sel && <CallModal r={sel} onClose={() => setCall(false)} />}
      {nw && <NewMessageModal rows={all} onClose={() => setNw(false)} onPick={id => { setSel(id); setF('all'); setMode('email'); }} />}
    </>
  );
}
