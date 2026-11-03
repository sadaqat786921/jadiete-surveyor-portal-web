// Framepoint: the salesperson measures up and prices the job in Framepoint during the visit.
// The platform gets that survey either from the Framepoint API (import) or from the
// uploaded survey report PDF (read automatically with OCR). The quote is built from it.

export type FPItem = {
  no: number; name: string; qty: number; work: string; product: string;
  size?: string; spec: [string, string][]; each: number; // price each, inc. VAT
  service?: boolean; photo?: 'window' | 'door' | 'bifold' | 'roof' | 'orangery' | 'house';
};
export type FPSurvey = {
  ref: string; source: 'Framepoint' | 'Survey report (PDF)'; by: string; date: string;
  items: FPItem[]; leadTime: string; guarantee: string; notes: string;
  file: string; quoteFile: string; importedOn: string; checked?: string[];
};
export type FinalCheck = { no: number; name: string; sales: string; checked: string; ok: boolean; note?: string; photos?: number; w?: string; h?: string };
export type SiteCheck = { ok: 'Yes' | 'No' | 'Not sure'; note?: string };
export type FinalSurvey = {
  // Booked by the office → Started on site by the surveyor → Done (submitted from their tablet or phone)
  surveyor: string; date: string; time: string; status: 'Booked' | 'Started' | 'Done';
  checks?: FinalCheck[]; notes?: string; signed?: boolean; doneOn?: string;
  onWay?: string; startedAt?: string; site?: Record<string, SiteCheck>; photos?: number; signedBy?: string; moveAsked?: string; fitterNotes?: string;
  paper?: PaperReport; // the surveyor uploaded a paperwork report instead of typing the sizes
};
// A paperwork (paper survey sheet) report uploaded on site. When there is one, typed sizes are not used.
export type PaperReport = { file: string; kb: number; type: 'pdf' | 'image'; at: string; preview?: string; changed: number[] };

const WORK = 'Supply & Fit - Remove & replace';
const WIN_SPEC = (colour = 'White'): [string, string][] => [
  ['Frame', 'Standard 67mm Chamfered'], ['Sash', 'Chamfered'], ['Colour', colour], ['Profile Trickle Vent', 'Yes'],
  ['Window Handle', colour === 'White' ? 'Connoisseur White' : 'Connoisseur Black'], ['G1', 'Double Glazed (Annealed) - Black Spacer - Clear'],
];
const DOOR_SPEC: [string, string][] = [
  ['Opens', 'In'], ['Low Threshold', 'Yes'], ['Colour', 'Anthracite Grey / White inside'], ['Lock Cylinder', '3 star anti-snap'],
  ['Door Hinge', 'Flag hinge, chrome'], ['Door Handle', 'Lever, chrome'], ['Glass', 'Double Glazed (Toughened) - Obscure'],
];
const BIFOLD_SPEC: [string, string][] = [
  ['Opens', 'Out · 3 panes to the left'], ['Frame', 'Standard 70mm'], ['Colour', 'Anthracite Grey RAL 7016 / White inside'],
  ['Low Threshold', 'Yes'], ['Door Handle', 'Black lever'], ['Lock Cylinder', '3 star anti-snap'], ['Glass', 'Double Glazed (Toughened) - Black Spacer - Clear'],
];
const SERVICES = (n: number): FPItem[] => [
  { no: n, name: 'FENSA Registration', qty: 1, work: 'Service', product: 'Building regulations certificate', spec: [], each: 0, service: true },
  { no: n + 1, name: 'Waste Disposal', qty: 1, work: 'Service', product: 'Removal of old frames and glass', spec: [], each: 0, service: true },
];

// Product catalogue used when an opening becomes a Framepoint item.
export const FP_PRODUCTS: Record<string, { product: string; each: number; spec: () => [string, string][]; photo: FPItem['photo'] }> = {
  'Casement window': { product: 'Rehau Calibre Casement Window', each: 650, spec: () => WIN_SPEC(), photo: 'window' },
  'Sash window': { product: 'Rehau Heritage Vertical Slider', each: 1180, spec: () => WIN_SPEC(), photo: 'window' },
  'Flush casement window': { product: 'Residence 9 Flush Casement', each: 830, spec: () => WIN_SPEC('Chartwell Green'), photo: 'window' },
  'Composite front door': { product: 'Rehau Calibre Composite Door', each: 2380, spec: () => DOOR_SPEC, photo: 'door' },
  'Bi-fold door (3-pane)': { product: 'Origin OB-49 3-Pane Bi-fold Door', each: 6720, spec: () => BIFOLD_SPEC, photo: 'bifold' },
  'Roof lantern': { product: 'Korniche Aluminium Roof Lantern', each: 4680, spec: () => [['Colour', 'Anthracite Grey'], ['Glass', 'Solar control, self-cleaning'], ['Size type', 'External kerb']], photo: 'roof' },
  'Conservatory': { product: 'Lean-to Conservatory, insulated roof', each: 21360, spec: () => [['Roof', 'Guardian warm roof'], ['Colour', 'White'], ['Base', 'Dwarf wall']], photo: 'orangery' },
};

export type OpeningLike = { ref: string; room: string; type: string; w: number; h: number; qty: number; notes?: string };
export const fpItemsFromOpenings = (ops: OpeningLike[]): FPItem[] => {
  const items = ops.map((o, i) => {
    const p = FP_PRODUCTS[o.type] || FP_PRODUCTS['Casement window'];
    return { no: i + 1, name: `${o.room} – ${o.type}`, qty: o.qty, work: WORK, product: p.product, size: `${o.w}mm x ${o.h}mm`, spec: [...p.spec(), ...(o.notes ? [['Notes', o.notes] as [string, string]] : [])], each: p.each, photo: p.photo };
  });
  return [...items, ...SERVICES(items.length + 1)];
};

export const fpTotals = (items: FPItem[]) => {
  const total = items.reduce((a, i) => a + i.qty * i.each, 0);
  const vat = Math.round(total / 6);
  return { total, vat, net: total - vat, deposit: Math.round(total * 0.5), stage: Math.round(total * 0.4), completion: total - Math.round(total * 0.5) - Math.round(total * 0.4) };
};

let refSeq = 341;
export const nextFpRef = () => `${refSeq++}-1-v1`;

export const makeFpSurvey = (ops: OpeningLike[], by: string, date: string, source: FPSurvey['source'] = 'Framepoint', ref = nextFpRef(), notes = ''): FPSurvey => ({
  ref, source, by, date, items: fpItemsFromOpenings(ops), leadTime: '6 weeks', guarantee: '10 years',
  notes: notes || 'Internal finishing into existing reveals. Priced in standard uPVC trim.',
  file: `Survey report ${ref}.pdf`, quoteFile: `Framepoint quote ${ref}.pdf`, importedOn: date,
});

// What the salesperson measured, by product, when nothing more specific is known.
export const guessOpeningsFor = (product: string): OpeningLike[] => {
  const p = product.toLowerCase();
  if (p.includes('bi-fold')) return [{ ref: 'D1', room: 'Kitchen / garden', type: 'Bi-fold door (3-pane)', w: 2400, h: 2100, qty: 1, notes: 'Open to the left' }];
  if (p.includes('door')) return [{ ref: 'D1', room: 'Front entrance', type: 'Composite front door', w: 920, h: 2090, qty: 1 }];
  if (p.includes('roof') || p.includes('lantern')) return [{ ref: 'R1', room: 'Kitchen extension', type: 'Roof lantern', w: 2000, h: 1000, qty: 1 }];
  if (p.includes('conserv')) return [{ ref: 'C1', room: 'Rear garden', type: 'Conservatory', w: 4000, h: 3000, qty: 1 }];
  if (p.includes('sash')) return [{ ref: 'W1', room: 'Lounge', type: 'Sash window', w: 950, h: 1600, qty: 2 }, { ref: 'W2', room: 'Bedrooms', type: 'Sash window', w: 900, h: 1450, qty: 3 }];
  return [{ ref: 'W1', room: 'Lounge (front)', type: 'Casement window', w: 1770, h: 1200, qty: 2 }, { ref: 'W2', room: 'Bedroom 1', type: 'Casement window', w: 1200, h: 1050, qty: 2 }, { ref: 'W3', room: 'Kitchen', type: 'Casement window', w: 1000, h: 900, qty: 1 }];
};

// Fields the PDF reader is less sure about — the office checks these before saving.
export const OCR_UNSURE = ['size:1', 'spec:1:Glass'];
