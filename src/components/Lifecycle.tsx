// Pop-ups and documents for the enquiry lifecycle. Every action saves to the
// enquiry record, logs to Communication and moves the pipeline card.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconMail, IconPhoneCall, IconCalendarEvent, IconClipboardCheck, IconFileInvoice, IconTrophy, IconX, IconUserCircle, IconPackage, IconTruckDelivery,
  IconCircleCheck, IconAlertTriangle, IconPlus, IconTrash, IconSend, IconWorld, IconInfoCircle, IconTool, IconShieldCheck, IconCalendarPlus, IconPencil,
  IconPlugConnected, IconFileUpload, IconFileTypePdf, IconScan, IconLoader2, IconRuler, IconRulerMeasure, IconSearch, IconClock,
} from '@tabler/icons-react';
import { Modal, Field, Check, Avatar, Tag, useToast, Seg } from './ui';
import { staffById, salespeople, surveyors, IMG, gbp, me } from '../data/mock';
import { crewOf, personById, getRoster } from '../data/crew';
import { useStore, TODAY, addDays, fmtDate, EnquiryX, JobX } from '../data/store';
import { Opening, OPENING_TYPES, Quote, quoteTotals, linesFromFp } from '../data/lifecycle';
import { FPItem, FPSurvey, FinalCheck, fpTotals, makeFpSurvey, nextFpRef, guessOpeningsFor, OCR_UNSURE } from '../data/framepoint';

export type P = { e: EnquiryX; onClose: () => void; onDone?: (tab: string) => void };
// The person using the portal: everything they do is saved under their name.
export const ME = me.name;
const first = (n: string) => n.split(' ').pop() || n;
const town = (a: string) => a.split(', ').pop() || a;

export function PickPerson({ people, value, onChange, load }: { people: { id: string; name: string; initials: string }[]; value: string; onChange: (v: string) => void; load?: Record<string, string> }) {
  return (
    <div className="grid-2" style={{ gap: 10 }}>
      {people.map(s => (
        <button key={s.id} type="button" onClick={() => onChange(s.id)} className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderColor: value === s.id ? 'var(--primary)' : undefined, background: value === s.id ? 'var(--tint-2)' : '#fff', textAlign: 'left' }}>
          <Avatar i={s.initials} size={36} />
          <div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{s.name}</b>{load && <span className="tiny muted">{load[s.id]}</span>}</div>
          {value === s.id && <IconCircleCheck color="#00c7a1" size={20} />}
        </button>
      ))}
    </div>
  );
}

export const Foot = ({ onClose, label, onSave, disabled, icon }: { onClose: () => void; label: string; onSave: () => void; disabled?: boolean; icon?: React.ReactNode }) => (
  <><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={disabled} style={{ opacity: disabled ? 0.45 : 1 }} onClick={onSave}>{icon}{label}</button></>
);

/* ---------- 1. Contact the customer → Qualification ---------- */
export function ContactModal({ e, onClose, onDone, logOnly }: P & { logOnly?: 'email' | 'call' }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const s = staffById(e.assigned);
  const [how, setHow] = useState<string>(logOnly || 'email');
  const [subject, setSubject] = useState(logOnly ? '' : 'Thank you for your enquiry — Jadeite Glazing');
  const [body, setBody] = useState(logOnly ? '' : `Dear ${e.name},\n\nThank you for getting in touch about your ${e.product.toLowerCase()}. I would love to come and see you, talk through the options and measure up.\n\nWhen would suit you for a visit?\n\nKind regards,\n${s?.name || ME}\nJadeite Glazing`);
  const [notes, setNotes] = useState('');
  const moving = !logOnly && e.stage === 'New Enquiry';
  const save = () => {
    const who = s?.name || ME;
    updEnq(e.id, moving ? { stage: 'Qualification', stageDays: 0, next: 'Book appointment', nextDue: fmtDate(addDays(TODAY, 2)) } : {},
      how === 'email' ? { kind: 'email-out', title: subject || 'Email to customer', body, who } : { kind: 'call', title: `Call with ${e.name}`, body: notes || 'Call logged.', who });
    // The first contact also ticks off the matching "call / contact" task.
    if (moving) set('tasks', ts => ts.map(t => (t.enq === e.id && /^(Call|Contact)/.test(t.title) ? { ...t, done: true } : t)));
    toast(moving ? `${how === 'email' ? 'Email sent' : 'Call saved'} · ${e.name} moved to Qualification` : `${how === 'email' ? 'Email sent' : 'Call saved'} · saved in Communication`);
    onDone?.('comms'); onClose();
  };
  return (
    <Modal title={logOnly ? (how === 'email' ? 'Send an email' : 'Log a call') : 'Contact the customer'} sub={`${e.name} · ${e.email} · ${e.phone}`} onClose={onClose} width={640}
      footer={<Foot onClose={onClose} onSave={save} label={how === 'email' ? 'Send email' : 'Save call'} icon={how === 'email' ? <IconSend size={16} /> : <IconPhoneCall size={16} />} disabled={how === 'call' && notes.trim().length < 3} />}>
      {!logOnly && <Seg value={how} onChange={setHow} items={[{ id: 'email', label: 'Send an email', icon: <IconMail size={15} /> }, { id: 'call', label: 'I called them', icon: <IconPhoneCall size={15} /> }]} />}
      {how === 'email' ? (
        <>
          <Field label="To"><input className="input" value={`${e.name} <${e.email}>`} readOnly style={{ background: 'var(--bg)' }} /></Field>
          <Field label="Subject"><input className="input" value={subject} onChange={x => setSubject(x.target.value)} /></Field>
          <Field label="Message"><textarea className="textarea" style={{ minHeight: 190 }} value={body} onChange={x => setBody(x.target.value)} /></Field>
        </>
      ) : (
        <Field label="What did you talk about?" hint="This is saved in the Communication tab so everyone can see it."><textarea className="textarea" style={{ minHeight: 140 }} value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Wants 6 windows in anthracite grey. Free for a visit next Tuesday morning." /></Field>
      )}
      {moving && <div className="alert info small"><IconInfoCircle size={16} />The card moves from <b>&nbsp;New enquiry&nbsp;</b> to <b>&nbsp;Qualification&nbsp;</b> in the pipeline.</div>}
    </Modal>
  );
}

/* ---------- 2. Book appointment → Appointment ---------- */
export function BookApptModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, appts } = useStore();
  const owner = staffById(e.assigned);
  const [type, setType] = useState<'Home visit' | 'Showroom visit' | 'Video call'>('Home visit');
  const [who, setWho] = useState(e.assigned || 'mh');
  const [change, setChange] = useState(false);
  const [why, setWhy] = useState('');
  const changing = e.appt?.status === 'Booked';
  const [date, setDate] = useState(changing ? e.appt!.date : addDays(TODAY, 4));
  const SLOTS = ['09:00 – 10:00', '10:00 – 11:00', '11:30 – 12:30', '13:30 – 14:30', '16:00 – 17:00'];
  // Start on the first time the salesperson is free that day, so the form never opens on a clash.
  const [time, setTime] = useState(() => changing ? e.appt!.time : SLOTS.find(t => !appts.some(a => a.who === (e.assigned || 'mh') && a.date === addDays(TODAY, 4) && a.status !== 'Done' && a.time.split(' ')[0] === t.split(' ')[0])) || SLOTS[1]);
  const [notes, setNotes] = useState(changing ? e.appt!.notes || '' : '');
  const s = staffById(who)!;
  const moved = !!e.assigned && who !== e.assigned;
  const busy = appts.filter(a => a.who === who && a.date === date && a.status !== 'Done' && !(changing && a.customer === e.name && a.kind === 'Sales visit'));
  const clash = busy.find(a => a.time.split(' ')[0] === time.split(' ')[0]);
  const save = () => {
    // The salesperson who visits is the salesperson who owns the customer. Changing it moves the deal.
    updEnq(e.id, { stage: 'Appointment', stageDays: 0, assigned: who, appt: { date, time, who, type, address: type === 'Showroom visit' ? 'Jadeite showroom, Harrogate' : e.address, notes, status: 'Booked' }, next: 'Sales appointment', nextDue: fmtDate(date) },
      { kind: 'email-out', title: changing ? 'Your appointment has changed' : 'Your appointment is booked', body: `Dear ${e.name}, ${s.name} will see you on ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} at ${time.split(' ')[0]} (${type.toLowerCase()}).`, who: owner?.name || ME });
    if (moved) updEnq(e.id, {}, { kind: 'system', title: `Moved from ${owner?.name} to ${s.name}`, body: `${s.name} now looks after ${e.name}. Reason: ${why}`, who: ME });
    // Changing a booked visit replaces it in the calendar, so there is only ever one.
    set('appts', as => [...as.filter(x => !(x.kind === 'Sales visit' && x.customer === e.name && x.status === 'Booked')), { id: 'ap' + Date.now(), kind: 'Sales visit', customer: e.name, who, date, time, address: type === 'Showroom visit' ? 'Jadeite showroom, Harrogate' : e.address, synced: true, status: 'Booked' }]);
    toast(moved ? `Booked with ${s.name} · ${e.name} is now ${s.name.split(' ')[0]}’s customer` : `Appointment booked with ${s.name} · ${fmtDate(date)} · in ${s.name.split(' ')[0]}’s Outlook`);
    onDone?.('appt'); onClose();
  };
  return (
    <Modal title={changing ? 'Change the appointment' : 'Book appointment'} sub={`${e.name} · ${e.address}`} onClose={onClose} width={640}
      footer={<Foot onClose={onClose} onSave={save} disabled={!!clash || (moved && why.trim().length < 3)} label="Book and email the customer" icon={<IconCalendarEvent size={16} />} />}>
      <Field label="What kind of appointment?"><div className="hstack" style={{ gap: 8 }}>{(['Home visit', 'Showroom visit', 'Video call'] as const).map(k => <button key={k} type="button" className={`chip ${type === k ? 'on' : ''}`} onClick={() => setType(k)}>{k}</button>)}</div></Field>
      <Field label="Salesperson">
        {!change ? (
          <div className="hstack" style={{ gap: 12, padding: 12, border: '1px solid var(--primary)', background: 'var(--tint-2)', borderRadius: 12 }}>
            <Avatar i={s.initials} size={38} />
            <div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{s.name}</b><span className="tiny muted">{e.name}’s salesperson · they go to the appointment</span></div>
            {e.assigned && <button type="button" className="link small" onClick={() => setChange(true)}>Someone else needs to go?</button>}
          </div>
        ) : (
          <PickPerson people={salespeople} value={who} onChange={setWho} load={Object.fromEntries(salespeople.map(p => [p.id, p.id === e.assigned ? 'Current salesperson' : 'Will take over this customer']))} />
        )}
      </Field>
      {moved && (
        <>
          <div className="alert warn small"><IconAlertTriangle size={16} /><div>One customer has one salesperson. Booking with {s.name} moves {e.name} to {s.name.split(' ')[0]} — the pipeline, quote and follow-ups go with them.</div></div>
          <Field label={`Why can't ${owner?.name.split(' ')[0]} go? (required)`}><input className="input" value={why} onChange={x => setWhy(x.target.value)} placeholder={`e.g. ${owner?.name.split(' ')[0]} is on holiday that week`} /></Field>
        </>
      )}
      <div className="grid-2">
        <Field label="Date"><input type="date" className="input" value={date} onChange={x => setDate(x.target.value)} /></Field>
        <Field label="Time"><select className="select" value={time} onChange={x => setTime(x.target.value)}>{SLOTS.map(t => <option key={t}>{t}</option>)}</select></Field>
      </div>
      {clash ? <div className="alert err small"><IconAlertTriangle size={16} /><div><b>{s.name.split(' ')[0]} is already busy then</b> — {clash.kind.toLowerCase()} with {clash.customer}. Pick another time.</div></div>
        : <div className="alert ok small"><IconCircleCheck size={16} /><div><b>{s.name.split(' ')[0]} is free</b> at {time.split(' ')[0]} on {fmtDate(date)}{busy.length ? ` (${busy.length} other visit${busy.length > 1 ? 's' : ''} that day)` : ''}. Checked against their Outlook calendar.</div></div>}
      <Field label={`Notes for ${s.name.split(' ')[0]} (optional)`}><input className="input" value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Park on the drive. Ring the side door." /></Field>
      <Check on label={`Email the customer a confirmation and add it to ${s.name.split(' ')[0]}’s Outlook calendar`} />
    </Modal>
  );
}

/* ---------- Framepoint helpers ---------- */
const todayShort = () => fmtDate(TODAY, { day: '2-digit', month: 'short' });
const realItems = (items: FPItem[]) => items.filter(i => !i.service);
const frameCount = (items: FPItem[]) => realItems(items).reduce((a, i) => a + i.qty, 0);
const glassIdx = (i?: FPItem) => (i ? i.spec.findIndex(([k]) => k === 'Glass' || k === 'G1') : -1);

export function FileChip({ name, sub, onOpen }: { name: string; sub?: string; onOpen?: () => void }) {
  return (
    <button type="button" className="file-chip" onClick={onOpen}>
      <IconFileTypePdf size={20} color="#d64545" />
      <span className="vstack" style={{ gap: 1, textAlign: 'left' }}><b style={{ fontSize: 12.5 }}>{name}</b>{sub && <span className="tiny muted">{sub}</span>}</span>
    </button>
  );
}

// Project summary — the same table Framepoint prints on its quote.
function FpItemsTable({ items, edit, onChange, unsure }: { items: FPItem[]; edit?: boolean; onChange?: (i: number, patch: Partial<FPItem>) => void; unsure?: boolean }) {
  const t = fpTotals(items);
  return (
    <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
      <thead><tr><th style={{ width: 34 }}>#</th><th>Item</th><th>Product</th><th>Size (W × H)</th><th style={{ textAlign: 'right' }}>Qty</th><th style={{ textAlign: 'right' }}>Each</th><th style={{ textAlign: 'right' }}>Total</th></tr></thead>
      <tbody>
        {items.map((it, i) => {
          const amber = unsure && OCR_UNSURE.includes(`size:${it.no}`);
          return (
            <tr key={it.no}>
              <td className="b">{it.no}</td>
              <td><b style={{ fontSize: 13 }}>{it.name}</b><div className="tiny muted">{it.work}</div></td>
              <td className="t2">{it.product}</td>
              <td style={{ whiteSpace: 'nowrap' }}>{it.service ? <span className="muted">—</span> : edit
                ? <input className={`input ${amber ? 'unsure' : ''}`} style={{ height: 32, width: 170 }} value={it.size || ''} onChange={x => onChange?.(i, { size: x.target.value })} aria-label={`Size of item ${it.no}`} />
                : it.size}</td>
              <td style={{ textAlign: 'right' }}>{edit && !it.service ? <input className="input" type="number" min={1} style={{ height: 32, width: 64 }} value={it.qty} onChange={x => onChange?.(i, { qty: Math.max(1, +x.target.value) })} /> : it.qty}</td>
              <td style={{ textAlign: 'right' }}>{edit && !it.service ? <input className="input" type="number" style={{ height: 32, width: 96 }} value={it.each} onChange={x => onChange?.(i, { each: Math.max(0, +x.target.value) })} /> : gbp(it.each)}</td>
              <td className="b" style={{ textAlign: 'right' }}>{gbp(it.qty * it.each)}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot><tr><td colSpan={6} style={{ textAlign: 'right' }} className="b">Final price (inc. VAT)</td><td className="b" style={{ textAlign: 'right', fontSize: 15 }}>{gbp(t.total)}</td></tr></tfoot>
    </table>
  );
}

/* ---------- 3. Add the Framepoint survey (salesperson, at the visit) → Survey ---------- */
export function FramepointSurveyModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const by = staffById(e.assigned)?.name || ME;
  const ops = useMemo(() => guessOpeningsFor(e.product), [e.product]);
  const [ref] = useState(() => nextFpRef());
  const [how, setHow] = useState<string>('api');
  const [refInput, setRefInput] = useState(ref);
  const [phase, setPhase] = useState<'start' | 'busy' | 'ready'>('start');
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState<FPItem[]>([]);
  const [checked, setChecked] = useState(false);
  const [outcome, setOutcome] = useState(e.appt?.outcome || '');
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const fresh = () => makeFpSurvey(ops, by, todayShort(), how === 'api' ? 'Framepoint' : 'Survey report (PDF)', refInput.trim() || ref);
  const switchHow = (h: string) => { window.clearTimeout(timer.current); setHow(h); setPhase('start'); setChecked(false); setFileName(''); };
  const find = () => { setPhase('busy'); timer.current = window.setTimeout(() => { setItems(fresh().items); setPhase('ready'); }, 900); };
  const read = (name: string) => { setFileName(name); setPhase('busy'); timer.current = window.setTimeout(() => { setItems(fresh().items); setPhase('ready'); }, 1500); };
  const upd = (i: number, patch: Partial<FPItem>) => setItems(xs => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const gi = glassIdx(items[0]);
  const t = fpTotals(items);
  const pdf = how === 'pdf';
  const save = () => {
    const base = fresh();
    const fp: FPSurvey = { ...base, items, file: pdf ? fileName : base.file, checked: pdf ? OCR_UNSURE : undefined };
    updEnq(e.id, {
      stage: 'Quote Preparation', stageDays: 0, value: t.total, versions: [{ ref: fp.ref, on: todayShort(), total: t.total, note: 'First quote' }],
      appt: e.appt ? { ...e.appt, status: 'Done', outcome: outcome.trim() || e.appt.outcome } : e.appt,
      survey: { surveyor: e.assigned || 'mh', date: TODAY, time: e.appt?.time || '', status: 'Completed', requestedBy: by, openings: ops, completedOn: todayShort(), fp },
      next: 'Send quote', nextDue: 'Today',
    }, { kind: 'note', title: pdf ? `Survey report read and checked · ${fp.ref}` : `Framepoint survey ${fp.ref} imported`, body: `${frameCount(items)} frame${frameCount(items) === 1 ? '' : 's'} measured by ${by} at the visit. Final price ${gbp(t.total)} inc. VAT.${pdf ? ` Report ${fp.file} saved.` : ''}`, who: pdf ? ME : 'Framepoint' });
    toast(`Framepoint quote ${fp.ref} linked · ${gbp(t.total)} · ready to send`);
    onDone?.('survey'); onClose();
  };
  return (
    <Modal title="Add the Framepoint survey & quote" sub={`Designed and priced by ${by} in Framepoint · ${e.name} · ${e.address}`} onClose={onClose} width={880}
      footer={<Foot onClose={onClose} onSave={save} disabled={phase !== 'ready' || (pdf && !checked)} label={pdf ? 'Save survey' : 'Import survey and prices'} icon={<IconCircleCheck size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} /><div>{by.split(' ')[0]} designed and priced the job in <b>Framepoint</b> from the appointment notes. Link it here — nothing needs typing again.</div></div>
      {e.appt && !e.appt.outcome && <Field label="How did the appointment go? (optional)" hint="Saved on the Appointment tab."><input className="input" value={outcome} onChange={x => setOutcome(x.target.value)} placeholder="e.g. Chose white sash windows. Happy with the price." /></Field>}
      <Seg value={how} onChange={switchHow} items={[{ id: 'api', label: 'Get it from Framepoint', icon: <IconPlugConnected size={15} /> }, { id: 'pdf', label: 'Upload survey report (PDF)', icon: <IconFileUpload size={15} /> }]} />

      {!pdf && phase === 'start' && (
        <div className="vstack" style={{ gap: 10 }}>
          <div className="hstack" style={{ gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><Field label="Framepoint quote number" hint="It is at the top of the Framepoint quote, for example 313-1-v5."><input className="input" value={refInput} onChange={x => setRefInput(x.target.value)} /></Field></div>
            <button className="btn btn-primary" style={{ marginBottom: 22 }} disabled={refInput.trim().length < 3} onClick={find}><IconSearch size={16} />Find in Framepoint</button>
          </div>
          <span className="tiny hstack" style={{ gap: 6, color: 'var(--ok)' }}><span className="dot" style={{ background: 'var(--ok)' }} />Connected to Framepoint · synced 2 minutes ago</span>
        </div>
      )}
      {pdf && phase === 'start' && (
        <div className="vstack" style={{ gap: 10 }}>
          <label className="dropzone">
            <input type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={x => { const f = x.target.files?.[0]; if (f) read(f.name); }} />
            <IconFileUpload size={30} color="#0b6e5c" />
            <b>Drop the survey report here, or choose the file</b>
            <span className="small muted">The PDF from Framepoint · we read the sizes, products and prices for you</span>
          </label>
          <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => read(`Survey report ${refInput.trim() || ref}.pdf`)}><IconFileTypePdf size={15} />Use the sample report</button>
        </div>
      )}
      {phase === 'busy' && (
        <div className="card" style={{ padding: 22, alignItems: 'center', gap: 10, background: 'var(--bg)' }}>
          {pdf ? <IconScan size={30} color="#0b6e5c" /> : <IconLoader2 size={30} color="#0b6e5c" className="spin" />}
          <b>{pdf ? 'Reading the report…' : 'Looking in Framepoint…'}</b>
          <span className="small muted">{pdf ? `${fileName} · finding items, sizes, products and prices` : `Quote ${refInput}`}</span>
          <div className="bar" style={{ width: 260 }}><span className="bar-run" /></div>
        </div>
      )}
      {phase === 'ready' && (
        <div className="vstack" style={{ gap: 12 }}>
          {pdf ? (
            <>
              <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}><FileChip name={fileName} sub="Read just now · saved with the enquiry" /><Tag tone="ok">{items.length} lines found</Tag><button className="link small" onClick={() => switchHow('pdf')}>Choose another file</button></div>
              <div className="alert warn small"><IconAlertTriangle size={16} /><div><b>Please check the {gi >= 0 ? '2 details' : 'detail'} marked in amber.</b> The reader was not fully sure about them. You can change any size, quantity or price.</div></div>
            </>
          ) : (
            <div className="alert ok small"><IconCircleCheck size={16} /><div><b>Found quote {refInput} in Framepoint.</b> {e.name} · measured by {by} · {frameCount(items)} frame{frameCount(items) === 1 ? '' : 's'} · {gbp(t.total)} inc. VAT</div></div>
          )}
          <FpItemsTable items={items} edit={pdf} unsure={pdf} onChange={upd} />
          {pdf && gi >= 0 && (
            <Field label={`Item 1 · ${items[0].spec[gi][0] === 'G1' ? 'Glass (G1)' : 'Glass'}`}><input className="input unsure" value={items[0].spec[gi][1]} onChange={x => upd(0, { spec: items[0].spec.map((s, k) => (k === gi ? [s[0], x.target.value] : s)) as [string, string][] })} /></Field>
          )}
          {pdf && <Check on={checked} onChange={setChecked} label="I have checked these details against the report" />}
          <span className="tiny muted">Payment terms from Framepoint: 50% deposit · 40% seven days before fitting · 10% on completion. Lead time 6 weeks.</span>
        </div>
      )}
    </Modal>
  );
}

/* ---------- Survey tab ---------- */
export function SurveyReport({ e }: { e: EnquiryX }) {
  const toast = useToast();
  const v = e.survey!;
  if (!v.fp) return <OldSurveyReport e={e} />;
  const fp = v.fp;
  const t = fpTotals(fp.items);
  const real = realItems(fp.items);
  return (
    <div className="vstack" style={{ gap: 18 }}>
      <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
        <span className="hstack" style={{ gap: 8 }}><b>Framepoint survey {fp.ref}</b><Tag tone={fp.source === 'Framepoint' ? 'jade' : 'info'} icon={fp.source === 'Framepoint' ? <IconPlugConnected size={13} /> : <IconScan size={13} />}>{fp.source === 'Framepoint' ? 'From Framepoint' : 'Read from the PDF'}</Tag>{fp.checked && <Tag tone="ok">Checked by the office</Tag>}</span>
        <span className="small muted">Measured by {fp.by} at the visit · {fp.date}</span>
      </div>
      <div className="grid-4" style={{ rowGap: 14 }}>
        {[['Measured by', `${fp.by} (salesperson)`], ['Date', fp.date || '—'], ['Frames', `${frameCount(fp.items)} frame${frameCount(fp.items) === 1 ? '' : 's'} · ${real.length} item${real.length === 1 ? '' : 's'}`], ['Final price', `${gbp(t.total)} inc. VAT`], ['Lead time', fp.leadTime], ['Guarantee', fp.guarantee], ['Final survey', e.finalSurvey ? (e.finalSurvey.status === 'Done' ? `Done ${e.finalSurvey.doneOn || ''}` : `Booked ${fmtDate(e.finalSurvey.date)}`) : 'After the quote is won'], ['Sent to customer', e.quote ? `Yes · ${e.quote.sentOn}` : 'Not yet']].map(([l, val]) => (
          <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>
        ))}
      </div>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Files</b>
        <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
          <FileChip name={fp.file} sub="Survey report · for the customer to review" onOpen={() => toast(`Opening ${fp.file}`)} />
          <FileChip name={fp.quoteFile} sub="Framepoint quote" onOpen={() => toast(`Opening ${fp.quoteFile}`)} />
        </div>
      </div>
      <div className="vstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>Project summary</b><FpItemsTable items={fp.items} /></div>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Technical detail</b>
        {real.map(it => (
          <div key={it.no} className="hstack" style={{ gap: 14, padding: 14, border: '1px solid var(--border)', borderRadius: 12, alignItems: 'flex-start' }}>
            <img src={IMG[it.photo || e.photo]} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover' }} />
            <div className="vstack" style={{ gap: 10, flex: 1 }}>
              <div className="between" style={{ flexWrap: 'wrap', gap: 6 }}><b style={{ fontSize: 13.5 }}>{it.no}. {it.name}</b><span className="hstack" style={{ gap: 6 }}><Tag tone="grey" icon={<IconRuler size={13} />}>{it.size}</Tag><Tag tone="grey">Qty {it.qty}</Tag></span></div>
              <span className="small t2">{it.product} · {it.work}</span>
              <div className="grid-3" style={{ rowGap: 8 }}>{it.spec.map(([k, val]) => <div key={k} className="vstack" style={{ gap: 2 }}><span className="tiny muted">{k}</span><span style={{ fontSize: 12.5, fontWeight: 600 }}>{val}</span></div>)}</div>
            </div>
          </div>
        ))}
      </div>
      {fp.notes && <div className="alert info small"><IconInfoCircle size={16} />{fp.notes}</div>}
    </div>
  );
}

function OldSurveyReport({ e }: { e: EnquiryX }) {
  const v = e.survey!;
  const s = staffById(v.surveyor);
  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="grid-4" style={{ rowGap: 14 }}>
        {[['Surveyor', s?.name || '—'], ['Date', `${fmtDate(v.date)} · ${v.time}`], ['Requested by', v.requestedBy], ['Status', v.status === 'Completed' ? `Completed ${v.completedOn || ''}` : 'Booked'], ['Access', v.access || '—'], ['Parking', v.parking || '—'], ['Photos', v.photos ? `${v.photos} photos` : '—'], ['Customer signature', v.signed ? 'Signed' : v.status === 'Completed' ? 'Not signed' : '—']].map(([l, val]) => (
          <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>
        ))}
      </div>
      {v.openings && (
        <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
          <thead><tr><th>Ref</th><th>Room</th><th>Product</th><th>Size (W × H mm)</th><th>Qty</th><th>Notes</th></tr></thead>
          <tbody>{v.openings.map(o => <tr key={o.ref}><td className="b">{o.ref}</td><td>{o.room}</td><td>{o.type}</td><td>{o.w} × {o.h}</td><td>{o.qty}</td><td className="t2">{o.notes || '—'}</td></tr>)}</tbody>
        </table>
      )}
      {v.notes && <div className="alert info small"><IconInfoCircle size={16} />{v.notes}</div>}
    </div>
  );
}

/* ---------- Framepoint quote document (what the customer receives) ---------- */
export function QuoteDoc({ e, q }: { e: EnquiryX; q: Pick<Quote, 'ref' | 'lines' | 'discount' | 'sentOn' | 'validUntil' | 'sentBy'> & { fp?: boolean } }) {
  const [detail, setDetail] = useState(false);
  const t = quoteTotals(q);
  const fpItems = e.survey?.fp?.items || [];
  const r = { textAlign: 'right' as const };
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div className="between" style={{ background: 'var(--deep)', color: '#fff', padding: '16px 20px' }}>
        <span className="hstack" style={{ gap: 10 }}><img src="images/mark.svg" alt="" style={{ height: 30 }} /><span className="vstack" style={{ gap: 1 }}><b style={{ fontSize: 15 }}>Jadeite Glazing</b><span className="tiny" style={{ color: '#9fc7bc' }}>Produced using Framepoint® Technology</span></span></span>
        <span className="vstack" style={{ gap: 2, textAlign: 'right' }}><b style={{ fontSize: 16 }}>Quotation {q.ref}</b><span className="tiny" style={{ color: '#9fc7bc' }}>Date {q.sentOn} · valid until {q.validUntil}</span></span>
      </div>
      <div className="grid-3" style={{ padding: '16px 20px', gap: 20 }}>
        <div className="vstack" style={{ gap: 3 }}><span className="tiny muted">QUOTATION FOR</span><b>{e.name}</b><span className="small t2">{e.phone}</span><span className="small t2">{e.email}</span></div>
        <div className="vstack" style={{ gap: 3 }}><span className="tiny muted">SITE ADDRESS</span><b>{e.address}</b><span className="small t2">{e.postcode}</span></div>
        <div className="vstack" style={{ gap: 3 }}><span className="tiny muted">PREPARED BY</span><b>{q.sentBy}</b><span className="small t2">Jadeite Glazing · 0116 496 0000</span></div>
      </div>
      {q.fp && <div className="small t2" style={{ padding: '0 20px 14px' }}><b style={{ color: 'var(--text)' }}>Notes: </b>Lead time {e.survey?.fp?.leadTime || '6 weeks'} · {e.survey?.fp?.guarantee || '10 years'} guarantee. {e.survey?.fp?.notes}</div>}
      <table className="tbl">
        <thead><tr><th>Item</th>{q.fp && <th>Work type</th>}<th>Product</th><th style={r}>Qty</th><th style={r}>{q.fp ? 'Each (inc. VAT)' : 'Unit price'}</th><th style={r}>{q.fp ? 'Total (inc. VAT)' : 'Total'}</th></tr></thead>
        <tbody>{q.lines.map((l, i) => <tr key={i}><td><b style={{ fontSize: 13 }}>{l.item}</b>{l.size && <div className="tiny muted">{l.size}</div>}</td>{q.fp && <td className="t2">{l.work || '—'}</td>}<td className="t2">{l.spec}</td><td style={r}>{l.qty}</td><td style={r}>{gbp(l.unit)}</td><td className="b" style={r}>{gbp(l.qty * l.unit)}</td></tr>)}</tbody>
      </table>
      {q.fp && fpItems.length > 0 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)' }}>
          <button className="link small" onClick={() => setDetail(!detail)}>{detail ? 'Hide technical detail' : 'Show technical detail'}</button>
          {detail && <div className="vstack" style={{ gap: 10, marginTop: 10 }}>{realItems(fpItems).map(it => (
            <div key={it.no} className="vstack" style={{ gap: 6, paddingBottom: 10, borderBottom: '1px dashed var(--border)' }}>
              <b style={{ fontSize: 12.5 }}>{it.no}. {it.name} · {it.product} · internal {it.size}</b>
              <span className="tiny t2">{it.spec.map(([k, val]) => `${k}: ${val}`).join(' · ')}</span>
            </div>
          ))}</div>}
        </div>
      )}
      <div className="hstack" style={{ padding: '14px 20px', gap: 20, alignItems: 'flex-start', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div className="vstack small t2" style={{ gap: 4, flex: 1, minWidth: 240 }}>
          <b style={{ color: 'var(--text)' }}>Payment terms</b>
          {q.fp ? <>
            <span>50% deposit on acceptance · {gbp(t.deposit)}</span>
            <span>40% seven days before installation · {gbp(t.stage)}</span>
            <span>10% on completion · {gbp(t.completion)}</span>
            <span className="tiny muted" style={{ marginTop: 6 }}>FENSA registered (no. 44247) · Kent Trading Standards Checked Trader K0974</span>
          </> : <>
            <span>10-year guarantee · FENSA certificate · removal of old frames</span>
            <span>Deposit of {t.depositPct}% on acceptance. Balance on completion.</span>
          </>}
        </div>
        <div className="vstack" style={{ gap: 6, minWidth: 240 }}>
          {q.discount > 0 && <span className="between small"><span className="t2">Discount</span><b>−{gbp(q.discount)}</b></span>}
          {q.fp ? <>
            <span className="between" style={{ paddingTop: 2 }}><b>Final price inc. VAT</b><b style={{ fontSize: 18 }}>{gbp(t.total)}</b></span>
            <span className="between small"><span className="t2">of which VAT 20%</span><b>{gbp(t.vat)}</b></span>
          </> : <>
            <span className="between small"><span className="t2">Subtotal</span><b>{gbp(t.sub)}</b></span>
            <span className="between small"><span className="t2">VAT 20%</span><b>{gbp(t.vat)}</b></span>
            <span className="between" style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}><b>Total</b><b style={{ fontSize: 18 }}>{gbp(t.total)}</b></span>
          </>}
          <span className="between small"><span className="t2">Deposit ({t.depositPct}%)</span><b style={{ color: 'var(--primary-dark)' }}>{gbp(t.deposit)}</b></span>
        </div>
      </div>
    </div>
  );
}

/* ---------- 4. Send quote for customer review → Quote sent ---------- */
export function SendQuoteModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const sentBy = staffById(e.assigned)?.name || ME;
  const [fp] = useState<FPSurvey>(() => e.survey?.fp || makeFpSurvey(guessOpeningsFor(e.product), sentBy, todayShort()));
  const lines = linesFromFp(fp.items);
  const q = { ref: fp.ref, lines, discount: 0, fp: true, sentOn: todayShort(), validUntil: fmtDate(addDays(TODAY, 30), { day: '2-digit', month: 'short' }), sentBy };
  const t = quoteTotals(q);
  const [withReport, setWithReport] = useState(true);
  const [msg, setMsg] = useState(`Dear ${e.name},\n\nThank you for letting us visit. Attached is your quotation ${fp.ref} (${gbp(t.total)} including VAT) and the survey report with every size we measured.\n\nPlease have a look and check the details. You can accept the quote online, or simply reply to this email with any questions.\n\nKind regards,\n${sentBy}\nJadeite Glazing`);
  const files = [fp.quoteFile, ...(withReport ? [fp.file] : [])];
  const save = () => {
    updEnq(e.id, { stage: 'Quote Sent', stageDays: 0, value: t.total, quote: { ...q, status: 'Sent', files }, next: 'Wait for the customer to reply', nextDue: fmtDate(addDays(TODAY, 3)) },
      { kind: 'email-out', title: `Your Jadeite quote ${fp.ref} — please review`, body: `${msg}\n\nAttached: ${files.join(', ')}`, who: sentBy });
    set('tasks', ts => [{ id: 'tk' + Date.now(), title: `Follow up quote ${fp.ref} with ${e.name}`, owner: e.assigned || 'mh', due: addDays(TODAY, 3), enq: e.id, done: false }, ...ts]);
    toast(`Quote ${fp.ref} sent · follow-up task set for ${fmtDate(addDays(TODAY, 3))} · moved to Quote sent`);
    onDone?.('quote'); onClose();
  };
  return (
    <Modal title="Send the quote for customer review" sub={`From Framepoint quote ${fp.ref} · ${e.name} · ${e.email}`} onClose={onClose} width={880} footer={<Foot onClose={onClose} onSave={save} label={`Send for review · ${gbp(t.total)}`} icon={<IconSend size={16} />} />}>
      <div className="alert ok small"><IconCircleCheck size={16} /><div>The sizes and prices come straight from the survey in Framepoint. To change anything, change it in Framepoint and add the survey again.</div></div>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Attachments</b>
        <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
          <FileChip name={fp.quoteFile} sub="Quotation · always sent" />
          {withReport && <FileChip name={fp.file} sub="Survey report · for them to check" />}
        </div>
        <Check on={withReport} onChange={setWithReport} label="Also send the survey report so the customer can check the sizes" />
      </div>
      <Field label="Email to the customer"><textarea className="textarea" style={{ minHeight: 170 }} value={msg} onChange={x => setMsg(x.target.value)} /></Field>
      <b style={{ fontSize: 13 }}>What the customer will see</b>
      <QuoteDoc e={{ ...e, survey: e.survey ? { ...e.survey, fp } : e.survey }} q={q} />
      <Check on label="Let the customer accept the quote online" />
    </Modal>
  );
}

/* ---------- 7c. Book the final survey (after Won) ---------- */
export function BookFinalSurveyModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [who, setWho] = useState(e.finalSurvey?.surveyor || 'ps');
  const [date, setDate] = useState(e.finalSurvey?.date || addDays(TODAY, 3));
  const [time, setTime] = useState(e.finalSurvey?.time || '09:00 – 10:30');
  const items = e.survey?.fp ? realItems(e.survey.fp.items) : [];
  const save = () => {
    const s = staffById(who)!;
    updEnq(e.id, { finalSurvey: { surveyor: who, date, time, status: 'Booked' }, next: 'Final survey visit', nextDue: fmtDate(date) },
      { kind: 'email-out', title: 'Your final survey is booked', body: `Dear ${e.name}, ${s.name} will visit on ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} (${time}) to check the exact sizes before we order. It takes about an hour.`, who: ME });
    set('surveys', ss => [{ id: 'SV-' + (312 + ss.length), job: e.id, customer: e.name, address: e.address, date: fmtDate(date), time, surveyor: who, status: 'Booked', tone: 'info', photo: e.photo }, ...ss]);
    set('appts', as => [...as, { id: 'ap' + Date.now(), kind: 'Survey', customer: e.name, who, date, time, address: e.address, synced: true, status: 'Booked' }]);
    toast(`Final survey booked with ${s.name} · ${fmtDate(date)}`);
    onDone?.('final'); onClose();
  };
  return (
    <Modal title="Book the final survey" sub={`${e.name} · ${e.address} · the surveyor checks every size before we order`} onClose={onClose} width={660} footer={<Foot onClose={onClose} onSave={save} label="Book final survey" icon={<IconRulerMeasure size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} /><div>{e.survey?.fp?.by || 'The salesperson'} measured {frameCount(e.survey?.fp?.items || [])} frame{frameCount(e.survey?.fp?.items || []) === 1 ? '' : 's'} in Framepoint. The surveyor now checks them on site, so the order is exactly right.</div></div>
      <Field label="Which surveyor?"><PickPerson people={surveyors} value={who} onChange={setWho} load={{ ps: 'Leeds and Harrogate · 3 surveys this week', rk: 'Ripon and Thirsk · 2 surveys this week' }} /></Field>
      <div className="grid-2">
        <Field label="Date"><input type="date" className="input" value={date} onChange={x => setDate(x.target.value)} /></Field>
        <Field label="Time"><select className="select" value={time} onChange={x => setTime(x.target.value)}>{['09:00 – 10:30', '11:00 – 12:30', '13:30 – 15:00', '15:30 – 17:00'].map(x => <option key={x}>{x}</option>)}</select></Field>
      </div>
      {items.length > 0 && <span className="small t2">To check: {items.map(i => `${i.no}. ${i.name} (${i.size})`).join(' · ')}</span>}
      <Check on label="Email the customer and put it on the surveyor's phone" />
    </Modal>
  );
}

/* ---------- 7d. Final survey done — check the sizes ---------- */
export function FinalSurveyModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const fs = e.finalSurvey!;
  const s = staffById(fs.surveyor);
  const [checks, setChecks] = useState<FinalCheck[]>(() => (e.survey?.fp ? realItems(e.survey.fp.items) : []).map(i => ({ no: i.no, name: i.name, sales: i.size || '', checked: i.size || '', ok: true })));
  const [notes, setNotes] = useState('');
  const [signed, setSigned] = useState(true);
  const changed = checks.filter(c => c.checked.replace(/\s/g, '') !== c.sales.replace(/\s/g, '')).length;
  const save = () => {
    const final = checks.map(c => ({ ...c, ok: c.checked.replace(/\s/g, '') === c.sales.replace(/\s/g, '') }));
    updEnq(e.id, { finalSurvey: { ...fs, status: 'Done', checks: final, notes: notes || (changed ? `${changed} size${changed > 1 ? 's' : ''} changed.` : 'All sizes confirmed.'), signed, doneOn: todayShort() }, next: changed ? 'Revise quote in Framepoint' : 'Contract & financial readiness', nextDue: 'Today' },
      { kind: 'note', title: `Final survey done · ${changed ? `${changed} size${changed > 1 ? 's' : ''} changed` : 'all sizes match'}`, body: `${final.length} item${final.length === 1 ? '' : 's'} checked on site.${changed ? ' The order will use the surveyor’s sizes.' : ''} ${notes}`.trim(), who: s?.name || 'Surveyor' });
    set('surveys', ss => ss.map(x => (x.job === e.id ? { ...x, status: 'Approved', tone: 'ok' } : x)));
    toast(changed ? `Final survey saved · ${changed} size${changed > 1 ? 's' : ''} updated for the order` : 'Final survey saved · all sizes match');
    onDone?.('final'); onClose();
  };
  return (
    <Modal title="Final survey results" sub={`Filled in by ${s?.name || 'the surveyor'} on their phone · ${e.name}`} onClose={onClose} width={820} footer={<Foot onClose={onClose} onSave={save} label="Save final survey" icon={<IconCircleCheck size={16} />} />}>
      <span className="small t2">Compare each size with what the salesperson measured in Framepoint. Change any size that is different.</span>
      <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
        <thead><tr><th style={{ width: 34 }}>#</th><th>Item</th><th>Salesperson measured</th><th>Surveyor measured</th><th>Result</th></tr></thead>
        <tbody>{checks.map((c, i) => {
          const same = c.checked.replace(/\s/g, '') === c.sales.replace(/\s/g, '');
          return (
            <tr key={c.no}>
              <td className="b">{c.no}</td><td><b style={{ fontSize: 13 }}>{c.name}</b></td><td className="t2">{c.sales}</td>
              <td><input className="input" style={{ height: 32, width: 160 }} value={c.checked} aria-label={`Checked size of item ${c.no}`} onChange={x => setChecks(cs => cs.map((y, j) => (j === i ? { ...y, checked: x.target.value } : y)))} /></td>
              <td>{same ? <Tag tone="ok">Matches</Tag> : <Tag tone="warn">Changed</Tag>}</td>
            </tr>
          );
        })}</tbody>
      </table>
      {changed > 0 ? <div className="alert warn small"><IconAlertTriangle size={16} /><div><b>{changed} size{changed > 1 ? 's are' : ' is'} different.</b> The order will use the surveyor’s sizes. If the price changes, update the quote in Framepoint.</div></div>
        : <div className="alert ok small"><IconCircleCheck size={16} />All sizes match the Framepoint survey.</div>}
      <Field label="Notes for the office and fitters (optional)"><input className="input" value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Lintel above the kitchen window needs checking" /></Field>
      <Check on={signed} onChange={setSigned} label="Customer has signed the final survey on the surveyor's phone" />
    </Modal>
  );
}

/* ---------- Final survey tab ---------- */
export function FinalSurveyView({ e }: { e: EnquiryX }) {
  const fs = e.finalSurvey!;
  const s = staffById(fs.surveyor);
  const changed = (fs.checks || []).filter(c => !c.ok).length;
  return (
    <div className="vstack" style={{ gap: 16 }}>
      <div className="between"><b>Final survey</b><Tag tone={fs.status === 'Done' ? 'ok' : 'info'}>{fs.status === 'Done' ? 'Done' : 'Booked'}</Tag></div>
      <div className="grid-4" style={{ rowGap: 14 }}>
        {[['Surveyor', s?.name || '—'], ['Date', fmtDate(fs.date, { weekday: 'short', day: 'numeric', month: 'short' })], ['Time', fs.time], ['Result', fs.status === 'Done' ? (changed ? `${changed} size${changed > 1 ? 's' : ''} changed` : 'All sizes match') : 'Waiting for the visit'], ['Customer signature', fs.status === 'Done' ? (fs.signed ? 'Signed' : 'Not signed') : '—'], ['Done on', fs.doneOn || '—']].map(([l, val]) => (
          <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>
        ))}
      </div>
      {fs.status === 'Booked' && <div className="alert warn small"><IconClock size={16} />Booked — waiting for {s?.name} to visit and check every size. Then press “Final survey done” at the top.</div>}
      {fs.checks && fs.checks.length > 0 && (
        <table className="tbl" style={{ border: '1px solid var(--border)', borderRadius: 10 }}>
          <thead><tr><th style={{ width: 34 }}>#</th><th>Item</th><th>Salesperson measured</th><th>Surveyor measured</th><th>Result</th></tr></thead>
          <tbody>{fs.checks.map(c => <tr key={c.no}><td className="b">{c.no}</td><td className="b">{c.name}</td><td className="t2">{c.sales}</td><td className="b">{c.checked}</td><td>{c.ok ? <Tag tone="ok">Matches</Tag> : <Tag tone="warn">Changed</Tag>}</td></tr>)}</tbody>
        </table>
      )}
      {fs.notes && fs.status === 'Done' && <div className="alert info small"><IconInfoCircle size={16} />{fs.notes}</div>}
    </div>
  );
}

/* ---------- 6. Customer replied → Follow-up ---------- */
export function ReplyModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [mood, setMood] = useState('Happy to go ahead');
  const [text, setText] = useState('Thank you for the quote — we would like to go ahead. When could you fit?');
  const save = () => {
    updEnq(e.id, { stage: 'Follow-up', stageDays: 0, quote: e.quote ? { ...e.quote, reply: text } : e.quote, next: 'Decide: won or lost', nextDue: 'Today' },
      { kind: 'email-in', title: `Re: Your quote ${e.quote?.ref || ''} · ${mood}`, body: text, who: e.name });
    set('tasks', ts => ts.map(t => (t.enq === e.id && t.title.startsWith('Follow up quote') ? { ...t, done: true } : t)));
    toast('Reply saved · moved to Follow-up');
    onDone?.('comms'); onClose();
  };
  return (
    <Modal title="The customer replied" sub={`${e.name} · quote ${e.quote?.ref}`} onClose={onClose} width={600} footer={<Foot onClose={onClose} onSave={save} label="Save reply" icon={<IconMail size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} />In the live system, replies to the quote email arrive here by themselves and the card moves to Follow-up automatically.</div>
      <Field label="What did they say?"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{['Happy to go ahead', 'Has questions', 'Not interested'].map(m => <button key={m} type="button" className={`chip ${mood === m ? 'on' : ''}`} onClick={() => setMood(m)}>{m}</button>)}</div></Field>
      <Field label="Their message"><textarea className="textarea" style={{ minHeight: 120 }} value={text} onChange={x => setText(x.target.value)} /></Field>
    </Modal>
  );
}

/* ---------- 7a. Mark as Won ---------- */
export function WonModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const t = e.quote ? quoteTotals(e.quote) : null;
  const inv = 'INV-' + (3400 + Math.abs(e.id.split('-')[1].charCodeAt(0) + +e.id.slice(-2)));
  const [state, setState] = useState<'unpaid' | 'checking' | 'paid'>(e.ops?.deposit ? 'paid' : 'unpaid');
  const [sent, setSent] = useState(false);
  const check = () => { setState('checking'); window.setTimeout(() => setState('paid'), 900); };
  const save = () => {
    updEnq(e.id, x => ({ stage: 'Won', stageDays: 0, wonOn: fmtDate(TODAY, { day: '2-digit', month: 'short' }), quote: x.quote ? { ...x.quote, status: 'Accepted' } : x.quote, invite: x.invite || { status: 'Not invited' }, ops: { ...(x.ops || {}), deposit: { inv, amount: t?.deposit || 0, on: fmtDate(TODAY, { day: '2-digit', month: 'short' }) } }, next: 'Check documents and deposit', nextDue: 'Today' }),
      { kind: 'system', title: `Marked as Won${t ? ` · ${gbp(t.total)}` : ''}`, body: `Quote ${e.quote?.ref || ''} accepted. Deposit ${t ? gbp(t.deposit) : ''} paid (${inv}, matched in Xero). Handed to the office.`, who: staffById(e.assigned)?.name || ME });
    set('tasks', ts => ts.map(t => (t.enq === e.id ? { ...t, done: true } : t)));
    toast('Won · the office has been told');
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Mark as Won" sub={`${e.name} · ${e.product}`} onClose={onClose} width={580} footer={<Foot onClose={onClose} onSave={save} disabled={state !== 'paid'} label="Mark as Won" icon={<IconTrophy size={16} />} />}>
      <div className="hstack" style={{ gap: 14, padding: 14, background: 'var(--tint)', borderRadius: 12 }}>
        <IconTrophy size={30} color="#1f9d5b" />
        <div className="vstack" style={{ gap: 3 }}><b style={{ fontSize: 15 }}>The customer accepted the quote.</b><span className="small t2">{e.quote ? `Quote ${e.quote.ref} · ${gbp(t!.total)} inc. VAT` : 'No quote on file'}</span></div>
      </div>
      <div className="card" style={{ padding: 14, gap: 10, background: 'var(--bg)' }}>
        <span className="hstack" style={{ gap: 8 }}><span className="avatar" style={{ width: 26, height: 26, background: '#13b5ea', color: '#fff', fontSize: 11 }}>X</span><b style={{ fontSize: 13 }}>Deposit in Xero</b></span>
        <div className="between small"><span className="t2">{inv} · {t?.depositPct ?? 50}% deposit</span><span className="hstack" style={{ gap: 8 }}><b>{t ? gbp(t.deposit) : '—'}</b>{state === 'paid' ? <Tag tone="ok">Paid · matched</Tag> : state === 'checking' ? <Tag tone="info">Checking…</Tag> : <Tag tone="warn">{sent ? 'Invoice sent · not paid yet' : 'Not paid yet'}</Tag>}</span></div>
        {state !== 'paid' && <div className="hstack" style={{ gap: 8 }}>{!sent && <button className="btn btn-outline btn-sm" onClick={() => { setSent(true); toast(`Deposit invoice ${inv} sent to ${e.email}`); }}><IconSend size={14} />Send deposit invoice</button>}<button className="btn btn-dark btn-sm" disabled={state === 'checking'} onClick={check}>Check Xero for payment</button></div>}
      </div>
      {state !== 'paid' ? <div className="alert warn small"><IconAlertTriangle size={16} />You can mark it Won once the deposit shows as paid in Xero.</div>
        : <div className="alert info small"><IconInfoCircle size={16} />When you save, the office is told. They check the documents and deposit, then book the final survey.</div>}
    </Modal>
  );
}

/* ---------- 7b. Mark as Lost ---------- */
export function LostModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const [why, setWhy] = useState('');
  const [note, setNote] = useState('');
  const save = () => {
    updEnq(e.id, { stage: 'Lost', stageDays: 0, lostReason: note ? `${why} — ${note}` : why, quote: e.quote ? { ...e.quote, status: 'Declined' } : e.quote, next: why, nextDue: '—' },
      { kind: 'system', title: `Marked as Lost · ${why}`, body: note, who: staffById(e.assigned)?.name || ME });
    set('tasks', ts => ts.map(t => (t.enq === e.id ? { ...t, done: true } : t)));
    set('appts', as => as.filter(a => !(a.customer === e.name && a.status === 'Booked')));
    toast('Marked as Lost · reason saved for the reports');
    onDone?.('comms'); onClose();
  };
  return (
    <Modal title="Mark as Lost" sub={`${e.name} · ${e.product}`} onClose={onClose} width={560} footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-danger" disabled={!why} style={{ opacity: why ? 1 : 0.45 }} onClick={save}><IconX size={16} />Mark as Lost</button></>}>
      <Field label="Why was it lost? (required)"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{['Price — chose a cheaper quote', 'Went with another company', 'Not going ahead for now', 'No reply after follow-ups', 'Other'].map(m => <button key={m} type="button" className={`chip ${why === m ? 'on' : ''}`} onClick={() => setWhy(m)}>{m}</button>)}</div></Field>
      <Field label="Anything else? (optional)"><textarea className="textarea" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Might come back in the spring" /></Field>
    </Modal>
  );
}

/* ---------- 8. Review and invite the customer ---------- */
export function InviteModal({ e, onClose, onDone, resend }: P & { resend?: boolean }) {
  const toast = useToast();
  const { updEnq } = useStore();
  const t = e.quote ? quoteTotals(e.quote) : null;
  const checks: [string, string, boolean][] = [
    ['Customer details', `${e.name} · ${e.phone} · ${e.email}`, true],
    ['Appointment', e.appt ? `${fmtDate(e.appt.date)} · ${e.appt.outcome || e.appt.type}` : 'No appointment', !!e.appt],
    ['Framepoint survey', e.survey?.fp ? `${e.survey.fp.ref} · measured by ${e.survey.fp.by} · ${frameCount(e.survey.fp.items)} frames` : e.survey?.status === 'Completed' ? `Completed by ${staffById(e.survey.surveyor)?.name}` : 'Not added', !!e.survey?.fp || e.survey?.status === 'Completed'],
    ['Quote accepted', e.quote ? `${e.quote.ref} · ${gbp(t!.total)}` : 'No quote', e.quote?.status === 'Accepted'],
    ['Final survey', e.finalSurvey?.status === 'Done' ? `Checked by ${staffById(e.finalSurvey.surveyor)?.name} on ${e.finalSurvey.doneOn} · ${(e.finalSurvey.checks || []).filter(c => !c.ok).length ? `${(e.finalSurvey.checks || []).filter(c => !c.ok).length} size(s) changed` : 'all sizes match'}` : 'Not done yet', e.finalSurvey?.status === 'Done'],
    ['Deposit invoice', t ? `${t.depositPct}% · ${gbp(t.deposit)} sent from Xero` : '—', !!t],
  ];
  const save = () => {
    updEnq(e.id, x => ({ invite: { status: 'Invited', sentOn: fmtDate(TODAY, { day: '2-digit', month: 'short' }) }, next: x.jobId ? x.next : 'Create order & delivery', nextDue: x.jobId ? x.nextDue : 'Today' }),
      { kind: 'email-out', title: resend ? 'Reminder: your Jadeite portal invite' : 'Welcome to Jadeite — follow your job online', body: `Dear ${e.name}, thank you for choosing Jadeite Glazing. Use the button in this email to see your dates, documents and payments. You sign in with your email and a one-time code — no password needed.`, who: ME });
    toast(resend ? 'Invite sent again' : `Portal invite sent to ${e.email}`);
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title={resend ? 'Resend portal invite' : 'Review and invite the customer'} sub={resend ? `${e.name} has not joined yet` : 'Check everything before the customer is invited'} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} label={resend ? 'Send invite again' : 'Everything is right — send invite'} icon={<IconWorld size={16} />} />}>
      {!resend && (
        <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
          {checks.map(([l, v, ok]) => <div key={l} className="hstack" style={{ gap: 12, padding: '12px 0' }}>{ok ? <IconCircleCheck size={20} color="#1f9d5b" /> : <IconAlertTriangle size={20} color="#e0a100" />}<div className="vstack" style={{ gap: 2 }}><b style={{ fontSize: 13 }}>{l}</b><span className="small t2">{v}</span></div></div>)}
        </div>
      )}
      <div className="card" style={{ padding: 16, gap: 8, background: 'var(--bg)' }}>
        <span className="tiny muted">EMAIL TO {e.email.toUpperCase()}</span>
        <b>Welcome to Jadeite — follow your job online</b>
        <span className="small t2">Dear {e.name}, thank you for choosing Jadeite Glazing. Click below to see your dates, documents and payments. You sign in with your email and a one-time code — no password needed.</span>
        <span className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start', pointerEvents: 'none' }}>Open my Jadeite portal</span>
      </div>
    </Modal>
  );
}

// What goes to the vendor: the quote lines without services, with the final survey sizes.
export const orderLines = (e: EnquiryX) => (e.quote?.lines || []).filter(l => !l.service && !l.item.startsWith('Fitting')).map(l => {
  const c = e.finalSurvey?.checks?.find(x => l.item.startsWith(`${x.no}.`));
  return { ...l, size: c?.checked || l.size, changed: !!c && !c.ok };
});

/* ---------- 9. Create order & delivery (makes the job) ---------- */
export function OrderModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, jobs } = useStore();
  const lines = orderLines(e);
  const defSupplier = lines.some(l => /Origin|Korniche/.test(l.spec)) ? 'Origin' : 'Emplas';
  const [supplier, setSupplier] = useState(defSupplier);
  const [ordered, setOrdered] = useState(TODAY);
  const [expected, setExpected] = useState(addDays(TODAY, 10));
  const [deliverTo, setDeliverTo] = useState('Customer address');
  const [paid, setPaid] = useState(true);
  const t = e.quote ? quoteTotals(e.quote) : { total: e.value, deposit: Math.round(e.value * 0.5), depositPct: 50 };
  const frames = lines.reduce((a, l) => a + l.qty, 0);
  const jobId = 'JG-' + (10500 + jobs.length);
  const soRef = 'SO-' + (48240 + jobs.length);
  const items = lines.map(l => `${l.qty} × ${l.item.replace(/^\d+\.\s*/, '').toLowerCase()}`).join(', ');
  let installDate = addDays(expected, 3); const wd = new Date(installDate + 'T12:00:00').getDay(); if (wd === 0) installDate = addDays(installDate, 1); if (wd === 6) installDate = addDays(installDate, 2);
  const save = () => {
    const job: JobX = {
      id: jobId, customer: e.name, initials: e.initials, address: e.address, postcode: e.postcode, phone: e.phone, email: e.email,
      products: items, productList: lines.map(l => ({ name: `${l.qty} × ${l.item.replace(/^\d+\.\s*/, '')}`, qty: l.qty, detail: l.size ? `${l.spec} · ${l.size}` : l.spec, photo: e.photo, ready: 0 })),
      value: t.total, deposit: t.deposit, paid: paid ? t.deposit : 0, stage: 'Ordered', sales: e.assigned || 'mh', surveyor: e.finalSurvey?.surveyor || e.survey?.surveyor || 'ps',
      next: `Wait for ${supplier} to confirm`, owner: 'Sarah M', due: fmtDate(addDays(TODAY, 2)), photo: e.photo, checklist: 45, portal: e.invite?.status || 'Not invited',
      dates: [{ label: 'Final survey', date: e.finalSurvey?.doneOn || e.survey?.completedOn || '—', done: true }, { label: 'Order placed', date: fmtDate(ordered, { day: '2-digit', month: 'short' }), done: true }, { label: 'Delivery due', date: fmtDate(expected, { day: '2-digit', month: 'short' }) }, { label: 'Installation', date: 'Not booked' }],
      history: [{ when: fmtDate(TODAY, { day: '2-digit', month: 'short' }), who: ME, what: `Job created from enquiry ${e.id}. Order ${soRef} placed with ${supplier}.` }],
    };
    set('jobs', js => [job, ...js]);
    set('orders', os => [{ ref: soRef, job: jobId, customer: e.name, supplier, ordered: fmtDate(ordered, { day: '2-digit', month: 'short' }), confirmed: false, expected: fmtDate(expected, { day: '2-digit', month: 'short' }), frames: `0 of ${frames}`, status: 'Not confirmed', tone: 'warn', checks: 5, items, enquiry: e.id }, ...os]);
    set('deliveries', ds => [...ds, { time: '08:00', ref: soRef, customer: e.name, job: jobId, where: town(e.address), status: 'Not confirmed', tone: 'warn', day: fmtDate(expected), items: `${frames} frame${frames > 1 ? 's' : ''}`, photo: e.photo, problem: '' }]);
    set('events', es => [...es, { id: 'un' + Date.now(), team: 'un', date: installDate, days: 2, kind: 'install', title: `${first(e.name)} · needs installer`, sub: `${jobId} · not assigned yet`, photo: e.photo, job: jobId }]);
    updEnq(e.id, x => ({ jobId, ops: { ...(x.ops || {}), delivery: 'Pending' }, next: `Record ${supplier} confirmation`, nextDue: fmtDate(addDays(TODAY, 2)) }),
      { kind: 'system', title: `Order ${soRef} placed with ${supplier}`, body: `${items}. Delivery expected ${fmtDate(expected)} to ${deliverTo.toLowerCase()}. Job ${jobId} created and added to the installation diary (waiting for an installer).`, who: ME });
    toast(`Job ${jobId} created · order sent to ${supplier} · added to the diary`);
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Place the supplier order" sub={`${e.name} · from quote ${e.quote?.ref || ''}`} onClose={onClose} width={720} footer={<Foot onClose={onClose} onSave={save} label="Place order" icon={<IconPackage size={16} />} />}>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Products to order</b>
        <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
          {lines.map((l, i) => <div key={i} className="hstack" style={{ gap: 12, padding: '10px 0' }}><img src={IMG[e.photo]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{l.qty} × {l.item}</b><span className="tiny muted">{l.spec}{l.size ? ` · ${l.size}` : ''}{l.changed ? ' · size from final survey' : ''}</span></div><span className="small b">{gbp(l.qty * l.unit)}</span></div>)}
        </div>
      </div>
      <div className="grid-2">
        <Field label="Vendor"><select className="select" value={supplier} onChange={x => setSupplier(x.target.value)}><option>Emplas</option><option>Origin</option><option>Other</option></select></Field>
        <Field label="Vendor contact"><input className="input" readOnly style={{ background: 'var(--bg)' }} value={supplier === 'Origin' ? 'orders@origin-global.com · 0808 168 5011' : 'orders@emplas.co.uk · 01933 234 100'} /></Field>
        <Field label="Order date"><input type="date" className="input" value={ordered} onChange={x => setOrdered(x.target.value)} /></Field>
        <Field label="Expected delivery"><input type="date" className="input" value={expected} onChange={x => setExpected(x.target.value)} /></Field>
        <Field label="Deliver to"><select className="select" value={deliverTo} onChange={x => setDeliverTo(x.target.value)}><option>Customer address</option><option>Head office workshop</option></select></Field>
        <Field label="Order reference"><input className="input" readOnly style={{ background: 'var(--bg)' }} value={soRef} /></Field>
      </div>
      <Check on={paid} onChange={setPaid} label={`${t.depositPct}% deposit received in Xero (${gbp(t.deposit)})`} />
      <div className="alert info small"><IconInfoCircle size={16} />This creates job <b>&nbsp;{jobId}&nbsp;</b>. It also goes into the Installation diary as “needs installer” for {fmtDate(installDate)} until someone assigns a team.</div>
    </Modal>
  );
}

/* ---------- 10. Vendor confirmed ---------- */
export function VendorConfirmModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, orders, updateJob } = useStore();
  const o = orders.find(x => x.job === e.jobId)!;
  const [conf, setConf] = useState('EMP-' + (77100 + Math.floor(Math.random() * 90)));
  const [date, setDate] = useState(addDays(TODAY, 10));
  const [tell, setTell] = useState(true);
  const save = () => {
    set('orders', os => os.map(x => (x.ref === o.ref ? { ...x, confirmed: true, status: 'Confirmed', tone: 'jade', expected: fmtDate(date, { day: '2-digit', month: 'short' }), confirmRef: conf } : x)));
    set('deliveries', ds => ds.map(x => (x.ref === o.ref ? { ...x, status: 'Confirmed', tone: 'jade', day: fmtDate(date) } : x)));
    updateJob(e.jobId!, { next: `Delivery ${fmtDate(date)}`, due: fmtDate(date) }, `${o.supplier} confirmed order ${o.ref} (${conf}) · delivery ${fmtDate(date)}`);
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), delivery: 'Confirmed' }, next: `Delivery ${fmtDate(date)}`, nextDue: fmtDate(date) }), { kind: 'note', title: `${o.supplier} confirmed the order`, body: `Supplier reference ${conf}. Delivery on ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}. Order acknowledgement saved.${tell ? ' Customer told.' : ''}`, who: ME });
    toast(`Vendor confirmed · delivery ${fmtDate(date)}`);
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Supplier confirmed the order" sub={`${o.ref} · ${o.supplier}`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} label="Save confirmation" icon={<IconCircleCheck size={16} />} />}>
      <div className="grid-2">
        <Field label="Supplier reference"><input className="input" value={conf} onChange={x => setConf(x.target.value)} /></Field>
        <Field label="Confirmed delivery date"><input type="date" className="input" value={date} onChange={x => setDate(x.target.value)} /></Field>
      </div>
      <div className="hstack" style={{ gap: 10 }}><FileChip name={`${o.supplier} acknowledgement ${conf}.pdf`} sub="From the supplier's email" /></div>
      <Check on={tell} onChange={setTell} label="Tell the customer the delivery date (email and portal)" />
    </Modal>
  );
}

/* ---------- 11. Delivered (entered by hand) ---------- */
export function DeliveredModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, orders, updateJob } = useStore();
  const o = orders.find(x => x.job === e.jobId)!;
  const n = o.frames.split(' of ')[1];
  const [checks, setChecks] = useState([true, true, true]);
  const ok = checks.every(Boolean);
  const save = () => {
    set('orders', os => os.map(x => (x.ref === o.ref ? { ...x, status: 'Arrived', tone: 'ok', frames: `${n} of ${n}` } : x)));
    set('deliveries', ds => ds.map(x => (x.ref === o.ref ? { ...x, status: 'Arrived', tone: 'ok', problem: '' } : x)));
    updateJob(e.jobId!, { stage: 'Delivery', next: 'Book installation', due: 'Today' }, `Delivered and checked (${n} frames). Ready to book.`);
    updEnq(e.id, { next: 'Book installation', nextDue: 'Today' }, { kind: 'note', title: 'Delivered and checked', body: `All ${n} frame${n === '1' ? '' : 's'} arrived with no damage. Ready to book installation.`, who: ME });
    toast('Delivered · now ready to book installation');
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Mark as delivered" sub={`${o.ref} · ${o.supplier} · ${n} frames`} onClose={onClose} width={520} footer={<Foot onClose={onClose} onSave={save} disabled={!ok} label="Delivered and checked" icon={<IconTruckDelivery size={16} />} />}>
      <div className="vstack" style={{ gap: 10 }}>
        {[`All ${n} frames arrived`, 'No damage to frames or glass', 'Colours and sizes match the order'].map((l, i) => <Check key={l} on={checks[i]} onChange={v => setChecks(c => c.map((x, j) => (j === i ? v : x)))} label={l} />)}
      </div>
      {!ok && <div className="alert warn small"><IconAlertTriangle size={16} />If something is wrong, report a problem from the Deliveries page instead.</div>}
    </Modal>
  );
}

/* ---------- 12. Snag or aftercare ---------- */
export function AddSnagModal({ e, onClose, onDone, kindDefault }: P & { kindDefault?: 'Snag' | 'Aftercare' }) {
  const toast = useToast();
  const { set, jobs, updEnq, log, updateJob, events } = useStore();
  const j = jobs.find(x => x.id === e.jobId);
  const fit = events.find(x => x.job === e.jobId && x.kind === 'install' && x.team !== 'un');
  const after = fit ? addDays(fit.date, fit.days) : addDays(TODAY, 3);
  const [kind, setKind] = useState<'Snag' | 'Aftercare'>(kindDefault || 'Snag');
  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [sev, setSev] = useState('Minor');
  const [who, setWho] = useState(crewOf(fit)[0] || 'tw');
  const [visit, setVisit] = useState(after > addDays(TODAY, 3) ? after : addDays(TODAY, 3));
  const people = [...getRoster().map(t => ({ id: t.id, label: `${t.name} (installer)` })), ...surveyors.map(s => ({ id: s.id, label: `${s.name} (surveyor)` }))];
  const ownerName = personById(who)?.name || staffById(who)?.name || '';
  const save = () => {
    const id = 'SN-' + (119 + Math.floor(Math.random() * 80));
    set('snags', ss => [{ id, job: e.jobId!, customer: e.name, title, detail, reported: `Office · ${fmtDate(TODAY, { day: '2-digit', month: 'short' })}`, status: 'Open', tone: 'err', severity: sev, photo: e.photo, owner: ownerName, kind }, ...ss]);
    if (personById(who)) set('events', es => [...es, { id: 'sv' + Date.now(), team: 'crew', crew: [who], date: visit, days: 1, kind: 'snag', title: `${first(e.name)} · ${kind.toLowerCase()} visit`, sub: `${e.jobId} · ${title}`, photo: e.photo, job: e.jobId }]);
    if (kind === 'Snag') updateJob(e.jobId!, { stage: 'Snag' as any }); else log(e.jobId!, `Aftercare request: ${title}`);
    updEnq(e.id, {}, { kind: 'note', title: `${kind} logged: ${title}`, body: `${detail} Assigned to ${ownerName}. Visit ${fmtDate(visit)}.`, who: ME });
    toast(`${kind} logged · ${ownerName} · visit ${fmtDate(visit)}`);
    onDone?.('snags'); onClose();
  };
  return (
    <Modal title="Add snag or aftercare" sub={`${e.name} · ${e.jobId}`} onClose={onClose} width={620} footer={<Foot onClose={onClose} onSave={save} disabled={title.trim().length < 3} label="Save and assign" icon={<IconTool size={16} />} />}>
      <Field label="What is it?"><div className="hstack" style={{ gap: 8 }}><button type="button" className={`chip ${kind === 'Snag' ? 'on' : ''}`} onClick={() => setKind('Snag')}>Snag — something to fix from the fitting</button><button type="button" className={`chip ${kind === 'Aftercare' ? 'on' : ''}`} onClick={() => setKind('Aftercare')}>Aftercare — a problem later on</button></div></Field>
      <Field label="Short title"><input className="input" value={title} onChange={x => setTitle(x.target.value)} placeholder="e.g. Window handle is stiff" /></Field>
      <Field label="Details"><textarea className="textarea" value={detail} onChange={x => setDetail(x.target.value)} placeholder="What is wrong and where" /></Field>
      <div className="grid-2">
        <Field label="Assign to"><select className="select" value={who} onChange={x => setWho(x.target.value)}>{people.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></Field>
        <Field label="Visit date"><input type="date" className="input" value={visit} onChange={x => setVisit(x.target.value)} /></Field>
        <Field label="How serious?"><select className="select" value={sev} onChange={x => setSev(x.target.value)}><option>Minor</option><option>Major</option></select></Field>
      </div>
      <Check on label="Tell the customer the visit date (email and portal)" />
    </Modal>
  );
}

