// Shared pieces for the Surveyor portal. The surveyor sees only the visits booked for them:
// final surveys (check every size before the office orders) and aftercare / snag inspections.
// Everything they save goes onto the same customer record the office and sales use.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconSend, IconCalendarOff, IconDoorOff, IconBeach, IconEraser, IconCamera, IconPhoto, IconFileTypePdf, IconUpload, IconEye, IconReplace, IconTrash, IconClock } from '@tabler/icons-react';
import { Modal, Field, useToast, Check } from './ui';
import { me, staffById } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, EnquiryX } from '../data/store';
import type { FPItem, PaperReport } from '../data/framepoint';

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
  // The surveyor types the time they expect to arrive (e.g. 13:30). We suggest about 20 minutes from now.
  const [at, setAt] = useState(() => { const d = new Date(); d.setMinutes(Math.ceil((d.getMinutes() + 20) / 5) * 5); return d.toTimeString().slice(0, 5); });
  const valid = /^\d{2}:\d{2}$/.test(at);
  const nice = valid ? at : '…';
  const msg = `Hello ${v.customer}, this is ${me.name} from Jadeite Glazing. I am on my way for your ${v.kind === 'Final survey' ? 'final survey' : 'visit'} and should be with you at about ${nice}.`;
  const save = () => {
    if (!valid) return;
    if (v.kind === 'Final survey' && v.e) updEnq(v.e.id, x => ({ finalSurvey: { ...x.finalSurvey!, onWay: nowTime() } }), { kind: 'email-out', title: `On my way · arriving about ${at}`, body: msg, who: me.name });
    else { set('snags', ss => ss.map(x => (x.id === v.id ? { ...x, inspOnWay: nowTime() } : x))); if (v.e) updEnq(v.e.id, {}, { kind: 'email-out', title: `On my way · arriving about ${at}`, body: msg, who: me.name }); }
    toast(`Text sent to ${v.customer} · arriving about ${at}`); onClose();
  };
  return (
    <Modal title="Tell the customer you are on your way" sub={`${v.customer} · ${v.e?.phone || ''}`} onClose={onClose} width={540}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!valid} onClick={save}><IconSend size={16} />Send text</button></>}>
      <Field label="What time will you get there?" hint={`Type the time, for example 13:30. The visit is booked for ${v.time}.`}>
        <div className="hstack" style={{ gap: 8 }}><IconClock size={18} color="#0b6e5c" /><input type="time" className="input" style={{ width: 160 }} value={at} onChange={x => setAt(x.target.value)} aria-label="Arrival time" autoFocus /></div>
      </Field>
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

/* ---------- Paperwork report: the surveyor uploads the paper survey sheet instead of typing sizes ---------- */
const kbOf = (n: number) => Math.max(1, Math.round(n / 1024));
/** A picture of a filled-in paper survey sheet, used for "Use a sample report" in the demo. */
export function sampleSheet(items: FPItem[], customer: string) {
  const x = (t: string) => t.replace(/&/g, 'and').replace(/</g, '').replace(/>/g, '');
  customer = x(customer);
  const rows = items.map((i, k) => {
    const y = 150 + k * 46;
    return `<text x="40" y="${y}" font-size="15" fill="#3a4a4a">${i.no}. ${x(i.name)}${i.qty > 1 ? ` x ${i.qty}` : ''}</text><text x="420" y="${y}" font-size="19" fill="#1d3fa8" font-family="Segoe Print, Comic Sans MS, cursive">${(i.size || '').replace(/mm/g, '')}</text><line x1="40" y1="${y + 14}" x2="640" y2="${y + 14}" stroke="#d5dcda"/>`;
  }).join('');
  const h = 230 + items.length * 46;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="680" height="${h}" viewBox="0 0 680 ${h}"><rect width="680" height="${h}" fill="#fdfcf7"/><rect x="16" y="16" width="648" height="${h - 32}" fill="none" stroke="#c9d3d0"/><text x="40" y="58" font-size="22" font-weight="700" fill="#0b1f1b" font-family="Arial">Jadeite Glazing · Final survey sheet</text><text x="40" y="88" font-size="14" fill="#6b7a78" font-family="Arial">Customer: ${customer} · Surveyor: ${me.name}</text><text x="40" y="122" font-size="12" fill="#6b7a78" font-family="Arial">ITEM</text><text x="420" y="122" font-size="12" fill="#6b7a78" font-family="Arial">WIDTH x HEIGHT (mm)</text>${rows}<text x="40" y="${h - 44}" font-size="13" fill="#6b7a78" font-family="Arial">Customer signature</text><path d="M180 ${h - 48} c20 -22 34 10 52 -6 s28 -18 40 4 s30 6 48 -10" stroke="#1d3fa8" stroke-width="2" fill="none"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function PaperReportModal({ items, customer, typed, current, onClose, onSave }: { items: FPItem[]; customer: string; typed: number; current?: PaperReport; onClose: () => void; onSave: (p: PaperReport) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<Omit<PaperReport, 'changed' | 'at'> | null>(current ? { file: current.file, kb: current.kb, type: current.type, preview: current.preview } : null);
  const [diff, setDiff] = useState<'same' | 'some' | ''>(current ? (current.changed.length ? 'some' : 'same') : '');
  const [changed, setChanged] = useState<number[]>(current?.changed || []);
  const pick = (f?: File) => {
    if (!f) return;
    const type = f.type === 'application/pdf' || /\.pdf$/i.test(f.name) ? 'pdf' : f.type.startsWith('image/') ? 'image' : null;
    if (!type) { toast('Please choose a PDF or a photo'); return; }
    if (f.size > 15 * 1024 * 1024) { toast('That file is too big. Please choose one under 15 MB'); return; }
    const base = { file: f.name, kb: kbOf(f.size), type: type as 'pdf' | 'image' };
    // Small files are kept so they can be opened again from the report.
    if (f.size <= 1.5 * 1024 * 1024) { const r = new FileReader(); r.onload = () => setFile({ ...base, preview: String(r.result) }); r.readAsDataURL(f); }
    else setFile(base);
  };
  const ok = !!file && (diff === 'same' || (diff === 'some' && changed.length > 0));
  return (
    <Modal title={current ? 'Replace the paperwork report' : 'Upload the paperwork report'} sub={`${customer} · ${items.length} item${items.length === 1 ? '' : 's'} to measure`} onClose={onClose} width={620}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!ok} onClick={() => onSave({ ...file!, at: nowTime(), changed: diff === 'some' ? changed : [] })}><IconUpload size={16} />Use this report</button></>}>
      <span className="small t2">If you wrote the sizes on the paper survey sheet, upload it here instead of typing every size. Upload a PDF, or take a clear photo of the sheet.</span>
      <input ref={input} type="file" accept="application/pdf,image/*" capture="environment" style={{ display: 'none' }} onChange={x => { pick(x.target.files?.[0]); x.target.value = ''; }} aria-label="Paperwork report file" />
      {file ? (
        <div className="hstack" style={{ gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 12 }}>
          {file.type === 'image' && file.preview ? <img src={file.preview} alt="" style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} /> : <span className="tile" style={{ width: 56, height: 56, borderRadius: 8, background: '#fdecec' }}><IconFileTypePdf size={26} color="#d64545" /></span>}
          <div className="vstack" style={{ gap: 2, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file}</b><span className="tiny muted">{file.type === 'pdf' ? 'PDF' : 'Photo'} · {file.kb} KB</span></div>
          <button className="btn btn-outline btn-sm" onClick={() => input.current?.click()}><IconReplace size={14} />Choose another</button>
        </div>
      ) : (
        <div className="vstack" style={{ gap: 10, alignItems: 'center', padding: 24, border: '2px dashed var(--border)', borderRadius: 12, background: 'var(--bg)', textAlign: 'center' }}
          onDragOver={x => x.preventDefault()} onDrop={x => { x.preventDefault(); pick(x.dataTransfer.files?.[0]); }}>
          <IconUpload size={26} color="#0b6e5c" />
          <b style={{ fontSize: 14 }}>Drop the file here, or choose it</b>
          <span className="tiny muted">PDF or photo · up to 15 MB</span>
          <div className="hstack" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button className="btn btn-primary btn-sm" onClick={() => input.current?.click()}><IconUpload size={14} />Choose file or take photo</button>
            <button className="btn btn-outline btn-sm" onClick={() => setFile({ file: `Survey sheet ${customer}.jpg`, kb: 864, type: 'image', preview: sampleSheet(items, customer) })}>Use a sample report</button>
          </div>
        </div>
      )}
      <Field label="Are the sizes on the paperwork the same as the salesperson's?">
        <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className={`chip ${diff === 'same' ? 'on' : ''}`} onClick={() => setDiff('same')}>Yes, all the same</button>
          <button type="button" className={`chip ${diff === 'some' ? 'on-warn' : ''}`} onClick={() => setDiff('some')}>No, some are different</button>
        </div>
      </Field>
      {diff === 'some' && (
        <Field label="Which items are different?">
          <div className="vstack" style={{ gap: 8 }}>{items.map(i => <Check key={i.no} on={changed.includes(i.no)} onChange={v => setChanged(c => (v ? [...c, i.no] : c.filter(n => n !== i.no)))} label={<span>{i.no}. {i.name}{i.qty > 1 ? ` × ${i.qty}` : ''} <span className="muted">· sales measured {i.size}</span></span>} />)}</div>
        </Field>
      )}
      {typed > 0 && <div className="alert warn small"><IconAlertTriangle size={16} /><div>You have typed {typed} size{typed === 1 ? '' : 's'}. {typed === 1 ? 'It' : 'They'} will be removed and the paperwork report used instead.</div></div>}
      <div className="alert info small"><IconInfoCircle size={16} />The report is added to the final survey, so the office and the salesperson see exactly what you wrote.</div>
    </Modal>
  );
}

/** Shows an uploaded paperwork report: a preview, plus open / replace / remove while on site. */
export function PaperCard({ p, onReplace, onRemove, sub }: { p: PaperReport; onReplace?: () => void; onRemove?: () => void; sub?: string }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  return (
    <div className="hstack" style={{ gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, background: '#fff', flexWrap: 'wrap' }}>
      <button type="button" onClick={() => (p.preview ? setOpen(true) : toast(`Opening ${p.file}`))} style={{ border: 0, padding: 0, background: 'none', cursor: 'pointer' }} aria-label="Open the paperwork report">
        {p.type === 'image' && p.preview ? <img src={p.preview} alt="Paperwork report" style={{ width: 96, height: 72, objectFit: 'cover', objectPosition: 'top', borderRadius: 8, border: '1px solid var(--border)' }} /> : <span className="tile" style={{ width: 96, height: 72, borderRadius: 8, background: '#fdecec' }}><IconFileTypePdf size={30} color="#d64545" /></span>}
      </button>
      <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 200 }}>
        <b style={{ fontSize: 13.5 }}>{p.file}</b>
        <span className="tiny muted">{sub || 'Paperwork report'} · {p.type === 'pdf' ? 'PDF' : 'Photo'} · {p.kb} KB · uploaded {p.at}</span>
        <span className="small t2">{p.changed.length ? `${p.changed.length} item${p.changed.length === 1 ? '' : 's'} different from the sales size` : 'All sizes the same as sales'}</span>
      </div>
      <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-outline btn-sm" onClick={() => (p.preview ? setOpen(true) : toast(`Opening ${p.file}`))}><IconEye size={14} />View</button>
        {onReplace && <button className="btn btn-outline btn-sm" onClick={onReplace}><IconReplace size={14} />Replace</button>}
        {onRemove && <button className="btn btn-grey btn-sm" onClick={onRemove}><IconTrash size={14} />Remove</button>}
      </div>
      {open && p.preview && (
        <Modal title={p.file} sub="Paperwork report" onClose={() => setOpen(false)} width={760} footer={<button className="btn btn-primary" onClick={() => setOpen(false)}>Close</button>}>
          {p.type === 'pdf' ? <iframe src={p.preview} title={p.file} style={{ width: '100%', height: '65vh', border: '1px solid var(--border)', borderRadius: 8 }} /> : <img src={p.preview} alt={p.file} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)' }} />}
        </Modal>
      )}
    </div>
  );
}
