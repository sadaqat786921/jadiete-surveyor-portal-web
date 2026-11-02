// Everything on the operations pages is read from the customer records (enquiries),
// so a step done anywhere shows everywhere. These helpers shape that data per page.
import React, { useMemo, useState } from 'react';
import { IconFileTypePdf, IconPhoto, IconFileInvoice, IconCertificate, IconPackage, IconClipboardCheck, IconFolder, IconExternalLink } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { useStore, EnquiryX, Order } from '../data/store';
import { quoteTotals } from '../data/lifecycle';
import { gbp, staffById } from '../data/mock';
import { crewTeam } from '../data/crew';
import { stepFor, Step, PHASES, installOf, openSnags } from './Journey';
import { Drawer, Tag, useToast } from './ui';
import { QuoteDoc, SurveyReport, FinalSurveyView, orderLines } from './Lifecycle';

export type Row = { e: EnquiryX; st: Step };
export const phaseLabel = (id: string) => PHASES.find(p => p.id === id)?.label || id;
export const isJob = (e: EnquiryX) => e.type === 'Sales' && e.stage === 'Won';
export const jobRef = (e: EnquiryX) => e.jobId || `Won ${e.wonOn || ''}`.trim();
export const totalsOf = (e: EnquiryX) => (e.quote ? quoteTotals(e.quote) : { total: e.value, deposit: Math.round(e.value / 2), stage: Math.round(e.value * 0.4), completion: e.value - Math.round(e.value / 2) - Math.round(e.value * 0.4), depositPct: 50, vat: 0, sub: 0 });
export const products = (e: EnquiryX) => {
  const items = (e.survey?.fp?.items || []).filter(i => !i.service);
  return items.length ? items.map(i => `${i.qty} × ${i.name.split(' – ').pop()?.toLowerCase()}`).join(', ') : e.product;
};

/** Every record with its current step, worked out once. */
export function useRows() {
  const { enquiries, events, snags } = useStore();
  return useMemo(() => enquiries.map(e => ({ e, st: stepFor(e, { events, snags: snags as any }) })), [enquiries, events, snags]);
}

/** One customer may have several projects (enquiries). They are matched by email, or name + postcode. */
export const custKey = (e: EnquiryX) => ((e.email && e.email !== '—' ? e.email : `${e.name}|${e.postcode}`) || e.id).toLowerCase();
export type Customer = { id: string; key: string; name: string; initials: string; phone: string; email: string; address: string; postcode: string; photo: any; projects: Row[]; status: string; tone: string; value: number; sales?: string; since: string };
export function useCustomers(): Customer[] {
  const rows = useRows();
  return useMemo(() => {
    const groups = new Map<string, Row[]>();
    rows.forEach(r => { const k = custKey(r.e); groups.set(k, [...(groups.get(k) || []), r]); });
    return [...groups.entries()].map(([key, rs]) => {
      const sorted = [...rs].sort((a, b) => a.e.id.localeCompare(b.e.id));
      const main = rs.find(r => r.e.type === 'Sales' && r.e.address !== '—') || rs[0];
      const sales = rs.filter(r => r.e.type === 'Sales');
      const won = sales.filter(r => r.e.stage === 'Won');
      const open = sales.filter(r => !['Won', 'Lost'].includes(r.e.stage));
      const active = won.filter(r => r.st.phase !== 'after');
      const status = active.length ? 'Active job' : open.length ? 'Enquiry' : won.length ? 'In aftercare' : sales.some(r => r.e.stage === 'Lost') ? 'Lost' : 'Enquiry';
      const tone = status === 'Active job' ? 'jade' : status === 'In aftercare' ? 'ok' : status === 'Lost' ? 'err' : 'grey';
      return {
        id: 'C-' + sorted[0].e.id.split('-')[1], key, name: main.e.name, initials: main.e.initials, phone: main.e.phone, email: main.e.email, address: main.e.address, postcode: main.e.postcode, photo: main.e.photo,
        projects: [...rs].sort((a, b) => b.e.id.localeCompare(a.e.id)), status, tone, value: won.reduce((a, r) => a + totalsOf(r.e).total, 0), sales: main.e.assigned, since: sorted[0].e.received,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);
}

/** The documents a record has collected so far, in the order they were made. */
export type Doc = { id: string; name: string; kind: 'survey' | 'quote' | 'final' | 'invoice' | 'ack' | 'photos' | 'pack' | 'signoff' | 'guarantee'; date: string; e: EnquiryX; note: string };
export function docsFor(e: EnquiryX, order?: Order): Doc[] {
  const d: Doc[] = [];
  const o = e.ops || {};
  const ref = e.jobId || e.id;
  const add = (kind: Doc['kind'], name: string, date: string, note: string) => d.push({ id: `${e.id}-${d.length}`, kind, name, date: date || '—', e, note });
  if (e.survey?.fp) add('survey', e.survey.fp.file, e.survey.fp.date, `Survey by ${e.survey.fp.by} · ${e.survey.fp.source === 'Framepoint' ? 'from Framepoint' : 'read from PDF'}`);
  (e.versions || (e.quote ? [{ ref: e.quote.ref, on: e.quote.sentOn, total: totalsOf(e).total, note: 'Quote' }] : [])).forEach(v => add('quote', `Framepoint quote ${v.ref}.pdf`, v.on, `${gbp(v.total)} inc. VAT${v.ref === e.quote?.ref ? ' · active version' : ' · earlier version'}`));
  if (o.deposit) add('invoice', `${o.deposit.inv} deposit invoice.pdf`, o.deposit.on, `${gbp(o.deposit.amount || totalsOf(e).deposit)} · paid`);
  if (e.finalSurvey?.status === 'Done') add('final', `Final survey ${ref}.pdf`, e.finalSurvey.doneOn || '', `Checked by ${staffById(e.finalSurvey.surveyor)?.name}`);
  if (order?.confirmRef) add('ack', `${order.supplier} acknowledgement ${order.confirmRef}.pdf`, order.ordered, `Order ${order.ref}`);
  if (o.received) add('photos', `Delivery photos (${o.received.photos})`, o.received.on, o.received.ok ? 'Everything arrived' : `Problem: ${o.received.issue}`);
  if (o.pack) add('pack', `Job pack ${ref}.pdf`, o.pack, 'Sizes, products, photos and site notes');
  if (o.completion) add('signoff', `Completion sign-off ${ref}.pdf`, o.completion.on, `${o.completion.photos} photos · ${o.completion.signed ? 'signed by the customer' : 'not signed'}`);
  if (o.closed) {
    add('guarantee', '10-year guarantee.pdf', o.closed, 'Published to the customer');
    add('guarantee', 'FENSA certificate.pdf', o.closed, 'Building regulations');
    add('guarantee', 'Care guide.pdf', o.closed, 'How to look after the new frames');
    add('invoice', `Final invoice ${ref}.pdf`, o.closed, `${gbp(totalsOf(e).completion || 0)} · ${o.paid ? 'paid' : 'due'}`);
  }
  return d;
}
const docIcon: Record<Doc['kind'], any> = { survey: IconClipboardCheck, quote: IconFileTypePdf, final: IconClipboardCheck, invoice: IconFileInvoice, ack: IconPackage, photos: IconPhoto, pack: IconFolder, signoff: IconFileTypePdf, guarantee: IconCertificate };

export function DocRow({ d, onOpen, showProject }: { d: Doc; onOpen: () => void; showProject?: boolean }) {
  const I = docIcon[d.kind];
  return (
    <button type="button" className="doc-row" onClick={onOpen}>
      <I size={20} color={d.kind === 'photos' ? '#0b6e5c' : '#d64545'} />
      <span className="vstack" style={{ gap: 2, flex: 1, minWidth: 0, textAlign: 'left' }}><b style={{ fontSize: 13 }}>{d.name}</b><span className="tiny muted">{d.note}{showProject ? ` · ${d.e.product}` : ''}</span></span>
      <span className="tiny muted">{d.date}</span>
    </button>
  );
}

/** Shows a document in a side panel: the real quote, survey and final survey, a summary for the rest. */
export function DocViewer({ d, onClose }: { d: Doc; onClose: () => void }) {
  const toast = useToast();
  const { events, snags, orders } = useStore();
  const e = d.e;
  const order = orders.find(x => x.job === e.jobId && e.jobId);
  const fit = installOf(e, events);
  const lines = orderLines(e);
  return (
    <Drawer title={d.name} sub={`${e.name} · ${d.date}`} onClose={onClose} width={d.kind === 'quote' || d.kind === 'survey' ? 820 : 560}
      footer={<><Link to={`/enquiries/${e.id}`} className="btn btn-grey"><IconExternalLink size={16} />Open record</Link><button className="btn btn-primary" onClick={() => toast(`${d.name} downloaded`)}>Download</button></>}>
      {d.kind === 'quote' && e.quote && <QuoteDoc e={e} q={{ ...e.quote, ref: d.name.replace('Framepoint quote ', '').replace('.pdf', '') }} />}
      {d.kind === 'survey' && e.survey && <SurveyReport e={e} />}
      {d.kind === 'final' && e.finalSurvey && <FinalSurveyView e={e} />}
      {['invoice', 'ack', 'photos', 'pack', 'signoff', 'guarantee'].includes(d.kind) && (
        <div className="vstack" style={{ gap: 14 }}>
          <div className="card" style={{ padding: 16, gap: 8, background: 'var(--bg)' }}>
            <b>{d.name.replace('.pdf', '')}</b>
            <span className="small t2">{e.name} · {e.address}, {e.postcode}</span>
            <span className="small t2">{d.note}</span>
          </div>
          {d.kind === 'ack' && order && <div className="vstack small" style={{ gap: 6 }}><span>Supplier: <b>{order.supplier}</b> · reference <b>{order.confirmRef}</b></span><span>Expected delivery: <b>{order.expected}</b></span>{lines.map((l, i) => <span key={i} className="t2">{l.qty} × {l.item.replace(/^\d+\.\s*/, '')} · {l.size}</span>)}</div>}
          {d.kind === 'pack' && <div className="vstack small" style={{ gap: 6 }}><span>Installers: <b>{crewTeam(fit)?.members || '—'}</b> · {fit ? `starts ${fit.date}${fit.time ? `, ${fit.time}` : ''}` : ''}</span>{lines.map((l, i) => <span key={i} className="t2">{l.qty} × {l.item.replace(/^\d+\.\s*/, '')} · {l.size} · {l.spec}</span>)}<span className="t2">Site notes: {e.survey?.fp?.notes || '—'}</span></div>}
          {d.kind === 'signoff' && <div className="vstack small" style={{ gap: 6 }}><span>Open snags: <b>{openSnags(e, snags as any).length}</b></span><div style={{ border: '1px dashed var(--border-input)', borderRadius: 10, height: 70, display: 'grid', placeItems: 'center', fontFamily: 'cursive', fontSize: 24 }}>{e.name.split(' ').pop()}</div></div>}
          {d.kind === 'photos' && <div className="grid-3" style={{ gap: 8 }}>{Array.from({ length: Math.min(6, e.ops?.received?.photos || 3) }).map((_, i) => <div key={i} className="photo-ph" />)}</div>}
          {d.kind === 'invoice' && <Tag tone={d.note.includes('due') ? 'warn' : 'ok'}>{d.note.includes('due') ? 'Due' : 'Paid'}</Tag>}
        </div>
      )}
    </Drawer>
  );
}

export function useDocViewer() {
  const [doc, setDoc] = useState<Doc | null>(null);
  return { open: setDoc, el: doc ? <DocViewer d={doc} onClose={() => setDoc(null)} /> : null };
}
