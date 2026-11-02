// Shared, in-memory state so every Surveyor portal step updates the whole platform.
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'jadeite-surveyor-portal-demo-v1';
import * as M from './mock';
import { setRoster } from './crew';
import { SEED, EXTRA_ENQUIRIES, Lifecycle, Comm, seedValue } from './lifecycle';

export const TODAY = '2026-10-16';

export const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', opts);
export const dayDiff = (a: string, b: string) => Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000);
export const mondayOf = (iso: string) => { const d = new Date(iso + 'T12:00:00'); const wd = (d.getDay() + 6) % 7; return addDays(iso, -wd); };
const rangesOverlap = (s1: string, d1: number, s2: string, d2: number) => s1 <= addDays(s2, d2 - 1) && s2 <= addDays(s1, d1 - 1);

export type HistoryItem = { when: string; who: string; what: string };
export type Task = { id: string; title: string; owner: string; due: string; job?: string; enq?: string; done: boolean };
export type Appt = { id: string; kind: 'Sales visit' | 'Survey' | 'Follow-up call' | 'Snag visit' | 'Time off'; customer: string; who: string; date: string; time: string; job?: string; enq?: string; snag?: string; address?: string; synced: boolean; status: string; note?: string };
// team is 'crew' for bookings made with individual installers, or 'un' while a job waits for installers.
export type DiaryEvent = { id: string; team: string; crew?: string[]; time?: string; note?: string; date: string; days: number; kind: 'install' | 'survey' | 'delivery' | 'leave' | 'snag'; title: string; sub: string; photo: keyof typeof M.IMG; job?: string };
export type Email = { id: string; from: string; subject: string; preview: string; when: string; linked?: string };
export type EnquiryX = M.Enquiry & Lifecycle & { type: 'Sales' | 'Existing job' | 'Aftercare'; followUp?: string; stageDays: number; routedTo?: string };
export type Order = { ref: string; job: string; customer: string; supplier: string; ordered: string; confirmed: boolean; expected: string; frames: string; status: string; tone: string; checks: number; items?: string; confirmRef?: string; enquiry?: string };
export type JobX = M.Job & { history: HistoryItem[]; signedOff?: { by: string; when: string; refused?: string }; installDate?: string; installDays?: number };

const C = (crew: string[], e: Omit<DiaryEvent, 'team' | 'crew'>): DiaryEvent => ({ team: 'crew', crew, ...e });
const initialEvents: DiaryEvent[] = [
  C(['ak', 'jp', 'cr'], { id: 'ev7', date: '2026-10-08', days: 2, kind: 'install', time: '08:00 – 09:00', title: 'Mrs Patel · bi-folds', sub: 'JG-10471 · Oadby', photo: 'bifold', job: 'JG-10471' }),
  C(['ak', 'jp', 'sp'], { id: 'ev2', date: '2026-10-12', days: 3, kind: 'install', time: '08:00 – 09:00', title: 'Mr Khan · orangery roof', sub: 'JG-10455 · Harrogate', photo: 'orangery', job: 'JG-10455' }),
  C(['bc'], { id: 'ev4', date: '2026-10-12', days: 1, kind: 'delivery', title: 'Workshop · glazing beads', sub: 'Head office workshop', photo: 'window' }),
  C(['dh', 'lb'], { id: 'ev1', date: '2026-10-13', days: 1, kind: 'delivery', title: 'Workshop · frame prep', sub: 'Smiths order', photo: 'window' }),
  C(['tw'], { id: 'ev5', date: '2026-10-14', days: 1, kind: 'snag', time: '09:00 – 10:00', title: 'Mrs Patel · snag visit', sub: 'JG-10471 · handle', photo: 'bifold', job: 'JG-10471' }),
  C(['ak', 'jp'], { id: 'ev3', date: '2026-10-16', days: 2, kind: 'install', time: '08:00 – 09:00', title: 'Hartley Dental · 10 windows', sub: 'JG-10493 · Oadby', photo: 'house', job: 'JG-10493' }),
  C(['bc', 'sp'], { id: 'ev10', date: '2026-10-19', days: 2, kind: 'delivery', title: 'Workshop · frame prep', sub: 'Head office workshop', photo: 'window' }),
  C(['tw'], { id: 'lv1', date: '2026-10-21', days: 3, kind: 'leave', title: 'Tom Wright on leave', sub: 'Annual leave', photo: 'window' }),
  C(['dh', 'lb', 'cr'], { id: 'ev6', date: '2026-10-22', days: 2, kind: 'install', time: '08:00 – 09:00', title: 'Sarah & David Smith · windows & door', sub: 'JG-10482 · Leicester', photo: 'house', job: 'JG-10482' }),
  C(['sp'], { id: 'lv2', date: '2026-10-26', days: 2, kind: 'leave', title: 'Sam Price at college', sub: 'Apprentice college days', photo: 'window' }),
  C(['cr', 'sp', 'bc'], { id: 'ev11', date: '2026-10-29', days: 1, kind: 'delivery', title: 'Training day', sub: 'Working at height refresher', photo: 'window' }),
  C(['lb'], { id: 'lv3', date: '2026-11-03', days: 3, kind: 'leave', title: 'Lee Brooks on leave', sub: 'Annual leave', photo: 'window' }),
  C(['dh', 'cr'], { id: 'ev8', date: '2026-09-29', days: 1, kind: 'install', time: '08:00 – 09:00', title: 'The Greens · front door', sub: 'JG-10433 · Ilkley', photo: 'door', job: 'JG-10433' }),
  C(['ak', 'jp'], { id: 'ev9', date: '2026-06-09', days: 2, kind: 'install', time: '08:00 – 09:00', title: 'Mrs Cooper · windows', sub: 'JG-10398 · Ripon', photo: 'window', job: 'JG-10398' }),
];

const initialTasks: Task[] = [
  { id: 'tk1', title: 'Check the Smiths delivery is on track', owner: 'sm', due: TODAY, job: 'JG-10482', done: false },
  { id: 'tk2', title: 'Book installation for The Bakers', owner: 'sm', due: TODAY, job: 'JG-10477', done: false },
  { id: 'tk3', title: 'Send balance reminder to Mr Khan', owner: 'sm', due: '2026-10-17', job: 'JG-10455', done: false },
  { id: 'tk7', title: 'Call Mr & Mrs Taylor about their new windows', owner: 'mh', due: TODAY, enq: 'EN-2295', done: false },
  { id: 'tk8', title: 'Call Ms Ahmed back about a front door', owner: 'mh', due: '2026-10-15', enq: 'EN-2294', done: false },
  { id: 'tk9', title: 'Follow up quote with Ashby Farm', owner: 'mh', due: TODAY, enq: 'EN-2286', done: false },
  { id: 'tk10', title: 'Send the Wrights the bi-fold brochure', owner: 'mh', due: '2026-10-19', enq: 'EN-2293', done: false },
  { id: 'tk11', title: 'Ask Mr Price for a photo of the roof opening', owner: 'mh', due: '2026-10-14', enq: 'EN-2278', done: true },
  { id: 'tk5', title: 'Call back Mr Khan about new windows', owner: 'jb', due: '2026-10-14', done: false },
  { id: 'tk6', title: 'Check new Emplas price list', owner: 'sm', due: '2026-10-16', done: false },
];

const initialAppts: Appt[] = [
  { id: 'ap1', kind: 'Sales visit', customer: 'The Lees', who: 'mh', date: '2026-10-20', time: '10:00 – 11:00', address: '27 Park View, Otley', synced: true, status: 'Booked' },
  { id: 'ap3', kind: 'Follow-up call', customer: 'Ashby Farm', who: 'mh', date: TODAY, time: '14:00', synced: true, status: 'Booked' },
  { id: 'ap8', kind: 'Follow-up call', customer: 'Mrs Noble', who: 'mh', date: TODAY, time: '11:30', synced: true, status: 'Booked' },
  { id: 'ap9', kind: 'Sales visit', customer: 'Mr Price', who: 'mh', date: '2026-10-14', time: '11:00 – 12:00', address: '22 Grove Road, Ilkley', synced: true, status: 'Done' },
  { id: 'ap10', kind: 'Follow-up call', customer: 'The Wrights', who: 'mh', date: '2026-10-19', time: '17:00', synced: true, status: 'Booked' },
  // Priya Shah's visits (final surveys and an aftercare inspection)
  { id: 'sv1', kind: 'Survey', customer: 'Mrs Hughes', who: 'ps', date: TODAY, time: '10:00 – 11:30', enq: 'EN-2279', address: '9 Abbey Road, Knaresborough', synced: true, status: 'Booked' },
  { id: 'sv2', kind: 'Survey', customer: 'Mr & Mrs Collins', who: 'ps', date: TODAY, time: '13:30 – 15:00', enq: 'EN-2274', address: '17 Ripon Road, Harrogate', synced: true, status: 'Booked' },
  { id: 'sv3', kind: 'Snag visit', customer: 'Mrs Cooper', who: 'ps', date: TODAY, time: '15:30 – 16:15', enq: 'EN-2240', snag: 'SN-127', job: 'JG-10398', address: '5 Elm Close, Ripon', synced: true, status: 'Booked' },
  { id: 'sv4', kind: 'Survey', customer: 'Mrs Grant', who: 'ps', date: '2026-10-19', time: '09:00 – 10:30', enq: 'EN-2272', address: '6 Woodlands Drive, Wetherby', synced: true, status: 'Booked' },
  { id: 'sv5', kind: 'Survey', customer: 'Mr Fisher', who: 'ps', date: '2026-10-21', time: '11:00 – 12:30', enq: 'EN-2270', address: '44 Skipton Road, Ilkley', synced: true, status: 'Booked' },
  { id: 'sv6', kind: 'Time off', customer: 'Dentist', who: 'ps', date: '2026-10-22', time: '14:00 – 17:00', synced: true, status: 'Booked', note: 'Afternoon off' },
  { id: 'sv7', kind: 'Survey', customer: 'Mr Fisher', who: 'ps', date: '2026-10-13', time: '10:00 – 11:30', enq: 'EN-2270', address: '44 Skipton Road, Ilkley', synced: true, status: 'Missed' },
  { id: 'sv8', kind: 'Survey', customer: 'Dr Lowe', who: 'ps', date: '2026-10-14', time: '11:00 – 12:30', enq: 'EN-2273', address: '2 Cold Bath Road, Harrogate', synced: true, status: 'Done' },
  { id: 'ap4', kind: 'Follow-up call', customer: 'Mr Khan', who: 'jb', date: '2026-10-14', time: '11:00', synced: true, status: 'Overdue' },
  { id: 'ap5', kind: 'Sales visit', customer: 'Mr Evans', who: 'mh', date: '2026-10-21', time: '13:30 – 14:30', address: '18 Station Rd, Knaresborough', synced: true, status: 'Booked' },
  { id: 'ap7', kind: 'Follow-up call', customer: 'M. Duffy', who: 'ec', date: '2026-10-19', time: '09:30', synced: false, status: 'Booked' },
];

const initialEmails: Email[] = [
  { id: 'em1', from: 'dave.smith.home@gmail.com', subject: 'Driveway on fitting day', preview: 'Hi, it is David Smith (Harrogate). Do the fitters need the driveway clear on the 22nd? We can move both cars.', when: 'Today 09:05' },
  { id: 'em2', from: 'accounts@emplas.co.uk', subject: 'Remittance advice', preview: 'Please find attached the remittance for order SO-48213. Thank you for your payment.', when: 'Yesterday 16:40' },
  { id: 'em3', from: 'info@ripon-lettings.co.uk', subject: 'Quote for a rental flat', preview: 'Hello, we manage a flat in Ripon and need 3 new windows. Could someone come to measure?', when: 'Yesterday 11:20' },
];

const enq0: EnquiryX[] = [...M.enquiries, ...EXTRA_ENQUIRIES].map(e => ({ ...e, ...(SEED[e.id] || {}), value: seedValue(e.id) ?? e.value, type: 'Sales', stageDays: Math.min(e.daysAgo, 9), followUp: e.assigned ? e.nextDue : undefined }));
enq0.unshift({ id: 'EN-2292', name: 'Mrs Cooper', initials: 'JC', phone: '07700 900 990', email: 'j.cooper@email.co.uk', address: '5 Elm Close, Ripon', postcode: 'HG4 2BB', product: 'Window draught', source: 'Email', received: '16 Oct, 08:12', daysAgo: 0, stage: 'New Enquiry', value: 0, next: 'Route to aftercare', nextDue: 'Today', photo: 'window', type: 'Aftercare', stageDays: 0, routedTo: 'JG-10398', comms: [{ id: 'cp1', kind: 'email-in', title: 'Question about my windows', when: '16 Oct, 08:12', who: 'Mrs Cooper', body: 'Hi, one of the new windows is letting in a draught at the top. Could someone take a look?' }] });

const jobs0: JobX[] = M.jobs.map(j => ({
  ...j,
  installDate: j.id === 'JG-10482' ? '2026-10-22' : j.id === 'JG-10493' ? '2026-10-16' : j.id === 'JG-10455' ? '2026-10-12' : undefined,
  installDays: j.id === 'JG-10493' ? 3 : j.id === 'JG-10455' ? 3 : 2,
  history: [
    { when: '13 Oct 09:40', who: 'Sarah Mitchell', what: 'Supplier order SO-48238 added · Emplas confirmed' },
    { when: '02 Oct 11:24', who: 'Priya Shah', what: 'Survey submitted with 12 photos and customer signature' },
    { when: '30 Sep 19:42', who: 'Customer', what: 'Quote FP-55109 signed online in the portal' },
    { when: '28 Sep 10:00', who: 'Sarah Mitchell', what: 'Enquiry received from the website and assigned to Mike Harris' },
  ],
}));

const snags0 = [
  { id: 'SN-127', job: 'JG-10398', customer: 'Mrs Cooper', title: 'Draught at the top of a window', detail: 'Customer says one of the new windows lets in a draught at the top. Priya to inspect and say what is needed.', reported: 'Customer · 16 Oct', status: 'Visit booked', tone: 'info', severity: 'Minor', photo: 'window', owner: 'Priya Shah', kind: 'Aftercare' as 'Snag' | 'Aftercare' },
  { id: 'SN-121', job: 'JG-10398', customer: 'Mrs Cooper', title: 'Bedroom window handle loose', detail: 'Handle on the back bedroom window has come loose. Customer emailed 14 Oct.', reported: 'Customer · 14 Oct', status: 'Open', tone: 'err', severity: 'Minor', photo: 'window', owner: 'Aftercare team', kind: 'Aftercare' as 'Snag' | 'Aftercare' },
  ...M.snags.map(s => ({ ...s, kind: 'Snag' as 'Snag' | 'Aftercare' })),
];
const orders0: Order[] = M.orders.map(o => ({ ...o }));
const deliveries0 = M.deliveries.map(d => ({ ...d, problem: '' as string }));
// Visits that could not go ahead stay in the surveyor's history.
export type SurveyLog = { id: string; job: string; customer: string; address: string; date: string; time: string; surveyor: string; status: string; tone: string; photo: string; kind?: string; reason?: string; iso?: string };
const surveys0: SurveyLog[] = [{ id: 'NA-1', job: 'EN-2270', customer: 'Mr Fisher', address: '44 Skipton Road, Ilkley', date: '13 Oct', time: '10:00 – 11:30', surveyor: 'ps', status: 'No access', tone: 'err', photo: 'window', kind: 'Final survey', reason: 'No answer at the door or on the phone. Left a card.', iso: '2026-10-13' }];

type State = {
  enquiries: EnquiryX[]; jobs: JobX[]; tasks: Task[]; appts: Appt[]; events: DiaryEvent[]; emails: Email[];
  snags: typeof snags0; deliveries: typeof deliveries0; surveys: typeof surveys0; orders: Order[]; installers: M.Installer[];
};
type Ctx = State & {
  set: <K extends keyof State>(k: K, fn: (v: State[K]) => State[K]) => void;
  log: (jobId: string, what: string, who?: string) => void;
  updateJob: (id: string, patch: Partial<JobX>, what?: string) => void;
  clash: (team: string, date: string, days: number, ignoreId?: string) => DiaryEvent | undefined;
  attention: { late: JobX[]; blocked: JobX[]; notBooked: JobX[]; noNext: JobX[] };
  reset: () => void;
  updEnq: (id: string, patch: Partial<EnquiryX> | ((e: EnquiryX) => Partial<EnquiryX>), comm?: Omit<Comm, 'id' | 'when'> & { when?: string }) => void;
  now: () => string;
};
const StoreCtx = createContext<Ctx>(null as any);
export const useStore = () => useContext(StoreCtx);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const fresh: State = { enquiries: enq0, jobs: jobs0, tasks: initialTasks, appts: initialAppts, events: initialEvents, emails: initialEmails, snags: snags0, deliveries: deliveries0, surveys: surveys0, orders: orders0, installers: M.installers };
  const [s, setS] = useState<State>(() => {
    try { const raw = sessionStorage.getItem(KEY); if (raw) return { ...fresh, ...JSON.parse(raw) }; } catch {}
    return fresh;
  });
  setRoster(s.installers);
  useEffect(() => { try { sessionStorage.setItem(KEY, JSON.stringify(s)); } catch {} }, [s]);
  const reset = () => { try { sessionStorage.removeItem(KEY); } catch {} setS(fresh); };
  const set: Ctx['set'] = (k, fn) => setS(prev => ({ ...prev, [k]: fn(prev[k]) }));
  const now = () => `${fmtDate(TODAY, { day: '2-digit', month: 'short' })}, ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  const log: Ctx['log'] = (jobId, what, who = 'Sarah Mitchell') => set('jobs', js => js.map(j => (j.id === jobId ? { ...j, history: [{ when: now(), who, what }, ...j.history] } : j)));
  const updateJob: Ctx['updateJob'] = (id, patch, what) => set('jobs', js => js.map(j => (j.id === id ? { ...j, ...patch, history: what ? [{ when: now(), who: 'Sarah Mitchell', what }, ...j.history] : j.history } : j)));
  const clash: Ctx['clash'] = (team, date, days, ignoreId) => s.events.find(e => e.team === team && e.id !== ignoreId && rangesOverlap(date, days, e.date, e.days));
  const attention = useMemo(() => ({
    late: s.jobs.filter(j => j.overdue),
    blocked: s.jobs.filter(j => j.blocked),
    notBooked: s.jobs.filter(j => ['Delivery'].includes(j.stage) && !s.events.some(e => e.job === j.id && e.kind === 'install' && e.team !== 'un' && e.date >= TODAY)),
    noNext: s.jobs.filter(j => !j.next || j.next === '—'),
  }), [s.jobs, s.events]);
  const updEnq: Ctx['updEnq'] = (id, patch, comm) => set('enquiries', es => es.map(e => {
    if (e.id !== id) return e;
    const p = typeof patch === 'function' ? patch(e) : patch;
    const comms = comm ? [{ id: 'c' + Date.now() + Math.random().toString(36).slice(2, 5), when: comm.when || now(), ...comm }, ...(e.comms || [])] : e.comms;
    return { ...e, ...p, comms };
  }));
  return <StoreCtx.Provider value={{ ...s, set, log, updateJob, clash, attention, reset, updEnq, now }}>{children}</StoreCtx.Provider>;
}
