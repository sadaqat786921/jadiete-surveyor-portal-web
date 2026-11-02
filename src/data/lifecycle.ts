// Everything that happens to one enquiry, from first contact to aftercare.
// One record grows a new tab at every stage (see pages/EnquiryRecord.tsx).
import { FPSurvey, FinalSurvey, FPItem, makeFpSurvey, fpTotals } from './framepoint';
export type { FPSurvey, FinalSurvey, FPItem } from './framepoint';

export type Comm = {
  id: string;
  kind: 'email-out' | 'email-in' | 'call' | 'note' | 'system' | 'reminder';
  title: string;
  body?: string;
  when: string;
  who: string;
};

export type Appointment = {
  date: string; time: string; who: string; type: 'Home visit' | 'Showroom visit' | 'Video call';
  address: string; notes?: string; status: 'Booked' | 'Done'; outcome?: string;
};

export type Opening = { ref: string; room: string; type: string; w: number; h: number; qty: number; notes?: string };

export type Survey = {
  surveyor: string; date: string; time: string; status: 'Booked' | 'Completed'; requestedBy: string;
  openings?: Opening[]; access?: string; parking?: string; notes?: string; photos?: number; signed?: boolean; completedOn?: string;
  fp?: FPSurvey; // the Framepoint survey done by the salesperson (imported or read from the PDF)
};

export type QuoteLine = { item: string; spec: string; qty: number; unit: number; size?: string; work?: string; service?: boolean };
export type Quote = {
  ref: string; lines: QuoteLine[]; discount: number; sentOn: string; validUntil: string; sentBy: string;
  status: 'Sent' | 'Accepted' | 'Declined'; reply?: string;
  fp?: boolean; // Framepoint quote: prices include VAT, 50/40/10 payments
  files?: string[];
};

export type Invite = { status: 'Not invited' | 'Invited' | 'Active'; sentOn?: string };

export type QuoteVersion = { ref: string; on: string; total: number; note: string };

// Everything the office does after Won, step by step (see components/Journey.tsx).
export type DeliveryStatus = 'Pending' | 'Confirmed' | 'In production' | 'In transit' | 'Delivered';
export type Ops = {
  deposit?: { inv: string; amount: number; on: string };   // 11 matched in Xero before Won
  checked?: string;                                          // 12 documents and deposit verified
  revision?: { from: string; to: string; on: string };      // quote revised after the final survey
  ready?: string;                                            // contract & financial readiness
  verified?: string;                                         // 13 order verification checklist
  delivery?: DeliveryStatus;                                 // 14–15 supplier and delivery status
  received?: { on: string; ok: boolean; issue?: string; photos: number }; // 16 delivery verification
  override?: { by: string; reason: string; on: string };    // 18 audited readiness override
  pack?: string;                                             // 19 job pack released, customer told
  installerReviewed?: boolean;
  work?: 'Started' | 'Submitted';                            // 20–21 installer progress
  progress?: number;
  completion?: { on: string; photos: number; signed: boolean; snags: number };
  closed?: string;                                           // 23 project closed, guarantees published
  paid?: string;                                             // 24 final balance reconciled in Xero
  stagePaid?: string;                                        // 40% stage payment received
};

export type Lifecycle = {
  comms?: Comm[]; appt?: Appointment; survey?: Survey; quote?: Quote; lostReason?: string;
  invite?: Invite; jobId?: string; wonOn?: string; ops?: Ops; versions?: QuoteVersion[];
  finalSurvey?: FinalSurvey; // after Won: the surveyor checks every measurement before ordering
};

// Framepoint price list used to turn survey openings into quote lines.
export const PRICE: Record<string, { unit: number; spec: string }> = {
  'Casement window': { unit: 540, spec: 'uPVC A-rated, double glazed · Emplas' },
  'Sash window': { unit: 980, spec: 'uPVC vertical slider, A-rated · Emplas' },
  'Flush casement window': { unit: 690, spec: 'Flush sash, heritage finish · Emplas' },
  'Composite front door': { unit: 1980, spec: 'GRP composite, multi-point lock · Origin' },
  'Bi-fold door (3-pane)': { unit: 5600, spec: 'Aluminium, slim sightlines · Origin' },
  'Roof lantern': { unit: 3900, spec: 'Aluminium, solar-control glass · Origin' },
  'Conservatory': { unit: 17800, spec: 'Lean-to, insulated roof · to design' },
};
export const OPENING_TYPES = Object.keys(PRICE);

export const quoteTotals = (q: Pick<Quote, 'lines' | 'discount'> & { fp?: boolean }) => {
  if (q.fp) {
    const total = q.lines.reduce((a, l) => a + l.qty * l.unit, 0) - (q.discount || 0);
    const vat = Math.round(total / 6);
    const deposit = Math.round(total * 0.5), stage = Math.round(total * 0.4);
    return { sub: total - vat, vat, total, deposit, depositPct: 50, stage, completion: total - deposit - stage };
  }
  const sub = q.lines.reduce((a, l) => a + l.qty * l.unit, 0) - (q.discount || 0);
  const vat = Math.round(sub * 0.2);
  const total = sub + vat;
  return { sub, vat, total, deposit: Math.round(total * 0.25), depositPct: 25, stage: 0, completion: total - Math.round(total * 0.25) };
};

export const linesFromFp = (items: FPItem[]): QuoteLine[] => items.map(i => ({ item: `${i.no}. ${i.name}`, spec: i.product, qty: i.qty, unit: i.each, size: i.size, work: i.work, service: i.service }));

export const linesFromOpenings = (ops: Opening[]): QuoteLine[] => {
  const grouped: Record<string, number> = {};
  ops.forEach(o => { grouped[o.type] = (grouped[o.type] || 0) + o.qty; });
  return [
    ...Object.entries(grouped).map(([type, qty]) => ({ item: type, spec: PRICE[type]?.spec || '', qty, unit: PRICE[type]?.unit || 500 })),
    { item: 'Fitting, removal and disposal', spec: 'FENSA registered installers', qty: 1, unit: 450 },
  ];
};

const c = (id: string, kind: Comm['kind'], title: string, when: string, who: string, body?: string): Comm => ({ id, kind, title, when, who, body });

const SMITH_OPS: Opening[] = [
  { ref: 'W1', room: 'Lounge (front)', type: 'Casement window', w: 1770, h: 1200, qty: 2, notes: 'Bay — 2 frames' },
  { ref: 'W2', room: 'Bedroom 1', type: 'Casement window', w: 1200, h: 1050, qty: 2 },
  { ref: 'W3', room: 'Kitchen', type: 'Casement window', w: 1000, h: 900, qty: 2, notes: 'Restrictors' },
  { ref: 'D1', room: 'Front entrance', type: 'Composite front door', w: 920, h: 2090, qty: 1, notes: 'Anthracite, chrome handle' },
];
const ASHBY_OPS: Opening[] = [
  { ref: 'W1', room: 'Farmhouse — front', type: 'Flush casement window', w: 1100, h: 1200, qty: 6 },
  { ref: 'W2', room: 'Farmhouse — rear', type: 'Flush casement window', w: 900, h: 1050, qty: 6, notes: 'Chartwell green' },
];
const DUFFY_OPS: Opening[] = [{ ref: 'D1', room: 'Kitchen / garden', type: 'Bi-fold door (3-pane)', w: 2400, h: 2100, qty: 1, notes: 'Open to the left' }];
const ROBERTS_OPS: Opening[] = [{ ref: 'R1', room: 'Kitchen extension', type: 'Roof lantern', w: 2000, h: 1000, qty: 1 }];
const HUGHES_OPS: Opening[] = [
  { ref: 'W1', room: 'Lounge', type: 'Sash window', w: 950, h: 1600, qty: 2 },
  { ref: 'W2', room: 'Bedrooms', type: 'Sash window', w: 900, h: 1450, qty: 3 },
];

const quoteFrom = (ref: string, ops: Opening[], sentOn: string, validUntil: string, sentBy: string, status: Quote['status'], discount = 0, reply?: string): Quote =>
  ({ ref, lines: linesFromOpenings(ops), discount, sentOn, validUntil, sentBy, status, reply });

// Seed lifecycle data so every stage has real details to show.
export const SEED: Record<string, Lifecycle> = {
  'EN-2292': { comms: [c('mc1', 'email-in', 'Question about my windows', '16 Oct, 08:12', 'Mrs Cooper', 'Hi, one of the new windows is letting in a draught at the top. Could someone come and have a look? Thanks, Jean Cooper')] },
  'EN-2291': { comms: [c('a1', 'system', 'Enquiry received from the website', '16 Oct, 09:15', 'Website', 'Interested in 3-pane bi-fold doors to the garden. Best time to call: after 5pm.')] },
  'EN-2290': { comms: [c('b1', 'system', 'Enquiry taken by phone', '14 Oct, 11:02', 'Sarah Mitchell', 'Wants 6 windows replaced. Asked for a call back.')] },
  'EN-2288': {
    comms: [
      c('g3', 'call', 'Call with Ms Green', '13 Oct, 10:05', 'Emma Clarke', 'Likes the anthracite composite doors. Wants a brochure before booking a visit.'),
      c('g2', 'email-out', 'Thank you for your enquiry', '12 Oct, 11:00', 'Emma Clarke', 'Dear Ms Green, thank you for visiting our showroom. I will call you tomorrow to talk about your front door.'),
      c('g1', 'system', 'Enquiry taken in the showroom', '12 Oct, 10:20', 'Showroom'),
    ],
  },
  'EN-2289': {
    comms: [
      c('l4', 'email-out', 'Your home visit is booked', '14 Oct, 09:12', 'Mike Harris', 'Dear Mr and Mrs Lee, I will visit on Tuesday 20 October at 10:00 to talk about your conservatory.'),
      c('l3', 'call', 'Call with the Lees', '13 Oct, 17:30', 'Mike Harris', 'Want a lean-to conservatory, about 4m × 3m. Happy for a home visit next week.'),
      c('l2', 'email-out', 'Thank you for your enquiry', '13 Oct, 17:00', 'Mike Harris'),
      c('l1', 'system', 'Referral from Mr Khan', '13 Oct, 16:40', 'Referral'),
    ],
    appt: { date: '2026-10-20', time: '10:00 – 11:00', who: 'mh', type: 'Home visit', address: '27 Park View, Otley', status: 'Booked', notes: 'Park on the drive. Side gate to the garden.' },
  },
  'EN-2280': {
    comms: [c('e2', 'call', 'Call with Mr Evans', '22 Sep, 14:00', 'Mike Harris', 'Wants an orangery-style conservatory. Booked a design visit.'), c('e1', 'system', 'Referral', '20 Sep, 11:30', 'Referral')],
    appt: { date: '2026-10-21', time: '13:30 – 14:30', who: 'mh', type: 'Home visit', address: '18 Station Rd, Knaresborough', status: 'Booked' },
  },
  'EN-2287': {
    comms: [
      c('w4', 'note', 'Framepoint survey imported', '12 Oct, 15:10', 'James Brook', 'Measured at the visit in Framepoint. 1 door · ready to send the quote.'),
      c('w3', 'call', 'Visit with Dr Whitfield', '12 Oct, 11:00', 'James Brook', 'Chose a red composite door. Wants a survey before the quote.'),
      c('w2', 'email-out', 'Thank you for your enquiry', '10 Oct, 15:00', 'James Brook'),
      c('w1', 'system', 'Enquiry received from the website', '10 Oct, 14:05', 'Website'),
    ],
    appt: { date: '2026-10-12', time: '11:00 – 12:00', who: 'jb', type: 'Home visit', address: '3 High Street, Harrogate', status: 'Done', outcome: 'Red composite door chosen. Survey needed.' },
    survey: { surveyor: 'jb', date: '2026-10-12', time: '11:00 – 12:00', status: 'Completed', requestedBy: 'James Brook', openings: [{ ref: 'D1', room: 'Front entrance', type: 'Composite front door', w: 940, h: 2080, qty: 1, notes: 'Red, chrome furniture' }], completedOn: '12 Oct' },
  },
  'EN-2286': {
    comms: [
      c('af5', 'email-out', 'Your quote FP-55120', '09 Oct, 16:20', 'Mike Harris', 'Please find your quote attached. It is valid for 30 days.'),
      c('af4', 'note', 'Survey completed', '06 Oct, 15:00', 'Rob King', '12 openings measured. Listed outbuilding — no change to frame style.'),
      c('af3', 'email-out', 'Your survey is booked', '01 Oct, 10:00', 'Sarah Mitchell'),
      c('af2', 'call', 'Visit at Ashby Farm', '30 Sep, 10:30', 'Mike Harris', 'Wants flush casements in Chartwell green to keep the farmhouse look.'),
      c('af1', 'system', 'Referral', '28 Sep, 09:00', 'Referral'),
    ],
    appt: { date: '2026-09-30', time: '10:00 – 11:00', who: 'mh', type: 'Home visit', address: 'Ashby Road, Thirsk', status: 'Done', outcome: 'Flush casements in Chartwell green.' },
    survey: { surveyor: 'rk', date: '2026-10-06', time: '13:00 – 15:00', status: 'Completed', requestedBy: 'Mike Harris', openings: ASHBY_OPS, access: 'Farm track, good access', parking: 'Yard', notes: 'Some lintels need checking on the rear.', photos: 18, signed: true, completedOn: '06 Oct' },
    quote: quoteFrom('FP-55120', ASHBY_OPS, '09 Oct', '08 Nov', 'Mike Harris', 'Sent', 600),
  },
  'EN-2284': {
    comms: [c('r3', 'email-out', 'Your quote FP-55118', '06 Oct, 12:00', 'James Brook'), c('r2', 'note', 'Survey completed', '05 Oct, 11:00', 'Priya Shah'), c('r1', 'system', 'Enquiry taken by phone', '04 Oct, 15:10', 'Sarah Mitchell')],
    appt: { date: '2026-10-04', time: '16:00', who: 'jb', type: 'Video call', address: '11 Bridge St, Wetherby', status: 'Done', outcome: 'Roof lantern for the kitchen extension.' },
    survey: { surveyor: 'ps', date: '2026-10-05', time: '10:00 – 11:00', status: 'Completed', requestedBy: 'James Brook', openings: ROBERTS_OPS, access: 'Flat roof via ladder', parking: 'Street', photos: 9, signed: true, completedOn: '05 Oct' },
    quote: quoteFrom('FP-55118', ROBERTS_OPS, '06 Oct', '05 Nov', 'James Brook', 'Sent'),
  },
  'EN-2285': {
    comms: [
      c('d6', 'email-in', 'Re: Your quote FP-55114', '14 Oct, 19:40', 'M. Duffy', 'Thanks — we like it. Could you do the doors in grey instead of black? Then we are happy to go ahead.'),
      c('d5', 'email-out', 'Your quote FP-55114', '07 Oct, 10:00', 'Emma Clarke'),
      c('d4', 'note', 'Survey completed', '06 Oct, 10:00', 'Rob King'),
      c('d3', 'call', 'Visit with M. Duffy', '06 Oct, 09:00', 'Emma Clarke'),
      c('d2', 'email-out', 'Thank you for your enquiry', '05 Oct, 13:00', 'Emma Clarke'),
      c('d1', 'system', 'Enquiry received from the website', '05 Oct, 12:30', 'Website'),
    ],
    appt: { date: '2026-10-06', time: '09:00 – 10:00', who: 'ec', type: 'Home visit', address: '60 Kirk Lane, Otley', status: 'Done', outcome: '3-pane bi-fold to the garden.' },
    survey: { surveyor: 'rk', date: '2026-10-06', time: '10:00 – 11:00', status: 'Completed', requestedBy: 'Emma Clarke', openings: DUFFY_OPS, access: 'Side gate', parking: 'Drive', photos: 7, signed: true, completedOn: '06 Oct' },
    quote: quoteFrom('FP-55114', DUFFY_OPS, '07 Oct', '06 Nov', 'Emma Clarke', 'Sent', 0, 'Happy to go ahead if the doors are grey.'),
  },
  'EN-2283': {
    comms: [
      c('s8', 'system', 'Customer joined the portal', '01 Oct, 08:10', 'Customer'),
      c('s7', 'email-out', 'Welcome to Jadeite — your job JG-10482', '30 Sep, 20:05', 'Sarah Mitchell', 'Portal invite and deposit invoice sent.'),
      c('s6', 'email-in', 'Re: Your quote FP-55109', '30 Sep, 19:42', 'Sarah & David Smith', 'We are happy to go ahead. Quote signed online.'),
      c('s5', 'email-out', 'Your quote FP-55109', '29 Sep, 15:00', 'Mike Harris'),
      c('s4', 'note', 'Survey completed', '29 Sep, 12:00', 'Priya Shah'),
      c('s3', 'call', 'Visit with the Smiths', '28 Sep, 16:00', 'Mike Harris'),
      c('s2', 'email-out', 'Thank you for your enquiry', '28 Sep, 10:30', 'Mike Harris'),
      c('s1', 'system', 'Enquiry received from the website', '28 Sep, 10:00', 'Website'),
    ],
    appt: { date: '2026-09-28', time: '16:00 – 17:00', who: 'mh', type: 'Home visit', address: '14 Ashby Road, Leicester', status: 'Done', outcome: 'Windows and front door, anthracite grey.' },
    survey: { surveyor: 'ps', date: '2026-09-29', time: '10:00 – 11:30', status: 'Completed', requestedBy: 'Mike Harris', openings: SMITH_OPS, access: 'Front and side, easy', parking: 'Driveway', notes: 'Dog in the garden — keep the side gate shut.', photos: 12, signed: true, completedOn: '29 Sep' },
    quote: quoteFrom('FP-55109', SMITH_OPS, '29 Sep', '29 Oct', 'Mike Harris', 'Accepted', 560, 'We are happy to go ahead.'),
    invite: { status: 'Active', sentOn: '30 Sep' }, jobId: 'JG-10482', wonOn: '30 Sep',
    finalSurvey: { surveyor: 'ps', date: '2026-10-02', time: '10:00 – 11:30', status: 'Done', doneOn: '02 Oct', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3381', amount: 0, on: '30 Sep' }, checked: '01 Oct', ready: '03 Oct', verified: '05 Oct', delivery: 'In transit', override: { by: 'Mike Jadeite (Director)', reason: 'Customers away from 24 Oct. Emplas confirmed delivery on 20 Oct, two days before fitting.', on: '13 Oct' } },
  },
  'EN-2282': {
    comms: [c('k3', 'email-in', 'Quote accepted', '04 Oct, 09:00', 'The Bakers'), c('k2', 'email-out', 'Your quote FP-55104', '01 Oct, 11:00', 'Emma Clarke'), c('k1', 'system', 'Enquiry taken in the showroom', '25 Sep, 13:20', 'Showroom')],
    survey: { surveyor: 'rk', date: '2026-09-29', time: '09:00 – 10:30', status: 'Completed', requestedBy: 'Emma Clarke', openings: [{ ref: 'W1', room: 'Whole house', type: 'Casement window', w: 1100, h: 1100, qty: 8 }], photos: 14, signed: true, completedOn: '29 Sep' },
    quote: quoteFrom('FP-55104', [{ ref: 'W1', room: 'Whole house', type: 'Casement window', w: 1100, h: 1100, qty: 8 }], '01 Oct', '31 Oct', 'Emma Clarke', 'Accepted'),
    invite: { status: 'Active', sentOn: '04 Oct' }, jobId: 'JG-10477', wonOn: '04 Oct',
    finalSurvey: { surveyor: 'rk', date: '2026-10-06', time: '09:00 – 10:00', status: 'Done', doneOn: '06 Oct', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3378', amount: 0, on: '04 Oct' }, checked: '05 Oct', ready: '06 Oct', verified: '07 Oct', delivery: 'Delivered', received: { on: '15 Oct', ok: true, photos: 6 } },
  },
  'EN-2279': {
    comms: [
      c('h6', 'email-in', 'Re: Your quote FP-55126', '15 Oct, 18:20', 'Mrs Hughes', 'Thank you, we would like to go ahead. When can you fit?'),
      c('h5', 'email-out', 'Your quote FP-55126', '12 Oct, 14:00', 'Mike Harris'),
      c('h4', 'note', 'Survey completed', '11 Oct, 12:00', 'Priya Shah'),
      c('h3', 'call', 'Visit with Mrs Hughes', '09 Oct, 10:00', 'Mike Harris'),
      c('h2', 'email-out', 'Thank you for your enquiry', '07 Oct, 12:00', 'Mike Harris'),
      c('h1', 'system', 'Enquiry received from the website', '07 Oct, 11:20', 'Website'),
    ],
    appt: { date: '2026-10-09', time: '10:00 – 11:00', who: 'mh', type: 'Home visit', address: '9 Abbey Road, Knaresborough', status: 'Done', outcome: '5 sash windows, white.' },
    survey: { surveyor: 'ps', date: '2026-10-11', time: '10:00 – 11:30', status: 'Completed', requestedBy: 'Mike Harris', openings: HUGHES_OPS, access: 'Front, scaffold not needed', parking: 'Street', notes: 'Victorian terrace — keep sash style.', photos: 11, signed: true, completedOn: '11 Oct' },
    quote: quoteFrom('FP-55126', HUGHES_OPS, '12 Oct', '11 Nov', 'Mike Harris', 'Accepted', 0, 'We would like to go ahead.'),
    invite: { status: 'Not invited' }, wonOn: '16 Oct',
    finalSurvey: { surveyor: 'ps', date: '2026-10-16', time: '10:00 – 11:30', status: 'Booked' },
    ops: { deposit: { inv: 'INV-3401', amount: 0, on: '16 Oct' }, checked: '16 Oct' },
  },
  'EN-2276': {
    comms: [c('hd3', 'note', 'Installer started the job', '16 Oct, 08:20', 'Team 2', 'Day 1 of 3. Front elevation first.'), c('hd2', 'system', 'Job pack released', '13 Oct, 15:00', 'Sarah Mitchell'), c('hd1', 'system', 'Marked as Won', '18 Sep, 12:00', 'James Brook')],
    survey: { surveyor: 'jb', date: '2026-08-25', time: '10:00', status: 'Completed', requestedBy: 'James Brook', openings: [{ ref: 'W1', room: 'Surgery rooms', type: 'Casement window', w: 1200, h: 1200, qty: 10 }], completedOn: '25 Aug' },
    quote: quoteFrom('FP-55070', [{ ref: 'W1', room: 'Surgery rooms', type: 'Casement window', w: 1200, h: 1200, qty: 10 }], '27 Aug', '26 Sep', 'James Brook', 'Accepted'),
    invite: { status: 'Active', sentOn: '19 Sep' }, jobId: 'JG-10493', wonOn: '18 Sep',
    finalSurvey: { surveyor: 'rk', date: '2026-09-22', time: '09:00 – 10:30', status: 'Done', doneOn: '22 Sep', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3352', amount: 0, on: '18 Sep' }, checked: '19 Sep', ready: '23 Sep', verified: '24 Sep', delivery: 'Delivered', received: { on: '14 Oct', ok: true, photos: 8 }, pack: '13 Oct', installerReviewed: true, work: 'Started', progress: 30 },
  },
  'EN-2271': {
    comms: [c('pt3', 'note', 'Completion submitted with 2 snags', '09 Oct, 17:10', 'Team 2', 'Signed by Mrs Patel. Scratch on the bi-fold frame and a stiff window handle.'), c('pt2', 'system', 'Installation booked', '01 Oct, 10:00', 'Sarah Mitchell'), c('pt1', 'system', 'Marked as Won', '20 Aug, 15:00', 'Mike Harris')],
    survey: { surveyor: 'mh', date: '2026-08-10', time: '10:00', status: 'Completed', requestedBy: 'Mike Harris', openings: [{ ref: 'D1', room: 'Kitchen / garden', type: 'Bi-fold door (3-pane)', w: 3000, h: 2100, qty: 1 }, { ref: 'W1', room: 'Rear bedroom', type: 'Casement window', w: 1100, h: 1050, qty: 2 }], completedOn: '10 Aug' },
    quote: quoteFrom('FP-55061', [{ ref: 'D1', room: 'Kitchen / garden', type: 'Bi-fold door (3-pane)', w: 3000, h: 2100, qty: 1 }, { ref: 'W1', room: 'Rear bedroom', type: 'Casement window', w: 1100, h: 1050, qty: 2 }], '12 Aug', '11 Sep', 'Mike Harris', 'Accepted'),
    invite: { status: 'Active', sentOn: '21 Aug' }, jobId: 'JG-10471', wonOn: '20 Aug',
    finalSurvey: { surveyor: 'ps', date: '2026-08-26', time: '10:00 – 11:30', status: 'Done', doneOn: '26 Aug', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3302', amount: 0, on: '20 Aug' }, checked: '21 Aug', ready: '27 Aug', verified: '28 Aug', delivery: 'Delivered', received: { on: '05 Oct', ok: true, photos: 5 }, pack: '06 Oct', installerReviewed: true, work: 'Submitted', progress: 100, completion: { on: '09 Oct', photos: 14, signed: true, snags: 2 } },
  },
  'EN-2268': {
    comms: [c('kh3', 'note', 'Snag fixed', '13 Oct, 16:00', 'Team 2', 'Grey trim fitted. Photos added.'), c('kh2', 'note', 'Completion submitted with 1 snag', '14 Oct, 17:30', 'Team 2'), c('kh1', 'system', 'Marked as Won', '12 Aug, 10:00', 'Emma Clarke')],
    survey: { surveyor: 'ec', date: '2026-08-02', time: '10:00', status: 'Completed', requestedBy: 'Emma Clarke', openings: [{ ref: 'R1', room: 'Orangery', type: 'Roof lantern', w: 2400, h: 1200, qty: 1 }], completedOn: '02 Aug' },
    quote: quoteFrom('FP-55052', [{ ref: 'R1', room: 'Orangery', type: 'Roof lantern', w: 2400, h: 1200, qty: 1 }], '04 Aug', '03 Sep', 'Emma Clarke', 'Accepted'),
    invite: { status: 'Active', sentOn: '13 Aug' }, jobId: 'JG-10455', wonOn: '12 Aug',
    finalSurvey: { surveyor: 'rk', date: '2026-08-18', time: '09:00 – 10:00', status: 'Done', doneOn: '18 Aug', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3290', amount: 0, on: '12 Aug' }, checked: '13 Aug', ready: '19 Aug', verified: '20 Aug', delivery: 'Delivered', received: { on: '09 Oct', ok: true, photos: 4 }, pack: '09 Oct', installerReviewed: true, work: 'Submitted', progress: 100, completion: { on: '14 Oct', photos: 18, signed: true, snags: 1 }, paid: '14 Oct' },
  },
  'EN-2262': {
    comms: [c('gr3', 'reminder', 'Balance reminder sent', '09 Oct, 09:00', 'Sarah Mitchell', 'Final invoice INV-3348 is overdue.'), c('gr2', 'system', 'Project closed · guarantee published', '30 Sep, 16:00', 'Sarah Mitchell'), c('gr1', 'system', 'Marked as Won', '20 Jul, 11:00', 'Emma Clarke')],
    survey: { surveyor: 'ec', date: '2026-07-14', time: '10:00', status: 'Completed', requestedBy: 'Emma Clarke', openings: [{ ref: 'D1', room: 'Front entrance', type: 'Composite front door', w: 920, h: 2090, qty: 1 }], completedOn: '14 Jul' },
    quote: quoteFrom('FP-55031', [{ ref: 'D1', room: 'Front entrance', type: 'Composite front door', w: 920, h: 2090, qty: 1 }], '16 Jul', '15 Aug', 'Emma Clarke', 'Accepted'),
    invite: { status: 'Active', sentOn: '21 Jul' }, jobId: 'JG-10433', wonOn: '20 Jul',
    finalSurvey: { surveyor: 'ps', date: '2026-07-24', time: '09:00 – 10:00', status: 'Done', doneOn: '24 Jul', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3255', amount: 0, on: '20 Jul' }, checked: '21 Jul', ready: '25 Jul', verified: '26 Jul', delivery: 'Delivered', received: { on: '26 Sep', ok: true, photos: 3 }, pack: '26 Sep', installerReviewed: true, work: 'Submitted', progress: 100, completion: { on: '29 Sep', photos: 9, signed: true, snags: 1 }, closed: '30 Sep' },
  },
  'EN-2240': {
    comms: [c('jc2', 'system', 'Project closed and paid in full', '12 Jun, 10:00', 'Sarah Mitchell'), c('jc1', 'system', 'Marked as Won', '10 May, 10:00', 'Emma Clarke')],
    survey: { surveyor: 'ec', date: '2026-05-05', time: '10:00', status: 'Completed', requestedBy: 'Emma Clarke', openings: [{ ref: 'W1', room: 'Front and back', type: 'Casement window', w: 1100, h: 1100, qty: 4 }], completedOn: '05 May' },
    quote: quoteFrom('FP-54980', [{ ref: 'W1', room: 'Front and back', type: 'Casement window', w: 1100, h: 1100, qty: 4 }], '07 May', '06 Jun', 'Emma Clarke', 'Accepted'),
    invite: { status: 'Active', sentOn: '11 May' }, jobId: 'JG-10398', wonOn: '10 May',
    finalSurvey: { surveyor: 'rk', date: '2026-05-14', time: '09:00 – 10:00', status: 'Done', doneOn: '14 May', signed: true, notes: 'All sizes confirmed.' },
    ops: { deposit: { inv: 'INV-3101', amount: 0, on: '10 May' }, checked: '11 May', ready: '15 May', verified: '15 May', delivery: 'Delivered', received: { on: '05 Jun', ok: true, photos: 4 }, pack: '06 Jun', installerReviewed: true, work: 'Submitted', progress: 100, completion: { on: '10 Jun', photos: 10, signed: true, snags: 0 }, closed: '11 Jun', paid: '12 Jun' },
  },
  // ----- Mike Harris's deals (Sales portal demo) -----
  'EN-2295': { comms: [
    c('ta2', 'system', 'Assigned to you by Sarah Mitchell', '16 Oct, 08:52', 'Sarah Mitchell', 'Next action: call the customer by today.'),
    c('ta1', 'system', 'Enquiry received from the website', '16 Oct, 08:40', 'Website', 'Would like 7 windows replaced in a 1950s semi. Best to call after 4pm.'),
  ] },
  'EN-2294': { comms: [
    c('ah2', 'system', 'Assigned to you by Sarah Mitchell', '15 Oct, 15:30', 'Sarah Mitchell', 'Next action: call the customer by 15 Oct.'),
    c('ah1', 'system', 'Enquiry taken by phone', '15 Oct, 15:20', 'Sarah Mitchell', 'Wants a new front door, grey or black. Asked for a call back.'),
  ] },
  'EN-2293': { comms: [
    c('wr3', 'call', 'Call with the Wrights', '14 Oct, 17:20', 'Mike Harris', 'Want 4-pane bi-folds to a new kitchen extension. Builder finishes mid November. Happy to have a home visit.'),
    c('wr2', 'email-out', 'Thank you for your enquiry', '13 Oct, 11:00', 'Mike Harris', 'Dear Mr and Mrs Wright, thank you for getting in touch. I will call you this week to talk about your bi-fold doors.'),
    c('wr1', 'system', 'Referral from Mrs Patel', '13 Oct, 10:15', 'Referral'),
  ] },
  'EN-2278': {
    comms: [
      c('pr4', 'note', 'Sales appointment done', '14 Oct, 12:10', 'Mike Harris', 'Roof lantern over the new kitchen, about 2m × 1m. Anthracite outside, white inside. Measured and took photos.'),
      c('pr3', 'email-out', 'Your appointment is booked', '08 Oct, 10:00', 'Mike Harris', 'Dear Mr Price, I will visit on Wednesday 14 October at 11:00 to talk about your roof lantern.'),
      c('pr2', 'call', 'Call with Mr Price', '07 Oct, 16:40', 'Mike Harris', 'Kitchen extension nearly finished. Wants a lantern in before Christmas.'),
      c('pr1', 'system', 'Enquiry received from the website', '06 Oct, 09:30', 'Website'),
    ],
    appt: { date: '2026-10-14', time: '11:00 – 12:00', who: 'mh', type: 'Home visit', address: '22 Grove Road, Ilkley', status: 'Done', outcome: 'Roof lantern 2m × 1m, anthracite outside and white inside.' },
  },
  'EN-2277': {
    comms: [
      c('nb6', 'email-in', 'Re: Your quote', '15 Oct, 18:05', 'Mrs Noble', 'Thank you Mike. Could the two bathroom windows have obscure glass? If so, we would like to go ahead.'),
      c('nb5', 'email-out', 'Your Jadeite quote — please review', '05 Oct, 15:30', 'Mike Harris'),
      c('nb4', 'note', 'Framepoint survey imported', '05 Oct, 11:00', 'Framepoint', '5 frames measured by Mike Harris at the visit.'),
      c('nb3', 'call', 'Visit with Mrs Noble', '01 Oct, 10:00', 'Mike Harris', 'White casements for the front and the bathroom. Wants them before winter.'),
      c('nb2', 'email-out', 'Thank you for visiting our showroom', '29 Sep, 16:00', 'Mike Harris'),
      c('nb1', 'system', 'Enquiry taken in the showroom', '29 Sep, 14:00', 'Showroom'),
    ],
    appt: { date: '2026-10-01', time: '10:00 – 11:00', who: 'mh', type: 'Home visit', address: '31 Kent Road, Harrogate', status: 'Done', outcome: 'White casements, front and bathroom.' },
    survey: { surveyor: 'mh', date: '2026-10-01', time: '10:00 – 11:00', status: 'Completed', requestedBy: 'Mike Harris', openings: [{ ref: 'W1', room: 'Front rooms', type: 'Casement window', w: 1200, h: 1200, qty: 3 }, { ref: 'W2', room: 'Bathroom', type: 'Casement window', w: 700, h: 900, qty: 2, notes: 'Obscure glass?' }], completedOn: '05 Oct' },
    quote: quoteFrom('FP-55122', [{ ref: 'W1', room: 'Front rooms', type: 'Casement window', w: 1200, h: 1200, qty: 3 }, { ref: 'W2', room: 'Bathroom', type: 'Casement window', w: 700, h: 900, qty: 2 }], '05 Oct', '04 Nov', 'Mike Harris', 'Sent', 0, 'Could the two bathroom windows have obscure glass? If so, we would like to go ahead.'),
  },
  'EN-2275': {
    comms: [
      c('sh4', 'system', 'Marked as Lost · Went with another company', '09 Oct, 09:30', 'Mike Harris', 'Chose a local firm that could fit sooner.'),
      c('sh3', 'email-in', 'Re: Your quote', '08 Oct, 20:10', 'Mr Shaw', 'Thank you for your time, but we have decided to go with another company.'),
      c('sh2', 'email-out', 'Your Jadeite quote — please review', '25 Sep, 12:00', 'Mike Harris'),
      c('sh1', 'system', 'Enquiry received from the website', '18 Sep, 13:10', 'Website'),
    ],
    appt: { date: '2026-09-22', time: '16:00 – 17:00', who: 'mh', type: 'Home visit', address: '12 Otley Road, Leeds', status: 'Done', outcome: '6 white casements.' },
    survey: { surveyor: 'mh', date: '2026-09-22', time: '16:00', status: 'Completed', requestedBy: 'Mike Harris', openings: [{ ref: 'W1', room: 'Whole house', type: 'Casement window', w: 1100, h: 1100, qty: 6 }], completedOn: '24 Sep' },
    quote: quoteFrom('FP-55107', [{ ref: 'W1', room: 'Whole house', type: 'Casement window', w: 1100, h: 1100, qty: 6 }], '25 Sep', '25 Oct', 'Mike Harris', 'Declined', 0, 'We have decided to go with another company.'),
    lostReason: 'Went with another company — chose a local firm that could fit sooner',
  },
  'EN-2273': {
    comms: [
      c('lw6', 'note', 'Final survey done · 1 size changed', '14 Oct, 12:30', 'Priya Shah', 'The kitchen window opening is 30mm narrower than measured. The quote needs a new version before we order.'),
      c('lw5', 'system', 'Documents and deposit checked', '03 Oct, 10:00', 'Sarah Mitchell'),
      c('lw4', 'system', 'Marked as Won', '02 Oct, 17:00', 'Mike Harris', 'Deposit paid and matched in Xero. Handed to the office.'),
      c('lw3', 'email-in', 'Re: Your quote', '02 Oct, 09:15', 'Dr Lowe', 'We are happy to go ahead. Deposit paid this morning.'),
      c('lw2', 'email-out', 'Your Jadeite quote — please review', '24 Sep, 14:00', 'Mike Harris'),
      c('lw1', 'system', 'Enquiry received from the website', '15 Sep, 10:00', 'Website'),
    ],
    appt: { date: '2026-09-18', time: '13:30 – 14:30', who: 'mh', type: 'Home visit', address: '2 Cold Bath Road, Harrogate', status: 'Done', outcome: 'Windows and back door, white.' },
    survey: { surveyor: 'mh', date: '2026-09-18', time: '13:30', status: 'Completed', requestedBy: 'Mike Harris', openings: [{ ref: 'W1', room: 'Kitchen', type: 'Casement window', w: 1200, h: 1050, qty: 1 }, { ref: 'W2', room: 'Lounge', type: 'Casement window', w: 1500, h: 1200, qty: 2 }, { ref: 'D1', room: 'Back door', type: 'Composite front door', w: 900, h: 2050, qty: 1 }], completedOn: '23 Sep' },
    quote: quoteFrom('FP-55111', [{ ref: 'W1', room: 'Kitchen', type: 'Casement window', w: 1200, h: 1050, qty: 1 }, { ref: 'W2', room: 'Lounge', type: 'Casement window', w: 1500, h: 1200, qty: 2 }, { ref: 'D1', room: 'Back door', type: 'Composite front door', w: 900, h: 2050, qty: 1 }], '24 Sep', '24 Oct', 'Mike Harris', 'Accepted', 0, 'We are happy to go ahead.'),
    invite: { status: 'Not invited' }, wonOn: '02 Oct',
    finalSurvey: { surveyor: 'ps', date: '2026-10-14', time: '11:00 – 12:30', status: 'Done', doneOn: '14 Oct', signed: true, notes: 'Kitchen window opening is 30mm narrower than measured.' },
    ops: { deposit: { inv: 'INV-3392', amount: 0, on: '02 Oct' }, checked: '03 Oct' },
  },
  // ----- Final surveys booked for Priya Shah (Surveyor portal demo) -----
  'EN-2274': {
    comms: [
      c('co5', 'email-out', 'Your final survey is booked', '14 Oct, 11:20', 'Sarah Mitchell', 'Dear Mr and Mrs Collins, Priya Shah will visit on Friday 16 October between 1:30 and 3pm to check the exact sizes before we order.'),
      c('co4', 'system', 'Documents and deposit checked', '13 Oct, 10:10', 'Sarah Mitchell'),
      c('co3', 'system', 'Marked as Won', '12 Oct, 16:00', 'James Brook', 'Deposit paid and matched in Xero.'),
      c('co2', 'email-out', 'Your Jadeite quote — please review', '06 Oct, 15:00', 'James Brook'),
      c('co1', 'system', 'Enquiry received from the website', '22 Sep, 10:30', 'Website'),
    ],
    appt: { date: '2026-10-02', time: '10:00 – 11:00', who: 'jb', type: 'Home visit', address: '17 Ripon Road, Harrogate', status: 'Done', outcome: 'White casements and a grey back door. Ring the doorbell twice — it is quiet.' },
    survey: { surveyor: 'jb', date: '2026-10-02', time: '10:00', status: 'Completed', requestedBy: 'James Brook', openings: [{ ref: 'W1', room: 'Lounge', type: 'Casement window', w: 1800, h: 1200, qty: 1 }, { ref: 'W2', room: 'Bedrooms', type: 'Casement window', w: 1200, h: 1050, qty: 3 }, { ref: 'D1', room: 'Back door', type: 'Composite front door', w: 910, h: 2080, qty: 1, notes: 'Grey, opens in' }], access: 'Side gate to the back door', parking: 'Drive, room for a van', notes: 'Lounge window has a cracked lintel above — please check.', completedOn: '04 Oct' },
    quote: quoteFrom('FP-55130', [{ ref: 'W1', room: 'Lounge', type: 'Casement window', w: 1800, h: 1200, qty: 1 }, { ref: 'W2', room: 'Bedrooms', type: 'Casement window', w: 1200, h: 1050, qty: 3 }, { ref: 'D1', room: 'Back door', type: 'Composite front door', w: 910, h: 2080, qty: 1 }], '06 Oct', '05 Nov', 'James Brook', 'Accepted', 0, 'Happy to go ahead.'),
    invite: { status: 'Invited', sentOn: '13 Oct' }, wonOn: '12 Oct',
    finalSurvey: { surveyor: 'ps', date: '2026-10-16', time: '13:30 – 15:00', status: 'Booked' },
    ops: { deposit: { inv: 'INV-3396', amount: 0, on: '12 Oct' }, checked: '13 Oct' },
  },
  'EN-2272': {
    comms: [
      c('gt3', 'email-out', 'Your final survey is booked', '15 Oct, 09:30', 'Sarah Mitchell', 'Dear Mrs Grant, Priya Shah will visit on Monday 19 October at 9am.'),
      c('gt2', 'system', 'Marked as Won', '14 Oct, 12:00', 'Mike Harris'),
      c('gt1', 'system', 'Referral from The Wrights', '18 Sep, 14:00', 'Referral'),
    ],
    appt: { date: '2026-09-25', time: '11:30 – 12:30', who: 'mh', type: 'Home visit', address: '6 Woodlands Drive, Wetherby', status: 'Done', outcome: '3-pane bi-fold to the patio, anthracite.' },
    survey: { surveyor: 'mh', date: '2026-09-25', time: '11:30', status: 'Completed', requestedBy: 'Mike Harris', openings: [{ ref: 'D1', room: 'Kitchen / patio', type: 'Bi-fold door (3-pane)', w: 2700, h: 2100, qty: 1, notes: 'Open to the right' }], access: 'Through the garage', parking: 'Drive', notes: 'Patio step down of about 150mm.', completedOn: '27 Sep' },
    quote: quoteFrom('FP-55128', [{ ref: 'D1', room: 'Kitchen / patio', type: 'Bi-fold door (3-pane)', w: 2700, h: 2100, qty: 1 }], '29 Sep', '29 Oct', 'Mike Harris', 'Accepted', 0, 'Yes please.'),
    invite: { status: 'Not invited' }, wonOn: '14 Oct',
    finalSurvey: { surveyor: 'ps', date: '2026-10-19', time: '09:00 – 10:30', status: 'Booked' },
    ops: { deposit: { inv: 'INV-3399', amount: 0, on: '14 Oct' }, checked: '15 Oct' },
  },
  'EN-2270': {
    comms: [
      c('fi5', 'email-out', 'Your final survey has a new date', '13 Oct, 15:00', 'Sarah Mitchell', 'Dear Mr Fisher, sorry we missed you today. Priya will now visit on Wednesday 21 October at 11am.'),
      c('fi4', 'note', 'Final survey · customer not in', '13 Oct, 11:20', 'Priya Shah', 'No answer at the door or on the phone. Left a card. Please rebook.'),
      c('fi3', 'system', 'Marked as Won', '08 Oct, 10:00', 'Emma Clarke'),
      c('fi2', 'email-out', 'Your Jadeite quote — please review', '01 Oct, 12:00', 'Emma Clarke'),
      c('fi1', 'system', 'Enquiry taken in the showroom', '10 Sep, 11:00', 'Showroom'),
    ],
    appt: { date: '2026-09-29', time: '13:30 – 14:30', who: 'ec', type: 'Home visit', address: '44 Skipton Road, Ilkley', status: 'Done', outcome: '5 flush casements, Chartwell green.' },
    survey: { surveyor: 'ec', date: '2026-09-29', time: '13:30', status: 'Completed', requestedBy: 'Emma Clarke', openings: [{ ref: 'W1', room: 'Front', type: 'Flush casement window', w: 1150, h: 1200, qty: 3 }, { ref: 'W2', room: 'Rear', type: 'Flush casement window', w: 900, h: 1050, qty: 2 }], access: 'Front path only', parking: 'Street — permits needed', notes: 'Stone cottage. Check the reveals are square.', completedOn: '30 Sep' },
    quote: quoteFrom('FP-55125', [{ ref: 'W1', room: 'Front', type: 'Flush casement window', w: 1150, h: 1200, qty: 3 }, { ref: 'W2', room: 'Rear', type: 'Flush casement window', w: 900, h: 1050, qty: 2 }], '01 Oct', '31 Oct', 'Emma Clarke', 'Accepted', 0, 'Happy to proceed.'),
    invite: { status: 'Invited', sentOn: '09 Oct' }, wonOn: '08 Oct',
    finalSurvey: { surveyor: 'ps', date: '2026-10-21', time: '11:00 – 12:30', status: 'Booked' },
    ops: { deposit: { inv: 'INV-3394', amount: 0, on: '08 Oct' }, checked: '09 Oct' },
  },
  'EN-2281': {
    comms: [c('o3', 'email-in', 'Re: Your quote FP-55101', '01 Oct, 10:00', 'Mrs Okafor', 'Thank you, but we have gone with a cheaper quote.'), c('o2', 'email-out', 'Your quote FP-55101', '24 Sep, 09:00', 'James Brook'), c('o1', 'system', 'Enquiry received from the website', '22 Sep, 09:45', 'Website')],
    lostReason: 'Price — chose a cheaper quote',
  },
};

// A Won enquiry still waiting for its order, so the office can try the full after-Won flow.
export const EXTRA_ENQUIRY_HUGHES = {
  id: 'EN-2279', name: 'Mrs Hughes', initials: 'AH', phone: '07700 900 611', email: 'a.hughes@email.co.uk', address: '9 Abbey Road, Knaresborough', postcode: 'HG5 8HY',
  product: 'Sash windows', source: 'Website', received: '07 Oct, 11:20', daysAgo: 9, assigned: 'mh', stage: 'Won' as const, value: 6400,
  next: 'Check documents and deposit', nextDue: 'Today', photo: 'window' as const,
};

// Won jobs further along, so every column of the Enquiries board has a real example.
const won = (id: string, name: string, initials: string, phone: string, email: string, address: string, postcode: string, product: string, received: string, daysAgo: number, assigned: string, photo: 'house' | 'window' | 'door' | 'bifold' | 'orangery' | 'roof', next: string, nextDue: string) =>
  ({ id, name, initials, phone, email, address, postcode, product, source: 'Website', received, daysAgo, assigned, stage: 'Won' as const, value: 0, next, nextDue, photo });
export const EXTRA_ENQUIRIES = [
  EXTRA_ENQUIRY_HUGHES,
  won('EN-2276', 'Hartley Dental', 'HD', '0116 496 0222', 'practice@hartleydental.co.uk', '2 Market Place, Oadby', 'LE2 4AA', 'Windows (commercial)', '18 Aug, 10:00', 59, 'jb', 'house', 'Installer working · day 1 of 3', 'Today'),
  won('EN-2271', 'Mrs Patel', 'RP', '07700 900 643', 'patel.r@email.co.uk', '7 Leeds Road, Oadby', 'LE2 5AA', 'Bi-fold doors + windows', '02 Aug, 14:30', 75, 'mh', 'bifold', 'Book return visit', 'Today'),
  won('EN-2268', 'Mr Khan', 'MK', '07700 900 233', 'a.khan@email.co.uk', '41 York Road, Harrogate', 'HG1 2QL', 'Orangery roof', '28 Jul, 09:10', 80, 'ec', 'roof', 'Final review and close', 'Mon 19 Oct'),
  won('EN-2262', 'The Greens', 'GR', '07700 900 412', 'greens@email.co.uk', '6 Mill Lane, Ilkley', 'LS29 8QJ', 'Front door', '10 Jul, 16:00', 98, 'ec', 'door', 'Chase final payment', 'Overdue'),
  won('EN-2240', 'Mrs Cooper', 'JC', '07700 900 990', 'j.cooper@email.co.uk', '5 Elm Close, Ripon', 'HG4 2BB', 'Windows', '02 May, 11:00', 167, 'ec', 'window', 'In guarantee until Jun 2036', '—'),
];

// Everything surveyed is now done by the salesperson in Framepoint: turn the sample
// measurements into Framepoint surveys and Framepoint quotes (prices inc. VAT).
for (const [id, l] of Object.entries(SEED)) {
  const sv = l.survey;
  if (sv && sv.status === 'Completed' && sv.openings && !sv.fp) {
    sv.fp = makeFpSurvey(sv.openings, sv.requestedBy, sv.completedOn || '', 'Framepoint', l.quote ? `2${l.quote.ref.slice(-2)}-1-v2` : undefined, sv.notes);
    if (l.quote && l.comms) { const old = l.quote.ref, nw = sv.fp.ref; l.comms = l.comms.map(m => ({ ...m, title: m.title.split(old).join(nw), body: m.body?.split(old).join(nw) })); }
    if (l.quote) l.quote = { ...l.quote, ref: sv.fp.ref, fp: true, discount: 0, lines: linesFromFp(sv.fp.items), files: [sv.fp.quoteFile, sv.fp.file] };
    if (l.quote) { const tot = fpTotals(sv.fp.items).total; l.versions = [{ ref: sv.fp.ref, on: l.quote.sentOn, total: tot, note: 'First quote' }]; if (l.ops?.deposit) l.ops.deposit.amount = Math.round(tot * 0.5); }
    if (l.finalSurvey && l.finalSurvey.status === 'Done') l.finalSurvey.checks = sv.fp.items.filter(i => !i.service).map(i => ({ no: i.no, name: i.name, sales: i.size || '', checked: i.size || '', ok: true }));
  }
}
// Dr Lowe: the surveyor found one size different, so Mike must revise the quote before ordering.
{ const fs = SEED['EN-2273'].finalSurvey; if (fs?.checks?.length) fs.checks[0] = { ...fs.checks[0], checked: fs.checks[0].sales.replace(/\d+/, n => String(+n - 30)), ok: false }; }

export const seedValue = (id: string) => { const q = SEED[id]?.quote; return q ? fpTotals(q.lines.map(x => ({ no: 0, name: '', qty: x.qty, work: '', product: '', spec: [], each: x.unit }))).total : undefined; };
