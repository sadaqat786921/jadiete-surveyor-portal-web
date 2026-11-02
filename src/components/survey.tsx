// Shared pieces for the Surveyor portal. The surveyor sees only the visits booked for them:
// final surveys (check every size before the office orders) and aftercare / snag inspections.
// Everything they save goes onto the same customer record the office and sales use.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconSend, IconCalendarOff, IconDoorOff, IconBeach, IconEraser, IconCamera, IconPhoto } from '@tabler/icons-react';
import { Modal, Field, useToast, Check } from './ui';
import { me, staffById } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, EnquiryX } from '../data/store';
import type { FPItem } from '../data/framepoint';

export type VisitKind = 'Final survey' | 'Inspection';
export type VisitStatus = 'Booked' | 'On my way' | 'On site' | 'Submitted' | 'No access';
export type Visit = { id: string; kind: VisitKind; e?: EnquiryX; snag?: any; date: string; time: string; status: VisitStatus; to: string; customer: string; address: string; photo: string; items: number; reason?: string; changed?: number; moveAsked?: string };

export const statusTone: Record<VisitStatus, string> = { Booked: 'jade', 'On my way': 'warn', 'On site': 'warn', Submitted: 'ok', 'No access': 'err' };
export const nowTime = () => new Date().toTimeString().slice(0, 5);
export const short = (iso: string) => fmtDate(iso, { day: '2-digit', month: 'short' });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const isoOf = (d?: string) => { const m = /(\d{1,2}) (\w{3})/.exec(d || ''); return m ? `2026-${String(MON.indexOf(m[2]) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };

/** The frames the surveyor has to measure: Framepoint items without services (FENSA, waste). */
export const itemsToCheck = (e?: EnquiryX): FPItem[] => (e?.survey?.fp?.items || []).filter(i => !i.service);
export const frameCount = (e?: EnquiryX) => itemsToCheck(e).reduce((a, i) => a + i.qty, 0);
/** The sales record a snag belongs to (snags are kept against the job number). */
export const recordForJob = (enquiries: EnquiryX[], job?: string) => enquiries.find(x => x.type === 'Sales' && x.jobId && x.jobId === job);

/** Every visit of mine: booked, in progress, done, and the ones where nobody was in. */
export function useMyVisits(): Visit[] {
  const { enquiries, snags, appts, surveys } = useStore();
  return useMemo(() => {
    const out: Visit[] = [];
    enquiries.filter(e => e.finalSurvey?.surveyor === me.id).forEach(e => {
      const fs = e.finalSurvey!;
      const status: VisitStatus = fs.status === 'Done' ? 'Submitted' : fs.status === 'Started' ? 'On site' : fs.onWay ? 'On my way' : 'Booked';
      out.push({ id: e.id, kind: 'Final survey', e, date: fs.date, time: fs.time, status, to: `/surveys/${e.id}`, customer: e.name, address: `${e.address}, ${e.postcode}`, photo: e.photo, items: frameCount(e), changed: (fs.checks || []).filter(c => !c.ok).length, moveAsked: fs.moveAsked });
    });
    (surveys as any[]).filter(s => s.surveyor === me.id && s.status === 'No access').forEach(s => {
      const e = enquiries.find(x => x.id === s.job);
      out.push({ id: s.id, kind: (s.kind as VisitKind) || 'Final survey', e, date: s.iso || isoOf(s.date), time: s.time, status: 'No access', to: e ? (s.kind === 'Inspection' ? `/inspections/${s.snag}` : `/surveys/${e.id}`) : '/surveys', customer: s.customer, address: s.address, photo: s.photo, items: frameCount(e), reason: s.reason });
    });
    (snags as any[]).filter(x => x.owner === me.name || x.inspectedBy === me.name).forEach(x => {
      const a = appts.find(ap => ap.snag === x.id && ap.status !== 'Missed');
      const e = recordForJob(enquiries, x.job);
      const status: VisitStatus = x.inspected ? 'Submitted' : x.inspStarted ? 'On site' : x.inspOnWay ? 'On my way' : 'Booked';
      out.push({ id: x.id, kind: 'Inspection', e, snag: x, date: a?.date || x.inspected?.iso || TODAY, time: a?.time || '', status, to: `/inspections/${x.id}`, customer: x.customer, address: e ? `${e.address}, ${e.postcode}` : '', photo: x.photo, items: 1, moveAsked: x.moveAsked });
    });
    return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  }, [enquiries, snags, appts, surveys]);
}

export const isOpenVisit = (v: Visit) => ['Booked', 'On my way', 'On site'].includes(v.status);

/* ---------- Customer signature, drawn with a finger or mouse ---------- */
export function SignaturePad({ value, onChange, name }: { value: boolean; onChange: (v: boolean) => void; name?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const pos = (ev: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; };
  const clear = () => { const c = ref.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); onChange(false); };
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#0f1414';
    if (value && name) { ctx.font = 'italic 30px cursive'; ctx.fillStyle = '#0f1414'; ctx.fillText(name, 24, 70); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="vstack" style={{ gap: 6 }}>
      <canvas ref={ref} width={560} height={120} className="sig-pad" style={{ width: '100%', maxWidth: 560 }} aria-label="Customer signature"
        onPointerDown={ev => { drawing.current = true; const [x, y] = pos(ev); const ctx = ref.current!.getContext('2d')!; ctx.beginPath(); ctx.moveTo(x * (560 / ref.current!.clientWidth), y * (120 / ref.current!.clientHeight)); }}
        onPointerMove={ev => { if (!drawing.current) return; const [x, y] = pos(ev); const ctx = ref.current!.getContext('2d')!; ctx.lineTo(x * (560 / ref.current!.clientWidth), y * (120 / ref.current!.clientHeight)); ctx.stroke(); if (!value) onChange(true); }}
        onPointerUp={() => { drawing.current = false; }} onPointerLeave={() => { drawing.current = false; }} />
      <div className="between small"><span className="muted">{value ? 'Signed' : 'Ask the customer to sign in the box'}</span><span className="hstack" style={{ gap: 10 }}>{!value && <button type="button" className="link" onClick={() => { const ctx = ref.current!.getContext('2d')!; ctx.font = 'italic 30px cursive'; ctx.fillStyle = '#0f1414'; ctx.fillText(name || 'Signed', 24, 70); onChange(true); }}>Use a sample signature</button>}<button type="button" className="link" onClick={clear}><IconEraser size={14} />Clear</button></span></div>
    </div>
  );
}

/* ---------- Photos taken on site ---------- */
export function PhotoStrip({ n, onAdd, label = 'Add photo', max = 8 }: { n: number; onAdd: () => void; label?: string; max?: number }) {
  return (
    <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
      {Array.from({ length: Math.min(n, max) }, (_, i) => <span key={i} className="photo-thumb"><IconPhoto size={18} /><b>{i + 1}</b></span>)}
      {n > max && <span className="photo-thumb more">+{n - max}</span>}
      <button type="button" className="photo-thumb add" onClick={onAdd}><IconCamera size={18} />{label}</button>
    </div>
  );
}

/* ---------- On my way: the customer gets a text with the arrival time ---------- */
export function OnMyWayModal({ v, onClose }: { v: Visit; onClose: () => void }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [eta, setEta] = useState(20);
  const at = (() => { const d = new Date(); d.setMinutes(d.getMinutes() + eta); return d.toTimeString().slice(0, 5); })();
  const msg = `Hello ${v.customer}, this is ${me.name} from Jadeite Glazing. I am on my way for your ${v.kind === 'Final survey' ? 'final survey' : 'visit'} and should be with you at about ${at}.`;
  const save = () => {
    if (v.kind === 'Final survey' && v.e) updEnq(v.e.id, x => ({ finalSurvey: { ...x.finalSurvey!, onWay: nowTime() } }), { kind: 'email-out', title: `On my way · arriving about ${at}`, body: msg, who: me.name });
    else { set('snags', ss => ss.map(x => (x.id === v.id ? { ...x, inspOnWay: nowTime() } : x))); if (v.e) updEnq(v.e.id, {}, { kind: 'email-out', title: `On my way · arriving about ${at}`, body: msg, who: me.name }); }
    toast(`Text sent to ${v.customer} · arriving about ${at}`); onClose();
  };
  return (
    <Modal title="Tell the customer you are on your way" sub={`${v.customer} · ${v.e?.phone || ''}`} onClose={onClose} width={540}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><IconSend size={16} />Send text</button></>}>
      <Field label="How long until you get there?"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{[10, 20, 30, 45, 60].map(m => <button key={m} type="button" className={`chip ${eta === m ? 'on' : ''}`} onClick={() => setEta(m)}>{m} min</button>)}</div></Field>
      <div className="card" style={{ padding: 14, gap: 6, background: 'var(--bg)' }}><span className="tiny muted">TEXT TO {v.e?.phone || v.customer}</span><span className="small t2">{msg}</span></div>
      <div className="alert info small"><IconInfoCircle size={16} />The office sees it too, so they can answer if the customer calls.</div>
    </Modal>
  );
}

/* ---------- Can't make it: the office moves the visit and tells the customer ---------- */
export function CantMakeItModal({ v, onClose }: { v: Visit; onClose: () => void }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [why, setWhy] = useState('Running late from the last visit');
  const [when, setWhen] = useState(addDays(v.date < TODAY ? TODAY : v.date, 1));
  const [note, setNote] = useState('');
  const save = () => {
    const text = `${why}. Could move to ${fmtDate(when, { weekday: 'long', day: 'numeric', month: 'long' })}.${note ? ' ' + note : ''}`;
    if (v.kind === 'Final survey' && v.e) updEnq(v.e.id, x => ({ finalSurvey: { ...x.finalSurvey!, moveAsked: text } }), { kind: 'note', title: `${me.first} can't make the final survey on ${fmtDate(v.date)}`, body: text, who: me.name });
    else { set('snags', ss => ss.map(x => (x.id === v.id ? { ...x, moveAsked: text } : x))); if (v.e) updEnq(v.e.id, {}, { kind: 'note', title: `${me.first} can't make the inspection on ${fmtDate(v.date)}`, body: text, who: me.name }); }
    toast('Sent to Sarah in the office · she will agree a new time with the customer'); onClose();
  };
  return (
    <Modal title="Can't make this visit?" sub={`${v.customer} · ${fmtDate(v.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${v.time}`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}><IconCalendarOff size={16} />Ask the office to move it</button></>}>
      <Field label="What is the reason?"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{['Running late from the last visit', 'Car trouble', 'Unwell', 'Another visit took longer', 'Other'].map(r => <button key={r} type="button" className={`chip ${why === r ? 'on' : ''}`} onClick={() => setWhy(r)}>{r}</button>)}</div></Field>
      <div className="grid-2">
        <Field label="When could you go instead?"><input type="date" className="input" min={TODAY} value={when} onChange={x => x.target.value && setWhen(x.target.value)} /></Field>
        <Field label="Anything else? (optional)"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Free after 2pm" /></Field>
      </div>
      <div className="alert info small"><IconInfoCircle size={16} />The office books the new time and tells the customer. The visit stays in your list until they do.</div>
    </Modal>
  );
}

/* ---------- Customer not in: back to the office to rebook ---------- */
export function NoAccessModal({ v, onClose, onDone }: { v: Visit; onClose: () => void; onDone?: () => void }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [rang, setRang] = useState(true);
  const [called, setCalled] = useState(true);
  const [card, setCard] = useState(true);
  const [note, setNote] = useState('');
  const save = () => {
    const reason = [rang && 'No answer at the door', called && 'no answer on the phone', card && 'left a card'].filter(Boolean).join(', ') + (note ? `. ${note}` : '.');
    set('surveys', ss => [{ id: 'NA-' + Date.now(), job: v.e?.id || '', snag: v.kind === 'Inspection' ? v.id : undefined, customer: v.customer, address: v.address, date: short(v.date), time: v.time, surveyor: me.id, status: 'No access', tone: 'err', photo: v.photo, kind: v.kind, reason, iso: v.date } as any, ...ss]);
    set('appts', as => as.map(a => (((v.kind === 'Final survey' && a.enq === v.e?.id && a.kind === 'Survey') || a.snag === v.id) && a.status === 'Booked' ? { ...a, status: 'Missed' } : a)));
    if (v.kind === 'Final survey' && v.e) updEnq(v.e.id, { finalSurvey: undefined, next: 'Rebook final survey', nextDue: 'Today' }, { kind: 'note', title: 'Final survey · customer not in', body: `${reason} Please rebook.`, who: me.name });
    else { set('snags', ss => ss.map(x => (x.id === v.id ? { ...x, status: 'Open', tone: 'err', owner: 'Aftercare team', inspOnWay: undefined, inspStarted: undefined } : x))); if (v.e) updEnq(v.e.id, {}, { kind: 'note', title: 'Inspection · customer not in', body: `${reason} Please rebook.`, who: me.name }); }
    toast('Saved · the office will rebook and tell the customer'); onDone?.(); onClose();
  };
  return (
    <Modal title="The customer is not in" sub={`${v.customer} · ${v.address}`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={!rang && !called && note.trim().length < 3} onClick={save}><IconDoorOff size={16} />Send back to the office</button></>}>
      <div className="vstack" style={{ gap: 10 }}>
        <Check on={rang} onChange={setRang} label="I knocked and rang the bell" />
        <Check on={called} onChange={setCalled} label={`I called ${v.e?.phone || 'the customer'}`} />
        <Check on={card} onChange={setCard} label="I left a calling card" />
      </div>
      <Field label="Anything else? (optional)"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Neighbour says they are away until Monday" /></Field>
      <div className="alert warn small"><IconAlertTriangle size={16} />The visit is taken out of your list. The office books a new date with the customer and it comes back to you.</div>
    </Modal>
  );
}

/* ---------- Time off: the office cannot book visits then ---------- */
export function TimeOffModal({ onClose, day }: { onClose: () => void; day?: string }) {
  const toast = useToast();
  const { set, appts } = useStore();
  const [date, setDate] = useState(day || addDays(TODAY, 3));
  const [part, setPart] = useState('All day');
  const [why, setWhy] = useState('Holiday');
  const time = part === 'All day' ? '08:00 – 17:00' : part === 'Morning' ? '08:00 – 12:30' : '12:30 – 17:00';
  const clash = appts.find(a => a.who === me.id && a.date === date && a.status === 'Booked' && a.kind !== 'Time off' && (part === 'All day' || (part === 'Morning' ? a.time < '12:30' : a.time >= '12:30')));
  return (
    <Modal title="Add time off" sub="The office will not book visits for you then." onClose={onClose} width={520}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!!clash} onClick={() => { set('appts', as => [...as, { id: 'to' + Date.now(), kind: 'Time off', customer: why, who: me.id, date, time, synced: true, status: 'Booked', note: part }]); toast(`Time off added · ${fmtDate(date)} · ${part.toLowerCase()}`); onClose(); }}><IconBeach size={16} />Add time off</button></>}>
      <div className="grid-2">
        <Field label="Day"><input type="date" className="input" min={TODAY} value={date} onChange={x => x.target.value && setDate(x.target.value)} /></Field>
        <Field label="Reason"><select className="select" value={why} onChange={x => setWhy(x.target.value)}><option>Holiday</option><option>Appointment</option><option>Training</option><option>Other</option></select></Field>
      </div>
      <Field label="How long?"><div className="hstack" style={{ gap: 8 }}>{['All day', 'Morning', 'Afternoon'].map(p => <button key={p} type="button" className={`chip ${part === p ? 'on' : ''}`} onClick={() => setPart(p)}>{p}</button>)}</div></Field>
      {clash ? <div className="alert err small"><IconAlertTriangle size={16} />You have a visit with {clash.customer} then ({clash.time}). Use “Can't make it” on that visit first.</div>
        : <div className="alert ok small"><IconCircleCheck size={16} />Nothing is booked for you then.</div>}
    </Modal>
  );
}

export const salespersonOf = (e?: EnquiryX) => staffById(e?.assigned)?.name || '—';
