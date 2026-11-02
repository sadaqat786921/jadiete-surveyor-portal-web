// The whole customer journey, from first enquiry to aftercare, in one place.
// stepFor() says where a record is, who has the next step and what that step is.
// The Enquiries board, the Sales pipeline and the enquiry record all use it, so
// a button pressed anywhere moves the card everywhere.
import React, { useState } from 'react';
import {
  IconArrowsSplit, IconRefresh, IconUserPlus, IconSend, IconCalendarEvent, IconNotes, IconPlugConnected, IconFileInvoice, IconMessageReply, IconTrophy,
  IconFileCheck, IconRulerMeasure, IconPencil, IconShieldCheck, IconChecklist, IconPackage, IconCircleCheck, IconTruckDelivery, IconPackageImport,
  IconAlertTriangle, IconCalendarPlus, IconFolderShare, IconHammer, IconClipboardCheck, IconTool, IconLock, IconCurrencyPound, IconHeartHandshake,
  IconInfoCircle, IconCamera, IconSignature, IconPlus, IconTrash, IconBellRinging, IconUserCheck,
} from '@tabler/icons-react';
import { Modal, Field, Check, Tag, useToast, Avatar } from './ui';
import { staffById, teamById, teams, IMG, gbp } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, EnquiryX, DiaryEvent } from '../data/store';
import { quoteTotals, DeliveryStatus } from '../data/lifecycle';
import { fpTotals } from '../data/framepoint';
import {
  Foot, ME, P, FileChip, ContactModal, BookApptModal, FramepointSurveyModal, SendQuoteModal, ReplyModal, WonModal, LostModal, InviteModal, OrderModal,
  VendorConfirmModal, AddSnagModal, BookFinalSurveyModal, FinalSurveyModal, orderLines,
} from './Lifecycle';
import { AssignModal } from './Forms';
import { BookInstallModal, InstallerPicker } from './Booking';
import { crewTeam, crewOf, busyWith, joinNames, personById } from '../data/crew';
import { RouteModal } from '../pages/Enquiries';

export type Role = 'Office' | 'Sales' | 'Surveyor' | 'Installer' | 'Director';
export type Step = { key: string; label: string; icon: React.ReactNode; hint: string; role: Role; status: string; phase: string; wait?: boolean };
export type Snag = { id: string; job: string; status: string; kind: 'Snag' | 'Aftercare'; title: string; tone: string; owner: string };
export type JourneyCtx = { events: DiaryEvent[]; snags: Snag[] };

// Columns of the Enquiries board (the whole journey). The Sales pipeline uses the first six plus Won and Lost.
export const PHASES: { id: string; label: string; color: string }[] = [
  { id: 'new', label: 'New enquiry', color: '#00c7a1' },
  { id: 'qual', label: 'Qualification', color: '#0b6e5c' },
  { id: 'appt', label: 'Appointment', color: '#00c7a1' },
  { id: 'prep', label: 'Quote preparation', color: '#0b6e5c' },
  { id: 'sent', label: 'Quote sent & follow-up', color: '#00c7a1' },
  { id: 'won', label: 'Won · pre-order checks', color: '#0b6e5c' },
  { id: 'order', label: 'Ordered & in production', color: '#00c7a1' },
  { id: 'ready', label: 'Delivered · ready to book', color: '#0b6e5c' },
  { id: 'install', label: 'Installation', color: '#00c7a1' },
  { id: 'review', label: 'Snags & final review', color: '#e0a100' },
  { id: 'pay', label: 'Closed · final payment', color: '#0b6e5c' },
  { id: 'after', label: 'Aftercare', color: '#00c7a1' },
  { id: 'lost', label: 'Lost', color: '#d64545' },
];
export const roleTone: Record<Role, string> = { Office: 'warn', Sales: 'jade', Surveyor: 'grey', Installer: 'grey', Director: 'jade' };

const I = (C: any) => <C size={16} />;
const short = (d: string) => fmtDate(d, { day: '2-digit', month: 'short' });
const todayShort = () => short(TODAY);
export const openSnags = (e: EnquiryX, snags: Snag[], kind: 'Snag' | 'Aftercare' = 'Snag') => snags.filter(x => e.jobId && x.job === e.jobId && (x.kind || 'Snag') === kind && x.status !== 'Fixed');
export const installOf = (e: EnquiryX, events: DiaryEvent[]) => events.filter(ev => e.jobId && ev.job === e.jobId && ev.kind === 'install' && ev.team !== 'un').sort((x, y) => (x.date < y.date ? 1 : -1))[0];

export function stepFor(e: EnquiryX, ctx: JourneyCtx): Step {
  const s = staffById(e.assigned);
  const fn = s?.name.split(' ')[0] || 'Sales';
  if (e.type !== 'Sales') return { phase: 'new', key: 'route', label: 'Route it', icon: I(IconArrowsSplit), role: 'Office', status: `${e.type} · not a new sale`, hint: 'This is not a new sale. Send it to the right person.' };
  if (e.stage === 'Lost') return { phase: 'lost', key: 'reopen', label: 'Reopen enquiry', icon: I(IconRefresh), role: 'Sales', status: e.lostReason || 'Lost', hint: `Lost: ${e.lostReason || e.next}. Reopen it if the customer comes back.`, wait: true };
  if (!s) return { phase: 'new', key: 'assign', label: 'Assign salesperson', icon: I(IconUserPlus), role: 'Office', status: 'Nobody assigned yet', hint: 'Check it is not an existing customer, then choose who handles it. Give them a next action and a due date.' };
  switch (e.stage) {
    case 'New Enquiry': return { phase: 'new', key: 'contact', label: 'Contact customer', icon: I(IconSend), role: 'Sales', status: `${fn} to email or call`, hint: `${fn} emails or calls ${e.name}. As soon as they do, the card moves to Qualification.` };
    case 'Qualification': return { phase: 'qual', key: 'appt', label: 'Book appointment', icon: I(IconCalendarEvent), role: 'Sales', status: 'Finding out what they need', hint: 'Clarify what the customer needs, then book the sales appointment (synced to Outlook). If it goes nowhere, mark it Lost with a reason.' };
    case 'Appointment': return e.appt?.status === 'Booked'
      ? { phase: 'appt', key: 'apptDone', label: 'Appointment done — add notes', icon: I(IconNotes), role: 'Sales', status: `Visit ${fmtDate(e.appt.date)} · ${e.appt.time.split(' ')[0]}`, hint: `${fn} visits, talks through products and takes the first measurements. Afterwards, add the notes here. The card moves to Quote preparation.` }
      : { phase: 'appt', key: 'appt', label: 'Book appointment', icon: I(IconCalendarEvent), role: 'Sales', status: 'No visit booked', hint: 'Book the sales appointment.' };
    case 'Quote Preparation': return e.survey?.fp
      ? { phase: 'prep', key: 'quote', label: 'Send quote', icon: I(IconFileInvoice), role: 'Sales', status: `Quote ${e.survey.fp.ref} ready`, hint: 'The Framepoint quote is linked. Send it, with the survey report, for the customer to review.' }
      : { phase: 'prep', key: 'fpSurvey', label: 'Add Framepoint survey & quote', icon: I(IconPlugConnected), role: 'Sales', status: `${fn} designing in Framepoint`, hint: `Back at the office ${fn} designs the job and prices it in Framepoint. Then link it here: get it from Framepoint, or upload the survey report PDF.` };
    case 'Quote Sent': return { phase: 'sent', key: 'reply', label: 'Customer replied', icon: I(IconMessageReply), role: 'Sales', status: `Quote sent ${e.quote?.sentOn || ''} · waiting`, hint: 'A follow-up task was created when the quote went out. When the customer replies, the card moves to Follow-up.' };
    case 'Follow-up': return { phase: 'sent', key: 'decide', label: 'Mark as Won', icon: I(IconTrophy), role: 'Sales', status: 'Customer replied · decide', hint: 'Answer questions and make any changes in Framepoint (More → New quote version). When they accept and the deposit is paid, mark it Won.' };
  }
  // ----- Won: the office takes over -----
  const o = e.ops || {};
  const fs = e.finalSurvey;
  if (!o.checked) return { phase: 'won', key: 'checks', label: 'Check documents & deposit', icon: I(IconFileCheck), role: 'Office', status: 'Won · check documents and deposit', hint: 'Check the accepted quote, survey report and customer details, and that the deposit shows as paid in Xero.' };
  if (!fs) return { phase: 'won', key: 'finalBook', label: 'Assign surveyor', icon: I(IconRulerMeasure), role: 'Office', status: 'Needs a final survey', hint: 'Book a surveyor to check every size before anything is ordered.' };
  if (fs.status !== 'Done') return { phase: 'won', key: 'finalDone', label: 'Final survey done', icon: I(IconRulerMeasure), role: 'Surveyor', status: `Final survey ${fmtDate(fs.date)} · ${staffById(fs.surveyor)?.name.split(' ')[0]}`, hint: `${staffById(fs.surveyor)?.name} checks every size on ${fmtDate(fs.date)}. The results come from their phone.`, wait: true };
  if ((fs.checks || []).some(c => !c.ok) && !o.revision) return { phase: 'won', key: 'revise', label: 'Revise quote in Framepoint', icon: I(IconPencil), role: 'Sales', status: 'Sizes changed · quote revision', hint: 'Some sizes are different. Update the quote in Framepoint and link the new version before ordering.' };
  if (!o.ready) return { phase: 'won', key: 'ready', label: 'Contract & financial readiness', icon: I(IconShieldCheck), role: 'Office', status: 'Final survey OK · check contract and money', hint: 'Confirm the contract, deposit and final sizes are all agreed. The customer is invited to the portal.' };
  if (!o.verified) return { phase: 'won', key: 'verify', label: 'Verify the order', icon: I(IconChecklist), role: 'Office', status: 'Check before ordering', hint: 'Check quote, measurements, product details and evidence. Ask for technical clarification if anything is unclear.' };
  if (!e.jobId) return { phase: 'won', key: 'order', label: 'Place supplier order', icon: I(IconPackage), role: 'Office', status: 'Verified · ready to order', hint: 'Place the order with the supplier. This creates the job.' };
  const d: DeliveryStatus = o.delivery || 'Pending';
  if (d === 'Pending') return { phase: 'order', key: 'supplier', label: 'Record supplier confirmation', icon: I(IconCircleCheck), role: 'Office', status: 'Ordered · waiting for supplier', hint: 'When the supplier confirms, record their reference, delivery date and documents.' };
  if (d !== 'Delivered') return { phase: 'order', key: 'delivery', label: 'Update delivery', icon: I(IconTruckDelivery), role: 'Office', status: d, hint: 'Keep the status up to date: Confirmed, In production, In transit, Delivered. Chase the supplier and tell the customer from here.', wait: true };
  if (!o.received) return { phase: 'ready', key: 'receive', label: 'Check the delivery', icon: I(IconPackageImport), role: 'Office', status: 'Delivered · check it', hint: 'Record what arrived with photos. Flag anything missing, wrong or damaged.' };
  if (!o.received.ok) return { phase: 'ready', key: 'issue', label: 'Resolve delivery problem', icon: I(IconAlertTriangle), role: 'Office', status: `Problem: ${o.received.issue}`, hint: 'Get the replacement from the supplier, check it, then mark the problem as solved.' };
  const fit = installOf(e, ctx.events);
  if (!fit) return { phase: 'ready', key: 'book', label: 'Book installation', icon: I(IconCalendarPlus), role: 'Office', status: 'Ready to book', hint: 'Pick the date and arrival time, then choose the installers who are free that day.' };
  const team = crewTeam(fit)!.name;
  if (!o.pack) return { phase: 'install', key: 'pack', label: 'Release job pack', icon: I(IconFolderShare), role: 'Office', status: `Booked ${fmtDate(fit.date)} · ${team}`, hint: 'Send the installers their job pack and send the customer how to get ready.' };
  if (!o.work) return { phase: 'install', key: 'start', label: 'Installer started', icon: I(IconHammer), role: 'Installer', status: `Fitting ${fmtDate(fit.date)} · ${team}`, hint: `${team} starts on ${fmtDate(fit.date)}. They update progress from their phone.`, wait: true };
  if (o.work === 'Started') return { phase: 'install', key: 'submit', label: 'Completion submitted', icon: I(IconClipboardCheck), role: 'Installer', status: `${team} working · ${o.progress || 0}% done`, hint: `${team} sends the checklist, photos, customer signature and any snags when they finish.`, wait: true };
  const sn = openSnags(e, ctx.snags);
  if (sn.length) {
    const toBook = sn.find(x => x.status !== 'Visit booked');
    return toBook
      ? { phase: 'review', key: 'returnVisit', label: 'Book return visit', icon: I(IconCalendarPlus), role: 'Office', status: `${sn.length} open snag${sn.length > 1 ? 's' : ''}`, hint: 'Assign the corrective work and book a return visit.' }
      : { phase: 'review', key: 'snagFixed', label: 'Snag fixed', icon: I(IconTool), role: 'Installer', status: 'Return visit booked', hint: 'The installer fixes it and sends photos as evidence.', wait: true };
  }
  if (!o.closed) return { phase: 'review', key: 'close', label: 'Final review & close', icon: I(IconLock), role: 'Office', status: 'Check evidence and close', hint: 'Check photos, signatures and that nothing is open. Publish the guarantee and care documents.' };
  if (!o.paid) return { phase: 'pay', key: 'payment', label: 'Check final payment', icon: I(IconCurrencyPound), role: 'Office', status: 'Closed · balance due', hint: 'Watch the final invoice in Xero and follow up anything unpaid.' };
  const ac = openSnags(e, ctx.snags, 'Aftercare');
  if (ac.length) {
    const toBook = ac.find(x => x.status !== 'Visit booked');
    return toBook
      ? { phase: 'after', key: 'returnVisit', label: 'Arrange remedial visit', icon: I(IconCalendarPlus), role: 'Office', status: `Aftercare: ${toBook.title}`, hint: 'The customer reported a problem. Book a visit to put it right.' }
      : { phase: 'after', key: 'snagFixed', label: 'Mark resolved', icon: I(IconTool), role: 'Installer', status: 'Remedial visit booked', hint: 'Mark it resolved once the installer has fixed it.', wait: true };
  }
  return { phase: 'after', key: 'aftercare', label: 'Log aftercare request', icon: I(IconHeartHandshake), role: 'Office', status: 'In guarantee · all good', hint: 'The customer has their guarantee and care guide. Log any request they send in.', wait: true };
}
export const needsOffice = (st: Step) => st.role === 'Office' && !st.wait;

// Every step of the journey with what has happened, for the record's Overview.
export function journeyList(e: EnquiryX, ctx: JourneyCtx): { label: string; role: Role; done: boolean; when?: string; skip?: boolean }[] {
  const order = ['New Enquiry', 'Qualification', 'Appointment', 'Quote Preparation', 'Quote Sent', 'Follow-up', 'Won'];
  const at = order.indexOf(e.stage);
  const o = e.ops || {};
  const fs = e.finalSurvey;
  const fit = installOf(e, ctx.events);
  const changed = (fs?.checks || []).some(c => !c.ok);
  const sn = openSnags(e, ctx.snags);
  const dIdx = ['Pending', 'Confirmed', 'In production', 'In transit', 'Delivered'].indexOf(o.delivery || '');
  return [
    { label: 'Enquiry captured and checked for duplicates', role: 'Office', done: true, when: e.received },
    { label: 'Assigned to a salesperson', role: 'Office', done: !!e.assigned, when: staffById(e.assigned)?.name },
    { label: 'Qualification · customer contacted', role: 'Sales', done: at >= 1 },
    { label: 'Appointment booked (Outlook)', role: 'Sales', done: !!e.appt, when: e.appt ? fmtDate(e.appt.date) : undefined },
    { label: 'Sales appointment · first measurements and notes', role: 'Sales', done: e.appt?.status === 'Done' },
    { label: 'Framepoint survey & quote linked', role: 'Sales', done: !!e.survey?.fp, when: e.survey?.fp?.ref },
    { label: 'Quote sent for review', role: 'Sales', done: !!e.quote, when: e.quote?.sentOn },
    { label: 'Follow-up and revisions', role: 'Sales', done: at >= 6, when: e.versions && e.versions.length > 1 ? `${e.versions.length} versions` : undefined },
    { label: 'Won · deposit matched in Xero', role: 'Sales', done: e.stage === 'Won', when: e.wonOn },
    { label: 'Documents and deposit checked', role: 'Office', done: !!o.checked, when: o.checked },
    { label: 'Final survey by surveyor', role: 'Surveyor', done: fs?.status === 'Done', when: fs?.doneOn || (fs ? `Booked ${fmtDate(fs.date)}` : undefined) },
    { label: 'Quote revised after final survey', role: 'Sales', done: !!o.revision, when: o.revision?.to, skip: !changed },
    { label: 'Contract & financial readiness', role: 'Office', done: !!o.ready, when: o.ready },
    { label: 'Order verified', role: 'Office', done: !!o.verified, when: o.verified },
    { label: 'Supplier order placed', role: 'Office', done: !!e.jobId, when: e.jobId },
    { label: 'Supplier confirmed', role: 'Office', done: dIdx >= 1 },
    { label: 'Delivered', role: 'Office', done: dIdx >= 4 },
    { label: 'Delivery checked', role: 'Office', done: !!o.received?.ok, when: o.received?.on },
    { label: 'Readiness override (only if needed)', role: 'Director', done: !!o.override, when: o.override?.by, skip: !o.override },
    { label: 'Installation booked', role: 'Office', done: !!fit, when: fit ? fmtDate(fit.date) : undefined },
    { label: 'Job pack released · customer told how to prepare', role: 'Office', done: !!o.pack, when: o.pack },
    { label: 'Installation', role: 'Installer', done: o.work === 'Submitted', when: o.work === 'Started' ? `${o.progress || 0}% done` : undefined },
    { label: 'Completion submitted · signed by customer', role: 'Installer', done: !!o.completion, when: o.completion?.on },
    { label: 'Snags fixed', role: 'Installer', done: !!o.completion && sn.length === 0, when: sn.length ? `${sn.length} open` : undefined },
    { label: 'Final review · project closed', role: 'Office', done: !!o.closed, when: o.closed },
    { label: 'Final payment reconciled (Xero)', role: 'Office', done: !!o.paid, when: o.paid },
    { label: 'Aftercare', role: 'Office', done: !!o.paid, when: o.paid ? 'In guarantee' : undefined },
  ];
}

/* ===================== Shared bits ===================== */
function Checklist({ items, on, set }: { items: [string, string?][]; on: boolean[]; set: (v: boolean[]) => void }) {
  return (
    <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
      {items.map(([l, sub], i) => (
        <div key={l} className="hstack" style={{ gap: 12, padding: '11px 0', alignItems: 'flex-start' }}>
          <Check on={on[i]} onChange={v => set(on.map((x, j) => (j === i ? v : x)))} />
          <div className="vstack" style={{ gap: 2, cursor: 'pointer' }} onClick={() => set(on.map((x, j) => (j === i ? !x : x)))}><b style={{ fontSize: 13 }}>{l}</b>{sub && <span className="small t2">{sub}</span>}</div>
        </div>
      ))}
    </div>
  );
}
const XeroBox = ({ rows }: { rows: [string, string, 'ok' | 'warn' | 'err'][] }) => (
  <div className="card" style={{ padding: 14, gap: 8, background: 'var(--bg)' }}>
    <span className="hstack" style={{ gap: 8 }}><span className="avatar" style={{ width: 26, height: 26, background: '#13b5ea', color: '#fff', fontSize: 11 }}>X</span><b style={{ fontSize: 13 }}>From Xero</b><span className="tiny muted">matched to this customer</span></span>
    {rows.map(([l, v, t]) => <span key={l} className="between small"><span className="t2">{l}</span><span className="hstack" style={{ gap: 8 }}><b>{v}</b><Tag tone={t}>{t === 'ok' ? 'Paid' : t === 'warn' ? 'Due' : 'Overdue'}</Tag></span></span>)}
  </div>
);
const totalsOf = (e: EnquiryX) => (e.quote ? quoteTotals(e.quote) : { total: e.value, deposit: Math.round(e.value / 2), stage: Math.round(e.value * 0.4), completion: e.value - Math.round(e.value / 2) - Math.round(e.value * 0.4), depositPct: 50, vat: 0, sub: 0 });
const bumpRef = (ref: string) => { const m = ref.match(/^(.*-v)(\d+)$/); return m ? `${m[1]}${+m[2] + 1}` : `${ref}-v2`; };

/* ===================== 4. Sales appointment done (first measurements) ===================== */
export function ApptDoneModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const s = staffById(e.appt?.who || e.assigned);
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<string[]>([e.product]);
  const [measured, setMeasured] = useState(true);
  const [photos, setPhotos] = useState(true);
  const [when, setWhen] = useState('Within 2 months');
  const opts = Array.from(new Set([e.product, 'Windows', 'Front door', 'Bi-fold doors', 'Roof lantern', 'Conservatory']));
  const save = () => {
    updEnq(e.id, { stage: 'Quote Preparation', stageDays: 0, appt: e.appt ? { ...e.appt, status: 'Done', outcome: notes } : e.appt, next: 'Prepare quote in Framepoint', nextDue: fmtDate(addDays(TODAY, 2)) },
      { kind: 'note', title: 'Sales appointment done', body: `${notes}\nInterested in: ${products.join(', ')}. ${measured ? 'First measurements taken. ' : ''}${photos ? 'Photos taken. ' : ''}Wants it done: ${when.toLowerCase()}.`, who: s?.name || ME });
    set('appts', as => as.map(a => (a.customer === e.name && a.kind === 'Sales visit' ? { ...a, status: 'Done' } : a)));
    toast('Appointment saved · moved to Quote preparation');
    onDone?.('appt'); onClose();
  };
  return (
    <Modal title="Sales appointment done" sub={`${s?.name || 'Salesperson'} · ${e.name} · ${e.appt ? fmtDate(e.appt.date) : ''}`} onClose={onClose} width={660} footer={<Foot onClose={onClose} onSave={save} disabled={notes.trim().length < 5} label="Save and start the quote" icon={<IconCircleCheck size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} />This visit is the first survey. Note everything you discussed — back at the office you design and price it in Framepoint.</div>
      <Field label="What did you discuss?"><textarea className="textarea" style={{ minHeight: 110 }} value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Lean-to conservatory 4m × 3m on the rear. White, warm roof. Wants French doors to the garden. Budget about £20k." /></Field>
      <Field label="Products they are interested in"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{opts.map(p => <button key={p} type="button" className={`chip ${products.includes(p) ? 'on' : ''}`} onClick={() => setProducts(ps => (ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]))}>{p}</button>)}</div></Field>
      <div className="grid-2">
        <Field label="When do they want it done?"><select className="select" value={when} onChange={x => setWhen(x.target.value)}>{['As soon as possible', 'Within 2 months', 'In 3–6 months', 'Just looking for now'].map(x => <option key={x}>{x}</option>)}</select></Field>
        <div className="vstack" style={{ gap: 10, paddingTop: 22 }}><Check on={measured} onChange={setMeasured} label="First measurements taken" /><Check on={photos} onChange={setPhotos} label="Photos of the property taken" /></div>
      </div>
    </Modal>
  );
}

/* ===================== 10 & after final survey: new quote version ===================== */
export function ReviseQuoteModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const after = e.stage === 'Won';
  const ref = e.quote?.ref || '';
  const [nref, setNref] = useState(bumpRef(ref));
  const [change, setChange] = useState(0);
  const [why, setWhy] = useState(after ? 'Sizes updated after the final survey.' : '');
  const [send, setSend] = useState(true);
  const old = totalsOf(e).total;
  const changed = (e.finalSurvey?.checks || []).filter(c => !c.ok);
  const save = () => {
    const q = { ...e.quote!, ref: nref, discount: (e.quote?.discount || 0) - change, sentOn: todayShort() };
    const total = quoteTotals(q).total;
    updEnq(e.id, x => ({
      quote: q, value: total, versions: [...(x.versions || []), { ref: nref, on: todayShort(), total, note: why }],
      survey: x.survey?.fp ? { ...x.survey, fp: { ...x.survey.fp, ref: nref, quoteFile: `Framepoint quote ${nref}.pdf` } } : x.survey,
      ...(after ? { ops: { ...(x.ops || {}), revision: { from: ref, to: nref, on: todayShort() } }, next: 'Contract & financial readiness', nextDue: 'Today' } : { next: 'Wait for the customer to reply', nextDue: fmtDate(addDays(TODAY, 2)) }),
    }), { kind: send ? 'email-out' : 'note', title: `Quote revised · ${nref}${send ? ' sent for review' : ''}`, body: `${why} ${change ? `Price ${change > 0 ? 'up' : 'down'} ${gbp(Math.abs(change))}. ` : 'Price unchanged. '}New total ${gbp(total)} inc. VAT. Active version is now ${nref}.`, who: staffById(e.assigned)?.name || ME });
    toast(`Quote ${nref} is now the active version · ${gbp(total)}`);
    onDone?.('quote'); onClose();
  };
  return (
    <Modal title={after ? 'Revise the quote after the final survey' : 'New quote version'} sub={`${e.name} · active version ${ref}`} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} disabled={why.trim().length < 3} label={`Save ${nref}`} icon={<IconPencil size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} />Make the change in Framepoint first. Then link the new version here so everyone uses the right one.</div>
      {after && changed.length > 0 && <div className="vstack" style={{ gap: 6 }}><b style={{ fontSize: 13 }}>Sizes changed by the surveyor</b>{changed.map(c => <span key={c.no} className="small t2">{c.no}. {c.name}: {c.sales} → <b style={{ color: 'var(--text)' }}>{c.checked}</b></span>)}</div>}
      <div className="grid-2">
        <Field label="New Framepoint version"><input className="input" value={nref} onChange={x => setNref(x.target.value)} /></Field>
        <Field label="Price change (£, inc. VAT)" hint={`Was ${gbp(old)} · now ${gbp(old + change)}`}><input className="input" type="number" value={change} onChange={x => setChange(+x.target.value)} /></Field>
      </div>
      <Field label="What changed?"><input className="input" value={why} onChange={x => setWhy(x.target.value)} placeholder="e.g. Grey frames instead of black" /></Field>
      <Check on={send} onChange={setSend} label="Send the new version to the customer to approve" />
      {e.versions && e.versions.length > 0 && <span className="tiny muted">Earlier versions: {e.versions.map(v => `${v.ref} (${gbp(v.total)})`).join(' · ')}</span>}
    </Modal>
  );
}

/* ===================== 12. Office: check documents and deposit ===================== */
export function OfficeChecksModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const t = totalsOf(e);
  const dep = e.ops?.deposit;
  const items: [string, string][] = [
    ['Accepted quote', `${e.quote?.ref || '—'} · ${gbp(t.total)} · accepted ${e.wonOn || ''}`],
    ['Framepoint survey report on file', e.survey?.fp?.file || 'Not uploaded'],
    ['Deposit paid', dep ? `${dep.inv} · ${gbp(dep.amount || t.deposit)} · paid ${dep.on}` : 'Not found in Xero'],
    ['Customer details complete', `${e.phone} · ${e.email} · ${e.address}, ${e.postcode}`],
  ];
  const [on, setOn] = useState(items.map(() => false));
  const [note, setNote] = useState('');
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), checked: todayShort() }, next: 'Assign surveyor', nextDue: 'Today' }), { kind: 'system', title: 'Office checked documents and deposit', body: note || 'Accepted quote, survey report, deposit and customer details all in order.', who: ME });
    toast('Checked · next, assign a surveyor for the final survey');
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Check documents and deposit" sub={`${e.name} · won ${e.wonOn || ''} by ${staffById(e.assigned)?.name}`} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean)} label="Everything is in order" icon={<IconFileCheck size={16} />} />}>
      <span className="small t2">Tick each one once you have looked at it.</span>
      <Checklist items={items} on={on} set={setOn} />
      <XeroBox rows={[['Deposit invoice ' + (dep?.inv || ''), gbp(dep?.amount || t.deposit), dep ? 'ok' : 'warn']]} />
      <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>{(e.quote?.files || []).map(f => <FileChip key={f} name={f} sub="Accepted by the customer" />)}</div>
      <Field label="Anything outstanding? (optional)"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Waiting for the alarm code for the side gate" /></Field>
    </Modal>
  );
}

/* ===================== Contract & financial readiness (includes portal invite) ===================== */
export function ReadinessModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const t = totalsOf(e);
  const fs = e.finalSurvey;
  const items: [string, string][] = [
    ['Contract agreed', `Quote ${e.quote?.ref} accepted · terms and conditions signed`],
    ['Deposit paid', `${t.depositPct || 50}% · ${gbp(t.deposit)} · matched in Xero`],
    ['Final sizes agreed', fs?.status === 'Done' ? `Final survey ${fs.doneOn}${e.ops?.revision ? ` · revised quote ${e.ops.revision.to}` : ' · all sizes match'}` : 'Final survey not done'],
    ['Stage payment set up', `40% · ${gbp(t.stage || 0)} invoice goes out 7 days before installation`],
  ];
  const [on, setOn] = useState(items.map(() => false));
  const [invite, setInvite] = useState(e.invite?.status !== 'Active');
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), ready: todayShort() }, invite: invite ? { status: 'Invited', sentOn: todayShort() } : x.invite, next: 'Verify the order', nextDue: 'Today' }),
      { kind: invite ? 'email-out' : 'system', title: invite ? 'Ready to order · welcome to your Jadeite portal' : 'Contract and finances confirmed', body: invite ? `Dear ${e.name}, everything is agreed and we are getting your order ready. Follow every step in your portal — sign in with your email and a one-time code.` : 'Contract, deposit and final sizes all agreed.', who: ME });
    toast(invite ? `Ready to order · portal invite sent to ${e.email}` : 'Ready to order');
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Contract & financial readiness" sub={`${e.name} · the last check before the order`} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean)} label="Ready to order" icon={<IconShieldCheck size={16} />} />}>
      <Checklist items={items} on={on} set={setOn} />
      <XeroBox rows={[['Deposit (50%)', gbp(t.deposit), 'ok'], ['Stage payment (40%)', gbp(t.stage || 0), 'warn'], ['On completion (10%)', gbp(t.completion || 0), 'warn']]} />
      <Check on={invite} onChange={setInvite} label={e.invite?.status === 'Active' ? 'Customer already uses the portal' : `Invite ${e.name} to the customer portal now`} />
    </Modal>
  );
}

/* ===================== 13. Order verification ===================== */
export function VerifyOrderModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const lines = orderLines(e);
  const items: [string, string][] = [
    ['Quote and contract match', `Active version ${e.quote?.ref}`],
    ['Measurements', lines.map(l => `${l.item.replace(/^\d+\.\s*/, '')}: ${l.size}`).join(' · ')],
    ['Product details', lines.map(l => l.spec).join(' · ')],
    ['Supporting evidence', `${e.survey?.fp?.file || 'Survey report'} · final survey photos · drawings`],
  ];
  const [on, setOn] = useState(items.map(() => false));
  const [ask, setAsk] = useState(false);
  const [q, setQ] = useState('');
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), verified: todayShort() }, next: 'Place supplier order', nextDue: 'Today' }), { kind: 'system', title: 'Order verified', body: ask && q ? `Checklist complete. Technical question asked: ${q}` : 'Checklist complete. Ready to send to the supplier.', who: ME });
    toast('Verified · ready to place the supplier order');
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Verify the order" sub={`${e.name} · check everything before it goes to the supplier`} onClose={onClose} width={700} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean)} label="Checklist complete" icon={<IconChecklist size={16} />} />}>
      <Checklist items={items} on={on} set={setOn} />
      <Check on={ask} onChange={setAsk} label="I need technical clarification first" />
      {ask && <Field label="What needs clarifying?" hint="Saved on the record. Ask the surveyor or supplier."><input className="input" value={q} onChange={x => setQ(x.target.value)} placeholder="e.g. Confirm the threshold height with Origin" /></Field>}
    </Modal>
  );
}

/* ===================== 15. Production and delivery monitoring ===================== */
const STATUS: DeliveryStatus[] = ['Pending', 'Confirmed', 'In production', 'In transit', 'Delivered'];
const orderTone: Record<string, string> = { Pending: 'warn', Confirmed: 'jade', 'In production': 'info', 'In transit': 'info', Delivered: 'ok' };
const orderStatus: Record<string, string> = { Pending: 'Not confirmed', Confirmed: 'Confirmed', 'In production': 'In production', 'In transit': 'On the way', Delivered: 'Arrived' };
export function DeliveryStatusModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, orders } = useStore();
  const o = orders.find(x => x.job === e.jobId);
  const [st, setSt] = useState<DeliveryStatus>(e.ops?.delivery || 'Confirmed');
  const [date, setDate] = useState(addDays(TODAY, 4));
  const [note, setNote] = useState('');
  const [tell, setTell] = useState(true);
  const [chase, setChase] = useState(false);
  const save = () => {
    if (o) {
      set('orders', os => os.map(x => (x.ref === o.ref ? { ...x, status: orderStatus[st], tone: orderTone[st], confirmed: st !== 'Pending', expected: short(date) } : x)));
      set('deliveries', ds => ds.map(x => (x.ref === o.ref ? { ...x, status: orderStatus[st], tone: orderTone[st], day: fmtDate(date) } : x)));
    }
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), delivery: st }, next: st === 'Delivered' ? 'Check the delivery' : `Delivery ${fmtDate(date)}`, nextDue: st === 'Delivered' ? 'Today' : fmtDate(date) }),
      { kind: 'system', title: `Delivery status: ${st}`, body: `${o ? `${o.supplier} · ${o.ref}. ` : ''}${st === 'Delivered' ? 'Arrived today.' : `Expected ${fmtDate(date)}.`} ${note}${tell ? ' Customer told by email and portal.' : ''}${chase ? ' Chase email sent to the supplier.' : ''}`.trim(), who: ME });
    toast(`${st}${tell ? ' · customer told' : ''}${chase ? ' · supplier chased' : ''}`);
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Update delivery" sub={`${e.name}${o ? ` · ${o.supplier} · ${o.ref}` : ''}`} onClose={onClose} width={620} footer={<Foot onClose={onClose} onSave={save} label="Save status" icon={<IconTruckDelivery size={16} />} />}>
      <Field label="Where is it now?">
        <div className="stepper" style={{ flexWrap: 'wrap' }}>{STATUS.map((x, i) => <React.Fragment key={x}>{i > 0 && <span className="step-line" />}<button type="button" className={`step ${STATUS.indexOf(st) > i ? 'done' : ''} ${st === x ? 'now' : ''}`} onClick={() => setSt(x)}>{STATUS.indexOf(st) > i && <IconCircleCheck size={14} />}{x}</button></React.Fragment>)}</div>
      </Field>
      {st !== 'Delivered' && <Field label="Expected delivery"><input type="date" className="input" value={date} onChange={x => setDate(x.target.value)} /></Field>}
      <Field label="Note (optional)"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Glass delayed two days at the factory" /></Field>
      <div className="vstack" style={{ gap: 10 }}>
        <Check on={tell} onChange={setTell} label="Tell the customer (email and portal)" />
        <Check on={chase} onChange={setChase} label={`Send a chase email to ${o?.supplier || 'the supplier'}`} />
      </div>
    </Modal>
  );
}

/* ===================== 16. Delivery verification ===================== */
export function ReceiveDeliveryModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, orders, updateJob } = useStore();
  const o = orders.find(x => x.job === e.jobId);
  const lines = orderLines(e);
  const [res, setRes] = useState(lines.map(() => 'OK'));
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState(0);
  const bad = res.filter(r => r !== 'OK').length;
  const save = () => {
    const issue = bad ? `${lines.filter((_, i) => res[i] !== 'OK').map((l, i) => `${l.item.replace(/^\d+\.\s*/, '')} ${res.filter(r => r !== 'OK')[i].toLowerCase()}`).join(', ')}${note ? ' — ' + note : ''}` : undefined;
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), received: { on: todayShort(), ok: !bad, issue, photos } }, next: bad ? 'Resolve delivery problem' : 'Book installation', nextDue: 'Today' }),
      { kind: 'note', title: bad ? 'Delivery checked · problem found' : 'Delivery checked · all good', body: bad ? `${issue}. Supplier told.` : `Everything arrived in good condition. ${photos} photos saved.`, who: ME });
    if (o) {
      set('orders', os => os.map(x => (x.ref === o.ref ? { ...x, status: bad ? 'Problem' : 'Arrived', tone: bad ? 'err' : 'ok', frames: x.frames.replace(/^\d+/, x.frames.split(' of ')[1]) } : x)));
      set('deliveries', ds => ds.map(x => (x.ref === o.ref ? { ...x, status: bad ? 'Problem' : 'Arrived', tone: bad ? 'err' : 'ok', problem: issue || '' } : x)));
    }
    if (e.jobId) updateJob(e.jobId, bad ? { blocked: `Delivery problem: ${issue}` } : { stage: 'Delivery', blocked: undefined, next: 'Book installation', due: 'Today' }, bad ? `Delivery problem: ${issue}` : 'Delivery checked. Ready to book.');
    toast(bad ? 'Problem saved · supplier told' : 'All good · ready to book installation');
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Check the delivery" sub={`${e.name}${o ? ` · ${o.ref}` : ''}`} onClose={onClose} width={680} footer={<Foot onClose={onClose} onSave={save} disabled={!photos || (bad > 0 && note.trim().length < 3)} label={bad ? 'Save and tell the supplier' : 'Everything arrived'} icon={<IconPackageImport size={16} />} />}>
      <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
        {lines.map((l, i) => (
          <div key={i} className="hstack" style={{ gap: 12, padding: '10px 0' }}>
            <img src={IMG[e.photo]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            <div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{l.qty} × {l.item.replace(/^\d+\.\s*/, '')}</b><span className="tiny muted">{l.size}</span></div>
            <div className="hstack" style={{ gap: 6 }}>{['OK', 'Missing', 'Damaged', 'Wrong'].map(r => <button key={r} type="button" className={`chip ${res[i] === r ? 'on' : ''}`} style={res[i] === r && r !== 'OK' ? { background: '#fdeeee', borderColor: '#d64545', color: '#a83232' } : undefined} onClick={() => setRes(rs => rs.map((x, j) => (j === i ? r : x)))}>{r}</button>)}</div>
          </div>
        ))}
      </div>
      <div className="hstack" style={{ gap: 10 }}>
        <button className="btn btn-outline btn-sm" onClick={() => setPhotos(p => p + 3)}><IconCamera size={15} />Add photos</button>
        <span className="small t2">{photos ? `${photos} photos added` : 'Add at least one photo of the delivery'}</span>
      </div>
      {bad > 0 && <Field label="What is wrong?"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Crack in the bottom left pane" /></Field>}
    </Modal>
  );
}
export function ResolveIssueModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, updateJob, set, orders } = useStore();
  const o = orders.find(x => x.job === e.jobId);
  const [on, setOn] = useState([false, false]);
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), received: { ...(x.ops!.received!), ok: true } }, next: 'Book installation', nextDue: 'Today' }), { kind: 'note', title: 'Delivery problem solved', body: `Replacement received and checked. Was: ${e.ops?.received?.issue}.`, who: ME });
    if (e.jobId) updateJob(e.jobId, { stage: 'Delivery', blocked: undefined, next: 'Book installation', due: 'Today' }, 'Delivery problem solved. Ready to book.');
    if (o) set('orders', os => os.map(x => (x.ref === o.ref ? { ...x, status: 'Arrived', tone: 'ok' } : x)));
    toast('Solved · ready to book installation');
    onDone?.('order'); onClose();
  };
  return (
    <Modal title="Resolve delivery problem" sub={`${e.name} · ${e.ops?.received?.issue}`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean)} label="Problem solved" icon={<IconCircleCheck size={16} />} />}>
      <Checklist items={[['Replacement received from the supplier'], ['Checked and photographed']]} on={on} set={setOn} />
    </Modal>
  );
}

/* ===================== 18. Readiness override (Director) ===================== */
export function OverrideModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const [by, setBy] = useState('Mike Jadeite (Director)');
  const [reason, setReason] = useState('');
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), override: { by, reason, on: todayShort() } } }), { kind: 'system', title: `Readiness override approved by ${by}`, body: reason, who: ME });
    toast('Override saved · you can now book the installation');
    onDone?.('install'); onClose();
  };
  return (
    <Modal title="Book before the normal checks are done" sub={`${e.name} · needs a director's approval`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} disabled={reason.trim().length < 8} label="Approve override" icon={<IconUserCheck size={16} />} />}>
      <div className="alert warn small"><IconAlertTriangle size={16} /><div>The delivery has not been checked yet. Only book now if a director agrees. The approval and reason are saved for audit.</div></div>
      <Field label="Approved by"><select className="select" value={by} onChange={x => setBy(x.target.value)}><option>Mike Jadeite (Director)</option><option>Sarah Mitchell (Authorised office admin)</option></select></Field>
      <Field label="Reason (required)"><textarea className="textarea" value={reason} onChange={x => setReason(x.target.value)} placeholder="e.g. Customer is away from the 24th. Supplier confirmed delivery two days before fitting." /></Field>
    </Modal>
  );
}

/* ===================== 19. Pre-installation preparation ===================== */
export function JobPackModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, events } = useStore();
  const fit = installOf(e, events);
  const team = crewTeam(fit);
  const lines = orderLines(e);
  const [msg, setMsg] = useState(`Dear ${e.name},\n\nYour installation starts on ${fit ? fmtDate(fit.date, { weekday: 'long', day: 'numeric', month: 'long' }) : ''}. ${team?.members} will arrive between ${(fit?.time || '08:00 – 09:00').replace(' – ', ' and ')}.\n\nTo get ready, please:\n• clear about a metre inside each window and door\n• move curtains, blinds and anything fragile\n• keep the drive free for the van\n• keep pets in another room\n\nKind regards,\nJadeite Glazing`);
  const [reviewed, setReviewed] = useState(true);
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), pack: todayShort(), installerReviewed: reviewed }, next: 'Installation', nextDue: fit ? fmtDate(fit.date) : 'Soon' }),
      { kind: 'email-out', title: 'Getting ready for your installation', body: msg, who: ME });
    toast(`Job pack sent to ${team?.name} · customer told how to prepare`);
    onDone?.('install'); onClose();
  };
  return (
    <Modal title="Release the job pack" sub={`${e.name} · ${team?.name} · ${fit ? fmtDate(fit.date) : ''}`} onClose={onClose} width={720} footer={<Foot onClose={onClose} onSave={save} label="Send job pack and customer email" icon={<IconFolderShare size={16} />} />}>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Job pack for {team?.members}</b>
        <div className="grid-2" style={{ gap: 10 }}>
          {[['Measurements', lines.map(l => l.size).join(' · ')], ['Products and specification', lines.map(l => l.spec).join(' · ')], ['Photos and drawings', `${e.survey?.fp?.file || 'Survey report'} · final survey photos`], ['Site risks and access', e.survey?.fp?.notes || 'Side access · park on the drive']].map(([l, v]) => (
            <div key={l} className="card" style={{ padding: 12, gap: 4 }}><span className="hstack small" style={{ gap: 6 }}><IconCircleCheck size={15} color="#1f9d5b" /><b>{l}</b></span><span className="tiny t2">{v}</span></div>
          ))}
        </div>
      </div>
      <Field label="Email to the customer — how to get ready"><textarea className="textarea" style={{ minHeight: 190 }} value={msg} onChange={x => setMsg(x.target.value)} /></Field>
      <Check on={reviewed} onChange={setReviewed} label="Installer has read the job pack and has no questions" />
    </Modal>
  );
}

/* ===================== 20. Installation execution (installer's phone) ===================== */
export function InstallerProgressModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, events, updateJob } = useStore();
  const fit = installOf(e, events);
  const team = crewTeam(fit);
  const [pct, setPct] = useState(Math.max(25, e.ops?.progress || 0));
  const [note, setNote] = useState('');
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), work: 'Started', progress: pct }, next: 'Installer working', nextDue: 'Today' }), { kind: 'note', title: e.ops?.work ? `Progress update · ${pct}% done` : 'Installer started the job', body: note || `${pct}% done.`, who: team?.name || 'Installer' });
    if (e.jobId) updateJob(e.jobId, { stage: 'Installation' }, `${team?.name}: ${pct}% done. ${note}`);
    toast(`${team?.name} · ${pct}% done`);
    onDone?.('install'); onClose();
  };
  return (
    <Modal title={e.ops?.work ? 'Installer progress update' : 'Installer started the job'} sub={`Sent from ${team?.name}'s phone · ${e.name}`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} label="Save update" icon={<IconHammer size={16} />} />}>
      <div className="alert info small"><IconInfoCircle size={16} />In the live system the installers send this from their phone. You see it here straight away.</div>
      <Field label="How far along?"><div className="hstack" style={{ gap: 8 }}>{[25, 50, 75, 90].map(p => <button key={p} type="button" className={`chip ${pct === p ? 'on' : ''}`} onClick={() => setPct(p)}>{p}%</button>)}</div></Field>
      <Field label="Note (optional)"><input className="input" value={note} onChange={x => setNote(x.target.value)} placeholder="e.g. Front windows in. Back door tomorrow." /></Field>
    </Modal>
  );
}

/* ===================== 21. Completion submission ===================== */
export function CompletionModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, events, set, updateJob } = useStore();
  const fit = installOf(e, events);
  const team = crewTeam(fit);
  const items: [string, string?][] = [['Everything fitted and working'], ['Sealed inside and out, glass cleaned'], ['Old frames and waste removed'], ['Customer shown how everything works']];
  const [on, setOn] = useState(items.map(() => true));
  const [photos, setPhotos] = useState(12);
  const [signed, setSigned] = useState(true);
  const [snags, setSnags] = useState<string[]>([]);
  const save = () => {
    const list = snags.filter(x => x.trim());
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), work: 'Submitted', progress: 100, completion: { on: todayShort(), photos, signed, snags: list.length } }, next: list.length ? 'Book return visit' : 'Final review and close', nextDue: 'Today' }),
      { kind: 'note', title: `Completion submitted${list.length ? ` with ${list.length} snag${list.length > 1 ? 's' : ''}` : ''}`, body: `${photos} photos. ${signed ? 'Signed by the customer.' : 'Not signed.'}${list.length ? ' Snags: ' + list.join('; ') : ''}`, who: team?.name || 'Installer' });
    if (list.length) set('snags', ss => [...list.map((t, i) => ({ id: 'SN-' + (130 + i + Math.floor(Math.random() * 60)), job: e.jobId!, customer: e.name, title: t, detail: 'Reported at completion.', reported: `Installer · ${todayShort()}`, status: 'Open', tone: 'err', severity: 'Minor', photo: e.photo, owner: team?.name || 'Installer', kind: 'Snag' as const })), ...ss]);
    if (e.jobId) updateJob(e.jobId, { stage: list.length ? 'Snag' : 'Complete', next: list.length ? 'Book return visit' : 'Final review', due: 'Today' }, `Completion submitted by ${team?.name}.`);
    toast(list.length ? `Submitted with ${list.length} snag${list.length > 1 ? 's' : ''} · book a return visit` : 'Submitted · ready for final review');
    onDone?.('install'); onClose();
  };
  return (
    <Modal title="Completion submitted" sub={`Sent from ${team?.name}'s phone · ${e.name}`} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean) || !photos} label="Submit for review" icon={<IconClipboardCheck size={16} />} />}>
      <Checklist items={items} on={on} set={setOn} />
      <div className="hstack" style={{ gap: 10 }}><button className="btn btn-outline btn-sm" onClick={() => setPhotos(p => p + 4)}><IconCamera size={15} />Add photos</button><span className="small t2">{photos} photos</span></div>
      <div className="card" style={{ padding: 12, gap: 6 }}>
        <span className="hstack small" style={{ gap: 6 }}><IconSignature size={16} /><b>Customer signature</b></span>
        <div style={{ border: '1px dashed var(--border-input)', borderRadius: 10, height: 70, display: 'grid', placeItems: 'center', fontFamily: 'cursive', fontSize: 24, color: signed ? 'var(--text)' : 'var(--muted)' }}>{signed ? e.name.split(' ').pop() : 'Not signed'}</div>
        <Check on={signed} onChange={setSigned} label="Customer signed on the installer's phone" />
      </div>
      <div className="vstack" style={{ gap: 8 }}>
        <b style={{ fontSize: 13 }}>Snags (anything still to fix)</b>
        {snags.map((s, i) => <div key={i} className="hstack" style={{ gap: 8 }}><input className="input" value={s} onChange={x => setSnags(ss => ss.map((y, j) => (j === i ? x.target.value : y)))} placeholder="e.g. Small scratch on the door frame" /><button className="icon-btn" aria-label="Remove snag" onClick={() => setSnags(ss => ss.filter((_, j) => j !== i))}><IconTrash size={15} /></button></div>)}
        <button className="btn btn-outline btn-xs" style={{ alignSelf: 'flex-start' }} onClick={() => setSnags(ss => [...ss, ''])}><IconPlus size={13} />Add a snag</button>
      </div>
    </Modal>
  );
}

/* ===================== 22. Snag resolution / return visit ===================== */
export function ReturnVisitModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, snags, events } = useStore();
  const after = !!e.ops?.closed;
  const open = openSnags(e, snags as any, after ? 'Aftercare' : 'Snag').filter(x => x.status !== 'Visit booked');
  const fit = installOf(e, events);
  const [date, setDate] = useState(addDays(TODAY, 3));
  const [crew, setCrew] = useState<string[]>(() => { const free = crewOf(fit).filter(id => !busyWith(id, addDays(TODAY, 3), 1, events)); return free.length ? free.slice(0, 1) : []; });
  const names = joinNames(crew.map(id => personById(id)?.name || id));
  const save = () => {
    const ids = open.map(x => x.id);
    set('snags', ss => ss.map(x => (ids.includes(x.id) ? { ...x, status: 'Visit booked', tone: 'info', owner: names } : x)));
    set('events', es => [...es, { id: 'rv' + Date.now(), team: 'crew', crew, time: '09:00 – 10:00', date, days: 1, kind: 'snag', title: `${e.name} · ${after ? 'remedial' : 'return'} visit`, sub: `${e.jobId} · ${open.map(x => x.title).join(', ')}`, photo: e.photo, job: e.jobId }]);
    updEnq(e.id, { next: after ? 'Remedial visit' : 'Return visit', nextDue: fmtDate(date) }, { kind: 'email-out', title: `${after ? 'Remedial' : 'Return'} visit booked · ${fmtDate(date)}`, body: `Dear ${e.name}, ${names} will come on ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })} to fix: ${open.map(x => x.title.toLowerCase()).join(', ')}.`, who: ME });
    toast(`Visit booked · ${names} · ${fmtDate(date)} · customer told`);
    onDone?.('snags'); onClose();
  };
  const busy = crew.some(id => busyWith(id, date, 1, events));
  return (
    <Modal title={after ? 'Arrange a remedial visit' : 'Book a return visit'} sub={`${e.name} · ${open.length} to fix`} onClose={onClose} width={820} footer={<Foot onClose={onClose} onSave={save} disabled={!open.length || !crew.length || busy} label="Book and tell everyone" icon={<IconCalendarPlus size={16} />} />}>
      <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
        {open.map(x => <div key={x.id} className="hstack" style={{ gap: 10, padding: '10px 0' }}><IconAlertTriangle size={18} color="#e0a100" /><div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{x.title}</b><span className="tiny muted">{x.id} · {x.status}</span></div></div>)}
      </div>
      <Field label="Visit date"><input type="date" className="input" style={{ maxWidth: 240 }} min={TODAY} value={date} onChange={x => x.target.value && setDate(x.target.value)} /></Field>
      <Field label="Who goes?" hint={fit ? `Fitted by ${crewTeam(fit)?.members}. Anyone free can go.` : undefined}><InstallerPicker date={date} days={1} value={crew} onChange={setCrew} /></Field>
    </Modal>
  );
}
export function SnagFixedModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, set, snags, updateJob } = useStore();
  const after = !!e.ops?.closed;
  const open = openSnags(e, snags as any, after ? 'Aftercare' : 'Snag');
  const [photos, setPhotos] = useState(2);
  const [happy, setHappy] = useState(true);
  const save = () => {
    const ids = open.map(x => x.id);
    set('snags', ss => ss.map(x => (ids.includes(x.id) ? { ...x, status: 'Fixed', tone: 'ok' } : x)));
    updEnq(e.id, { next: after ? 'In guarantee' : 'Final review and close', nextDue: after ? '—' : 'Today' }, { kind: 'note', title: `${after ? 'Aftercare request resolved' : 'Snags fixed'}`, body: `${open.map(x => x.title).join(', ')}. ${photos} photos as evidence.${happy ? ' Customer happy.' : ''}`, who: open[0]?.owner || 'Installer' });
    if (e.jobId && !after) updateJob(e.jobId, { stage: 'Complete', next: 'Final review', due: 'Today' }, 'All snags fixed.');
    toast(after ? 'Resolved · history kept on the record' : 'Snags fixed · ready for final review');
    onDone?.('snags'); onClose();
  };
  return (
    <Modal title={after ? 'Mark aftercare request resolved' : 'Snag fixed'} sub={`${e.name} · from the installer's phone`} onClose={onClose} width={560} footer={<Foot onClose={onClose} onSave={save} disabled={!photos} label="Mark as fixed" icon={<IconTool size={16} />} />}>
      {open.map(x => <span key={x.id} className="hstack small" style={{ gap: 8 }}><IconCircleCheck size={16} color="#1f9d5b" />{x.title}</span>)}
      <div className="hstack" style={{ gap: 10 }}><button className="btn btn-outline btn-sm" onClick={() => setPhotos(p => p + 2)}><IconCamera size={15} />Add photos</button><span className="small t2">{photos} photos as evidence</span></div>
      <Check on={happy} onChange={setHappy} label="Customer is happy with the fix" />
    </Modal>
  );
}

/* ===================== 23. Final review and project closure ===================== */
export function CloseProjectModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq, updateJob, snags } = useStore();
  const c = e.ops?.completion;
  const items: [string, string][] = [
    ['Completion evidence', `${c?.photos || 0} photos · checklist complete`],
    ['Customer signature', c?.signed ? `Signed ${c.on}` : 'Missing'],
    ['Nothing outstanding', `${openSnags(e, snags as any).length} open snags · ${c?.snags || 0} reported and fixed`],
    ['Closure conditions met', 'Building regulations (FENSA) registered · waste removed'],
  ];
  const [on, setOn] = useState(items.map(() => false));
  const [publish, setPublish] = useState(true);
  const t = totalsOf(e);
  const save = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), closed: todayShort() }, next: 'Check final payment', nextDue: fmtDate(addDays(TODAY, 7)) }),
      { kind: 'email-out', title: 'Your project is complete', body: `Dear ${e.name}, thank you for choosing Jadeite. Your 10-year guarantee, FENSA certificate and care guide are now in your portal. Your final invoice for ${gbp(t.completion || 0)} has been sent.`, who: ME });
    if (e.jobId) updateJob(e.jobId, { stage: 'Complete', checklist: 100, next: 'Final payment', due: fmtDate(addDays(TODAY, 7)) }, 'Project closed. Guarantee and care documents published.');
    toast('Project closed · guarantee published · final invoice sent');
    onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Final review and close the project" sub={`${e.name} · ${e.jobId}`} onClose={onClose} width={640} footer={<Foot onClose={onClose} onSave={save} disabled={!on.every(Boolean)} label="Close project" icon={<IconLock size={16} />} />}>
      <Checklist items={items} on={on} set={setOn} />
      <div className="vstack" style={{ gap: 8 }}>
        <Check on={publish} onChange={setPublish} label="Publish these to the customer portal" />
        <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>{['10-year guarantee.pdf', 'FENSA certificate.pdf', 'Care guide.pdf'].map(f => <FileChip key={f} name={f} sub="For the customer" />)}</div>
      </div>
      <span className="tiny muted">If anything does not meet the normal rules, ask a director to approve before closing.</span>
    </Modal>
  );
}

/* ===================== 24. Final payment tracking ===================== */
export function FinalPaymentModal({ e, onClose, onDone }: P) {
  const toast = useToast();
  const { updEnq } = useStore();
  const t = totalsOf(e);
  const remind = () => {
    updEnq(e.id, { next: 'Chase final payment', nextDue: fmtDate(addDays(TODAY, 3)) }, { kind: 'reminder', title: 'Final payment reminder sent', body: `Dear ${e.name}, a friendly reminder that ${gbp(t.completion || 0)} is due. You can pay from the link in your portal.`, who: ME });
    toast('Reminder sent to the customer'); onClose();
  };
  const paid = () => {
    updEnq(e.id, x => ({ ops: { ...(x.ops || {}), paid: todayShort() }, next: 'In guarantee', nextDue: '—' }), { kind: 'system', title: 'Paid in full · matched in Xero', body: `Final ${gbp(t.completion || 0)} received. Nothing left to pay.`, who: 'Xero' });
    toast('Paid in full · now in aftercare'); onDone?.('overview'); onClose();
  };
  return (
    <Modal title="Final payment" sub={`${e.name} · total ${gbp(t.total)} inc. VAT`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Close</button><button className="btn btn-outline" onClick={remind}><IconBellRinging size={16} />Send reminder</button><button className="btn btn-primary" onClick={paid}><IconCurrencyPound size={16} />Paid — matched in Xero</button></>}>
      <XeroBox rows={[['Deposit (50%)', gbp(t.deposit), 'ok'], ['Stage payment (40%)', gbp(t.stage || 0), 'ok'], ['On completion (10%)', gbp(t.completion || 0), e.nextDue === 'Overdue' ? 'err' : 'warn']]} />
      <div className="alert info small"><IconInfoCircle size={16} />Payment is tracked separately from the work. The project is already closed.</div>
    </Modal>
  );
}

/* ===================== One place that opens the right pop-up for any step ===================== */
export function ActionModal({ k, e, onClose, onDone }: { k: string; e: EnquiryX; onClose: () => void; onDone?: (tab: string) => void }) {
  const { events } = useStore();
  const p = { e, onClose, onDone };
  const fit = installOf(e, events);
  const waiting = events.find(ev => ev.job === e.jobId && e.jobId && ev.team === 'un');
  switch (k) {
    case 'assign': return <AssignModal enquiryId={e.id} onClose={onClose} />;
    case 'route': return <RouteModal id={e.id} onClose={onClose} />;
    case 'contact': return <ContactModal {...p} />;
    case 'email': return <ContactModal {...p} logOnly="email" />;
    case 'call': return <ContactModal {...p} logOnly="call" />;
    case 'appt': return <BookApptModal {...p} />;
    case 'apptDone': return <ApptDoneModal {...p} />;
    case 'fpSurvey': return <FramepointSurveyModal {...p} />;
    case 'quote': return <SendQuoteModal {...p} />;
    case 'reply': return <ReplyModal {...p} />;
    case 'decide': case 'won': return <WonModal {...p} />;
    case 'lost': return <LostModal {...p} />;
    case 'revise': return <ReviseQuoteModal {...p} />;
    case 'checks': return <OfficeChecksModal {...p} />;
    case 'finalBook': return <BookFinalSurveyModal {...p} />;
    case 'finalDone': return e.finalSurvey ? <FinalSurveyModal {...p} /> : null;
    case 'ready': return <ReadinessModal {...p} />;
    case 'verify': return <VerifyOrderModal {...p} />;
    case 'order': return <OrderModal {...p} />;
    case 'supplier': return <VendorConfirmModal {...p} />;
    case 'delivery': return <DeliveryStatusModal {...p} />;
    case 'receive': return <ReceiveDeliveryModal {...p} />;
    case 'issue': return <ResolveIssueModal {...p} />;
    case 'override': return <OverrideModal {...p} />;
    case 'book': return e.jobId ? <BookInstallModal jobId={e.jobId} presetDate={waiting?.date} onClose={() => { onClose(); onDone?.('install'); }} /> : null;
    case 'pack': return <JobPackModal {...p} />;
    case 'start': case 'progress': return <InstallerProgressModal {...p} />;
    case 'submit': return <CompletionModal {...p} />;
    case 'returnVisit': return <ReturnVisitModal {...p} />;
    case 'snagFixed': return <SnagFixedModal {...p} />;
    case 'close': return <CloseProjectModal {...p} />;
    case 'payment': return <FinalPaymentModal {...p} />;
    case 'aftercare': return <AddSnagModal {...p} kindDefault="Aftercare" />;
    case 'snag': return <AddSnagModal {...p} />;
    case 'resend': return <InviteModal {...p} resend />;
  }
  void fit;
  return null;
}

/* ===================== Card used on both boards ===================== */
// mode 'enquiry' = office view of the whole journey; 'pipeline' = office view of sales; 'sales' = a salesperson's own board
export function JourneyCard({ e, st, mode, onOpen, onAct, onRemind, onMove, onDragStart }: { e: EnquiryX; st: Step; mode: 'enquiry' | 'pipeline' | 'sales'; onOpen: () => void; onAct: (k: string) => void; onRemind?: () => void; onMove?: () => void; onDragStart?: () => void }) {
  const s = staffById(e.assigned);
  const won = e.stage === 'Won';
  const mine = mode === 'enquiry' ? needsOffice(st) : mode === 'pipeline' ? st.key === 'assign' || st.key === 'route' : false;
  const act = mode === 'sales' ? st.role === 'Sales' && !st.wait && !won : mine;
  const late = !['Won', 'Lost'].includes(e.stage) && (e.nextDue === 'Overdue' || e.stageDays >= 5);
  const canRemind = mode !== 'sales' && late && !mine && st.role !== 'Office' && !!onRemind;
  const status = mode !== 'enquiry' && won ? `With the office · ${st.status}` : st.status;
  return (
    <div className={`kcard ${mine ? 'kcard-mine' : ''} ${late && !mine ? 'kcard-late' : ''}`} draggable={!!onDragStart} onDragStart={onDragStart} onClick={onOpen}>
      {mine && <span className="kcard-flag"><IconAlertTriangle size={12} />Your turn</span>}
      <div className="hstack" style={{ gap: 10 }}>
        <img src={IMG[e.photo]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} />
        <div className="vstack" style={{ gap: 2, minWidth: 0 }}><b style={{ fontSize: 13 }}>{e.name}</b><span className="tiny muted">{e.product} · {e.postcode}</span></div>
      </div>
      <div className="between"><b style={{ fontSize: 14 }}>{e.value ? gbp(e.value) : '—'}</b>{mode === 'sales' ? <Tag tone="grey">{e.source}</Tag> : s ? <span className="hstack tiny t2" style={{ gap: 6 }}>{s.name.split(' ')[0]}<Avatar i={s.initials} size={24} /></span> : e.type === 'Sales' ? <Tag tone="warn">Unassigned</Tag> : <Tag tone="warn">{e.type}</Tag>}</div>
      <div className="vstack" style={{ gap: 6, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
        <span className="small" style={{ color: 'var(--text-2)' }}>{status}</span>
        {!(mode !== 'enquiry' && won) && <span className="hstack tiny" style={{ gap: 6, flexWrap: 'wrap' }}><Tag tone={roleTone[st.role]}>{st.role}</Tag><span className="muted">Next: {st.label}</span>{e.nextDue && !['—', 'Done'].includes(e.nextDue) && <span style={{ color: e.nextDue === 'Overdue' ? 'var(--err)' : 'var(--muted)', fontWeight: e.nextDue === 'Overdue' ? 600 : 400 }}>· {e.nextDue}</span>}</span>}
        {late && mode !== 'sales' && <span className="tiny" style={{ color: 'var(--err)', fontWeight: 600 }}>{e.stageDays} day{e.stageDays === 1 ? '' : 's'} in {e.stage}</span>}
      </div>
      {(act || canRemind) && (
        <div className="hstack" style={{ gap: 6 }} onClick={ev => ev.stopPropagation()}>
          {act ? <button className={`btn ${mode === 'sales' ? 'btn-dark' : 'btn-primary'} btn-xs`} style={{ flex: 1 }} onClick={() => onAct(st.key === 'decide' ? 'won' : st.key)}>{st.icon}{st.label}</button>
            : <><button className="btn btn-dark btn-xs" style={{ flex: 1 }} onClick={onRemind}><IconBellRinging size={13} />Remind {st.role === 'Sales' ? s?.name.split(' ')[0] : st.role.toLowerCase()}</button>{onMove && st.role === 'Sales' && <button className="btn btn-outline btn-xs" style={{ flex: 1 }} onClick={onMove}>Move</button>}</>}
        </div>
      )}
    </div>
  );
}

// Reminder for whoever has the next step (salesperson, surveyor or installer team)
export function remindText(e: EnquiryX, st: Step, events: DiaryEvent[]) {
  const who = st.role === 'Sales' ? staffById(e.assigned)?.name : st.role === 'Surveyor' ? staffById(e.finalSurvey?.surveyor)?.name : st.role === 'Installer' ? crewTeam(installOf(e, events))?.name : 'the office';
  return { who: who || 'the team', body: `Please ${st.label.toLowerCase()} for ${e.name}.` };
}
