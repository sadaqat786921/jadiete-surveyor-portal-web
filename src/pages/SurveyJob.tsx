// One final survey, from the surveyor's tablet: get ready, tell the customer you are on the way,
// measure every frame against what the salesperson measured in Framepoint, check the site,
// take photos, get the customer's signature and submit. It all saves to the customer record,
// so the office (and the salesperson, if a size changed) see it straight away.
import React, { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  IconPhone, IconMail, IconHome, IconMapPin, IconCar, IconCircleCheck, IconAlertTriangle, IconPlayerPlay, IconSend, IconDoorOff, IconCalendarOff,
  IconCamera, IconSignature, IconMessage, IconInfoCircle, IconDownload, IconCopy, IconDeviceFloppy, IconArrowRight,
  IconMailForward, IconNotes, IconSettings, IconBellRinging, IconPhoneCall, IconUser, IconUpload, IconFileText,
} from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Avatar, Tabs, Tile, useToast, Empty, Modal, Field } from '../components/ui';
import { FinalSurveyView, FileChip } from '../components/Lifecycle';
import { IMG, me, staffById } from '../data/mock';
import { useStore, TODAY, fmtDate, EnquiryX } from '../data/store';
import type { FinalCheck, SiteCheck, PaperReport } from '../data/framepoint';
import { useMyVisits, itemsToCheck, frameCount, statusTone, nowTime, short, SignaturePad, PhotoStrip, OnMyWayModal, CantMakeItModal, NoAccessModal, Visit, salespersonOf, PaperReportModal, PaperCard } from '../components/survey';

export const SITE_CHECKS: [string, string][] = [
  ['access', 'Every opening can be reached easily'],
  ['parking', 'A van can park close by'],
  ['lintels', 'Lintels and brickwork above the openings are sound'],
  ['reveals', 'Reveals are square and in good condition'],
  ['removal', 'Old frames can come out without damage'],
  ['asbestos', 'Nothing that could be asbestos (old soffits, panels)'],
  ['scaffold', 'Can be fitted without scaffolding'],
  ['escape', 'Bedroom windows are big enough for a fire escape'],
  ['safety', 'Safety glass is planned where it is needed (doors, low glass)'],
];
const TOL = 5; // sizes within 5mm count as the same
const parse = (s?: string) => { const m = /(\d+)\D+(\d+)/.exec(s || ''); return m ? [m[1], m[2]] : ['', '']; };
type M = { w: string; h: string; note: string; photos: number };
const sizeOf = (m: M) => (m.w && m.h ? `${m.w}mm x ${m.h}mm` : '');
const diff = (sales: string, m: M) => { const [sw, sh] = parse(sales).map(Number); return [Number(m.w) - sw, Number(m.h) - sh]; };
const matches = (sales: string, m: M) => { if (!m.w || !m.h) return undefined; const [dw, dh] = diff(sales, m); return Math.abs(dw) <= TOL && Math.abs(dh) <= TOL; };

const commIcon: Record<string, [any, string]> = { 'email-out': [IconMailForward, '#0b6e5c'], 'email-in': [IconMail, '#0b6e5c'], call: [IconPhoneCall, '#e0a100'], note: [IconNotes, '#3a4a4a'], system: [IconSettings, '#6b7a78'], reminder: [IconBellRinging, '#d64545'] };

export default function SurveyJob() {
  const { id } = useParams();
  const visits = useMyVisits();
  const { enquiries, surveys } = useStore();
  const v = visits.find(x => x.kind === 'Final survey' && x.id === id && x.status !== 'No access');
  if (!v || !v.e) {
    const e = enquiries.find(x => x.id === id);
    const na = (surveys as any[]).find(s => s.job === id && s.surveyor === me.id && s.status === 'No access');
    return <Empty icon={<IconDoorOff size={22} />} title={na ? 'Sent back to the office' : 'This survey is not booked for you'} sub={na ? `${e?.name || 'The customer'} was not in on ${na.date}: ${na.reason} The office will rebook it.` : 'It may have been moved to another surveyor.'} action={<Link to="/surveys" className="btn btn-primary btn-sm">Back to my surveys</Link>} />;
  }
  return <SurveyView key={v.e.id} v={v} e={v.e} />;
}

function SurveyView({ v, e }: { v: Visit; e: EnquiryX }) {
  const toast = useToast();
  const { updEnq, set } = useStore();
  const fs = e.finalSurvey!;
  const items = itemsToCheck(e);
  const done = fs.status === 'Done';
  const onSite = fs.status === 'Started';
  const [tab, setTab] = useState(done ? 'report' : onSite ? 'measure' : 'visit');
  const [modal, setModal] = useState<string | null>(null);
  const [m, setM] = useState<M[]>(() => items.map(i => { const c = fs.checks?.find(x => x.no === i.no); const [w, h] = parse(c?.checked); return { w: c?.w ?? (c ? w : ''), h: c?.h ?? (c ? h : ''), note: c?.note || '', photos: c?.photos || 0 }; }));
  const [site, setSite] = useState<Record<string, SiteCheck>>(fs.site || {});
  const [photos, setPhotos] = useState(fs.photos || 0);
  const [notes, setNotes] = useState(fs.notes || '');
  const [fitter, setFitter] = useState(fs.fitterNotes || '');
  const [signed, setSigned] = useState(!!fs.signed);
  const [signer, setSigner] = useState(fs.signedBy || e.name);
  const [noSign, setNoSign] = useState('');
  const [msg, setMsg] = useState('');
  const [paper, setPaper] = useState<PaperReport | undefined>(fs.paper);
  const first = useRef(true);
  // With a paperwork report the typed sizes are not used: the sizes are on the uploaded sheet.
  const checks: FinalCheck[] = items.map((i, k) => (paper
    ? { no: i.no, name: i.name, sales: i.size || '', checked: 'On the paperwork report', ok: !paper.changed.includes(i.no), note: m[k].note || undefined, photos: m[k].photos }
    : { no: i.no, name: i.name, sales: i.size || '', checked: sizeOf(m[k]), ok: !!matches(i.size || '', m[k]), note: m[k].note || undefined, photos: m[k].photos, w: m[k].w, h: m[k].h }));
  const typed = m.filter(x => x.w && x.h).length;
  const measured = paper ? items.length : typed;
  const changed = checks.filter((c, k) => (paper ? !c.ok : matches(c.sales, m[k]) === false));
  const answered = SITE_CHECKS.filter(([k]) => site[k]).length;
  const issues = SITE_CHECKS.filter(([k]) => site[k] && site[k].ok !== 'Yes');
  const allPhotos = photos + m.reduce((a, x) => a + x.photos, 0);
  const ready = measured === items.length && answered === SITE_CHECKS.length && allPhotos > 0 && (signed || noSign.trim().length > 3);

  // While on site, everything is saved as you go, so nothing is lost if the tablet closes.
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!onSite) return;
    updEnq(e.id, x => ({ finalSurvey: { ...x.finalSurvey!, checks, site, photos, notes, fitterNotes: fitter, paper } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m, site, photos, notes, fitter, paper]);

  const upd = (k: number, p: Partial<M>) => setM(xs => xs.map((x, j) => (j === k ? { ...x, ...p } : x)));
  const same = (k: number) => { const [w, h] = parse(items[k].size); upd(k, { w, h }); };
  const start = () => {
    updEnq(e.id, x => ({ finalSurvey: { ...x.finalSurvey!, status: 'Started', startedAt: nowTime() } }), { kind: 'system', title: `${me.name} arrived for the final survey`, who: me.name });
    set('appts', as => as.map(a => (a.enq === e.id && a.kind === 'Survey' && a.status === 'Booked' ? { ...a, status: 'On site' } : a)));
    setTab('measure'); toast('Survey started · everything saves as you go');
  };
  const submit = () => {
    const ch = checks.filter(c => !c.ok);
    const summary = `${paper ? `Sizes from the paperwork report (${paper.file}) · ` : ''}${checks.length} item${checks.length === 1 ? '' : 's'} measured · ${ch.length ? `${ch.length} size${ch.length > 1 ? 's' : ''} changed (${ch.map(c => (paper ? `${c.no}. ${c.name}` : `${c.no}. ${c.sales} → ${c.checked}`)).join('; ')})` : 'all sizes match'}.${issues.length ? ` Site: ${issues.map(([k, l]) => `${l.toLowerCase()} — ${site[k].ok.toLowerCase()}${site[k].note ? ` (${site[k].note})` : ''}`).join('; ')}.` : ' No site problems.'} ${allPhotos} photos. ${signed ? `Signed by ${signer}.` : `Not signed: ${noSign}.`}${notes ? ` Notes: ${notes}` : ''}`;
    updEnq(e.id, x => ({
      finalSurvey: { ...x.finalSurvey!, status: 'Done', checks, site, photos, notes: notes || (ch.length ? `${ch.length} size${ch.length > 1 ? 's' : ''} changed.` : 'All sizes confirmed.'), fitterNotes: fitter, paper, signed, signedBy: signed ? signer : undefined, doneOn: short(TODAY), moveAsked: undefined },
      next: ch.length ? 'Revise quote in Framepoint' : 'Contract & financial readiness', nextDue: 'Today',
    }), { kind: 'note', title: `Final survey done · ${ch.length ? `${ch.length} size${ch.length > 1 ? 's' : ''} changed` : 'all sizes match'}`, body: summary, who: me.name });
    set('appts', as => as.map(a => (a.enq === e.id && a.kind === 'Survey' && ['Booked', 'On site'].includes(a.status) ? { ...a, status: 'Done' } : a)));
    setModal(null); setTab('report');
    toast(ch.length ? `Submitted · ${salespersonOf(e).split(' ')[0]} will revise the quote before the office orders` : 'Submitted · the office can now get the order ready');
  };
  const usePaper = (p: PaperReport) => {
    const had = typed;
    setM(xs => xs.map(x => ({ ...x, w: '', h: '' })));
    setPaper(p); setModal(null);
    updEnq(e.id, {}, { kind: 'system', title: `${paper ? 'Paperwork report replaced' : 'Paperwork report uploaded'} · ${p.file}`, body: p.changed.length ? `${p.changed.length} item${p.changed.length === 1 ? '' : 's'} different from the sales size.` : 'All sizes the same as sales.', who: me.name });
    const word = paper ? 'replaced' : 'added';
    toast(had ? `Paperwork report ${word} · ${had === 1 ? 'the typed size was' : `the ${had} typed sizes were`} removed` : `Paperwork report ${word} · the sizes come from the report`);
  };
  const removePaper = () => { setPaper(undefined); updEnq(e.id, {}, { kind: 'system', title: 'Paperwork report removed · sizes will be typed in', who: me.name }); toast('Report removed · type each size instead'); };
  const sendMsg = () => { updEnq(e.id, {}, { kind: 'note', title: `Message from ${me.first} (surveyor)`, body: msg, who: me.name }); toast('Sent to the office'); setMsg(''); };

  const step = ['Booked', 'On my way', 'On site', 'Submitted'].indexOf(v.status);
  const canStart = fs.date <= TODAY;
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.address} ${e.postcode}`)}`;
  const tabs = done
    ? [{ id: 'report', label: 'Survey report' }, { id: 'visit', label: 'Visit details' }, { id: 'history', label: 'History', n: e.comms?.length }]
    : [{ id: 'visit', label: 'Visit details' }, { id: 'measure', label: paper ? 'Measure · paperwork' : `Measure · ${measured}/${items.length}` }, { id: 'site', label: `Site checks · ${answered}/${SITE_CHECKS.length}` }, { id: 'photos', label: `Photos · ${allPhotos}` }, { id: 'sign', label: 'Sign and submit' }, { id: 'history', label: 'History', n: e.comms?.length }];

  return (
    <>
      <PageHead title={e.name} crumbs={[{ label: 'My surveys', to: '/surveys' }, { label: `${e.jobId || e.id} · Final survey` }]}
        actions={done ? <><button className="btn btn-grey" onClick={() => toast(`Final survey report for ${e.name} downloaded (PDF)`)}><IconDownload size={16} />Download report</button><Tag tone="ok" icon={<IconCircleCheck size={12} />}>Submitted {fs.doneOn}</Tag></>
          : onSite ? <><button className="btn btn-grey" onClick={() => { updEnq(e.id, x => ({ finalSurvey: { ...x.finalSurvey!, checks, site, photos, notes, fitterNotes: fitter, paper } })); toast('Saved · open it again any time from My surveys'); }}><IconDeviceFloppy size={16} />Save and finish later</button><button className="btn btn-primary" onClick={() => setModal('submit')}><IconSend size={16} />Submit survey</button></>
          : <>
            <button className="btn btn-grey" onClick={() => setModal('cant')}><IconCalendarOff size={16} />Can't make it</button>
            {canStart && <button className="btn btn-outline" onClick={() => setModal('noaccess')}><IconDoorOff size={16} />Customer not in</button>}
            {canStart && !fs.onWay && <button className="btn btn-outline" onClick={() => setModal('way')}><IconCar size={16} />On my way</button>}
            <button className="btn btn-primary" disabled={!canStart} title={canStart ? '' : `Booked for ${fmtDate(fs.date)}`} onClick={start}><IconPlayerPlay size={16} />{canStart ? 'Start survey' : `Starts ${fmtDate(fs.date)}`}</button>
          </>} />

      <Card>
        <div className="hstack" style={{ gap: 16, alignItems: 'flex-start' }}>
          <img src={IMG[e.photo]} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
          <div className="vstack" style={{ gap: 8, flex: 1 }}>
            <div className="hstack" style={{ flexWrap: 'wrap' }}><h2 style={{ fontSize: 20 }}>{e.name}</h2><Tag tone="jade">Final survey</Tag><Tag tone={statusTone[v.status]}>{v.status}</Tag><Tag tone="grey">{e.product}</Tag></div>
            <div className="hstack small t2" style={{ gap: 16, flexWrap: 'wrap' }}><span className="hstack" style={{ gap: 5 }}><IconPhone size={14} />{e.phone}</span><span className="hstack" style={{ gap: 5 }}><IconMail size={14} />{e.email}</span><span className="hstack" style={{ gap: 5 }}><IconHome size={14} />{e.address}, {e.postcode}</span></div>
            <div className="hstack" style={{ gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              {([['When', `${fmtDate(fs.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${fs.time}`], ['Frames to check', `${frameCount(e)} in ${items.length} item${items.length === 1 ? '' : 's'}`], ['Measured by', `${salespersonOf(e)} (sales)`], ['Framepoint quote', e.survey?.fp?.ref || '—'], ['Job', e.jobId || 'Not ordered yet']] as [string, string][]).map(([l, val]) => (
                <div key={l} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}><div className="tiny muted">{l}</div><b style={{ fontSize: 13 }}>{val}</b></div>
              ))}
            </div>
          </div>
        </div>
        <div className="stepper" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {['Booked', 'On my way', 'On site', 'Submitted'].map((s, i) => <React.Fragment key={s}>{i > 0 && <span className="step-line" />}<span className={`step ${i < step || (done && i === 3) ? 'done' : i === step ? 'now' : ''}`}>{(i < step || (done && i === 3)) && <IconCircleCheck size={14} />}{s}{s === 'On my way' && fs.onWay ? ` · ${fs.onWay}` : s === 'On site' && fs.startedAt ? ` · ${fs.startedAt}` : ''}</span></React.Fragment>)}
        </div>
      </Card>

      {fs.moveAsked && !done && <div className="alert warn"><IconCalendarOff size={18} /><div><b>You asked the office to move this visit.</b> {fs.moveAsked} Sarah will confirm the new time.</div></div>}
      {!done && (
        <div className={`alert ${onSite ? 'warn' : 'info'}`}><IconArrowRight size={18} />
          <div>{onSite ? <><b>On site since {fs.startedAt}.</b> Measure each item, answer the site checks, add photos, then get the customer to sign. Everything saves as you go.</>
            : canStart ? <><b>Next: {fs.onWay ? 'Start the survey when you arrive' : 'Tell the customer you are on your way'}.</b> Read the visit details first — the salesperson's notes and sizes are below.</>
            : <><b>Booked for {fmtDate(fs.date, { weekday: 'long', day: 'numeric', month: 'long' })}, {fs.time}.</b> You can read everything now. Start the survey on the day.</>}</div>
        </div>
      )}
      {done && <div className={`alert ${changed.length || (fs.checks || []).some(c => !c.ok) ? 'warn' : 'ok'}`}>{(fs.checks || []).some(c => !c.ok) ? <IconAlertTriangle size={18} /> : <IconCircleCheck size={18} />}<div><b>Submitted {fs.doneOn}.</b> {(fs.checks || []).some(c => !c.ok) ? `${(n => `${n} size${n > 1 ? 's' : ''} changed`)((fs.checks || []).filter(c => !c.ok).length)} — ${salespersonOf(e)} revises the quote in Framepoint before the office orders.` : 'All sizes match — the office can get the order ready.'}</div></div>}

      <div className="row">
        <div className="col grow">
          <Card>
            <Tabs value={tab} onChange={setTab} items={tabs} />

            {tab === 'visit' && (
              <div className="vstack" style={{ gap: 20 }}>
                <div className="grid-3" style={{ rowGap: 16 }}>
                  {([['Access', e.survey?.access || 'Front of the house'], ['Parking', e.survey?.parking || 'On the street'], ['Customer told', `Yes · ${fmtDate(fs.date)} ${fs.time}`], ['From the sales visit', e.appt?.outcome || '—'], ['Salesperson notes', e.survey?.notes || e.survey?.fp?.notes || '—'], ['Visit notes', e.appt?.notes || '—']] as [string, string][]).map(([l, val]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>)}
                </div>
                {(e.survey?.notes || '').toLowerCase().match(/check|crack|lintel|square/) && <div className="alert warn small"><IconAlertTriangle size={16} /><div><b>The salesperson asked you to check:</b> {e.survey?.notes}</div></div>}
                <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
                  <a className="btn btn-outline btn-sm" href={maps} target="_blank" rel="noreferrer"><IconMapPin size={15} />Open in Maps</a>
                  {e.survey?.fp && <FileChip name={e.survey.fp.file} sub="Survey report from Framepoint" onOpen={() => toast(`Opening ${e.survey!.fp!.file}`)} />}
                  {e.survey?.fp && <FileChip name={e.survey.fp.quoteFile} sub="Accepted quote" onOpen={() => toast(`Opening ${e.survey!.fp!.quoteFile}`)} />}
                </div>
                <div className="vstack" style={{ gap: 10 }}>
                  <b>What you will check · {items.length} item{items.length === 1 ? '' : 's'}</b>
                  {items.map(i => (
                    <div key={i.no} className="hstack" style={{ gap: 12, padding: 12, border: '1px solid var(--border)', borderRadius: 12, alignItems: 'flex-start' }}>
                      <img src={IMG[i.photo || 'window']} alt="" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover' }} />
                      <div className="vstack" style={{ gap: 4, flex: 1 }}>
                        <div className="between"><b style={{ fontSize: 13.5 }}>{i.no}. {i.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</b><Tag tone="jade">{i.size}</Tag></div>
                        <span className="small t2">{i.product} · {i.work}</span>
                        <div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>{i.spec.slice(0, 5).map(([k, val]) => <span key={k} className="tag grey">{k}: {val}</span>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'measure' && (
              <div className="vstack" style={{ gap: 14 }}>
                {!onSite && <div className="alert info small"><IconInfoCircle size={16} />Press <b>&nbsp;Start survey&nbsp;</b> when you arrive to fill this in.</div>}
                {paper ? (
                  <div className="vstack" style={{ gap: 10 }}>
                    <div className="alert ok small"><IconFileText size={16} /><div><b>The sizes come from your paperwork report.</b> Typed sizes are not used. To type the sizes instead, remove the report.</div></div>
                    <PaperCard p={paper} onReplace={onSite ? () => setModal('paper') : undefined} onRemove={onSite ? removePaper : undefined} />
                  </div>
                ) : (
                <div className="between" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <span className="small t2">Measure each opening and type the size in millimetres. Within {TOL}mm counts as the same. Or upload your paperwork report instead.</span>
                  {onSite && <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}><button className="btn btn-outline btn-xs" onClick={() => setModal('paper')}><IconUpload size={13} />Upload paperwork report</button><button className="btn btn-outline btn-xs" onClick={() => { items.forEach((_, k) => { if (!m[k].w || !m[k].h) same(k); }); toast('Filled every empty size with the salesperson’s size — change any that are different'); }}><IconCopy size={13} />Fill the rest with sales sizes</button></div>}
                </div>
                )}
                {items.map((i, k) => {
                  const r = matches(i.size || '', m[k]);
                  const [dw, dh] = r === false ? diff(i.size || '', m[k]) : [0, 0];
                  return (
                    <div key={i.no} className={`measure-row ${r === false ? 'changed' : r ? 'ok' : ''}`}>
                      <div className="hstack" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                        <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 220 }}>
                          <b style={{ fontSize: 13.5 }}>{i.no}. {i.name}{i.qty > 1 ? ` × ${i.qty}` : ''}</b>
                          <span className="tiny muted">{i.product}</span>
                          <span className="small">Sales measured <b>{i.size}</b></span>
                        </div>
                        {paper ? <div className="vstack" style={{ gap: 6, width: 170, alignItems: 'flex-end' }}>{paper.changed.includes(i.no) ? <Tag tone="warn" icon={<IconAlertTriangle size={12} />}>Different · see report</Tag> : <Tag tone="ok" icon={<IconCircleCheck size={12} />}>Same · on report</Tag>}</div> : <>
                        <div className="hstack" style={{ gap: 8, alignItems: 'flex-end' }}>
                          <Field label="Width (mm)"><input className="input" inputMode="numeric" style={{ width: 110 }} disabled={!onSite} value={m[k].w} onChange={x => upd(k, { w: x.target.value.replace(/\D/g, '') })} aria-label={`Width of item ${i.no}`} /></Field>
                          <span style={{ paddingBottom: 12 }}>×</span>
                          <Field label="Height (mm)"><input className="input" inputMode="numeric" style={{ width: 110 }} disabled={!onSite} value={m[k].h} onChange={x => upd(k, { h: x.target.value.replace(/\D/g, '') })} aria-label={`Height of item ${i.no}`} /></Field>
                        </div>
                        <div className="vstack" style={{ gap: 6, width: 170, alignItems: 'flex-end' }}>
                          {r === undefined ? <Tag tone="grey">Not measured</Tag> : r ? <Tag tone="ok" icon={<IconCircleCheck size={12} />}>Same size</Tag> : <Tag tone="warn" icon={<IconAlertTriangle size={12} />}>Changed</Tag>}
                          {r === false && <span className="tiny" style={{ color: 'var(--text-2)' }}>{dw ? `Width ${dw > 0 ? '+' : ''}${dw}mm` : ''}{dw && dh ? ' · ' : ''}{dh ? `Height ${dh > 0 ? '+' : ''}${dh}mm` : ''}</span>}
                          {onSite && r === undefined && <button className="link small" onClick={() => same(k)}>Same as sales</button>}
                        </div>
                        </>}
                      </div>
                      {onSite && (
                        <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
                          <input className="input" style={{ flex: 1, minWidth: 220, height: 34 }} placeholder="Note for this item (optional) — e.g. reveal is out of square by 8mm" value={m[k].note} onChange={x => upd(k, { note: x.target.value })} />
                          <button className="btn btn-grey btn-xs" onClick={() => upd(k, { photos: m[k].photos + 1 })}><IconCamera size={13} />Photo{m[k].photos ? ` · ${m[k].photos}` : ''}</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {changed.length > 0 && <div className="alert warn small"><IconAlertTriangle size={16} /><div><b>{changed.length} size{changed.length > 1 ? 's are' : ' is'} different.</b> When you submit, {salespersonOf(e)} is asked to revise the quote in Framepoint. The order uses your sizes{paper ? ' from the paperwork report' : ''}.</div></div>}
              </div>
            )}

            {tab === 'site' && (
              <div className="vstack" style={{ gap: 4 }}>
                {!onSite && <div className="alert info small"><IconInfoCircle size={16} />Press <b>&nbsp;Start survey&nbsp;</b> when you arrive to fill this in.</div>}
                <span className="small t2">Answer every question. Anything that is “No” or “Not sure” goes to the office and the fitters.</span>
                <div className="list">
                  {SITE_CHECKS.map(([k, l]) => (
                    <div key={k} className="vstack" style={{ gap: 8, padding: '12px 0' }}>
                      <div className="between" style={{ gap: 10, flexWrap: 'wrap' }}>
                        <b style={{ fontSize: 13.5 }}>{l}</b>
                        <div className="hstack" style={{ gap: 6 }}>{(['Yes', 'No', 'Not sure'] as const).map(o => <button key={o} type="button" disabled={!onSite} className={`chip ${site[k]?.ok === o ? (o === 'Yes' ? 'on' : 'on-warn') : ''}`} onClick={() => setSite(s => ({ ...s, [k]: { ...(s[k] || {}), ok: o } }))}>{o}</button>)}</div>
                      </div>
                      {site[k] && site[k].ok !== 'Yes' && <input className="input" style={{ height: 34 }} placeholder="What did you find? The fitters will read this." value={site[k].note || ''} onChange={x => setSite(s => ({ ...s, [k]: { ...s[k], note: x.target.value } }))} />}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'photos' && (
              <div className="vstack" style={{ gap: 16 }}>
                <span className="small t2">Take a photo of the front, the back and anything the fitters should know about. Photos taken against an item are counted here too.</span>
                <div className="vstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>Whole property</b><PhotoStrip n={photos} onAdd={() => (onSite ? setPhotos(p => p + 1) : toast('Start the survey first'))} /></div>
                {items.map((i, k) => <div key={i.no} className="vstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>{i.no}. {i.name}</b><PhotoStrip n={m[k].photos} onAdd={() => (onSite ? upd(k, { photos: m[k].photos + 1 }) : toast('Start the survey first'))} /></div>)}
              </div>
            )}

            {tab === 'sign' && (
              <div className="vstack" style={{ gap: 16 }}>
                <div className="grid-4" style={{ rowGap: 12 }}>
                  {([['Sizes measured', paper ? 'Paperwork report' : `${measured} of ${items.length}`, measured === items.length], ['Sizes changed', String(changed.length), true], ['Site checks', `${answered} of ${SITE_CHECKS.length}`, answered === SITE_CHECKS.length], ['Photos', String(allPhotos), allPhotos > 0]] as [string, string, boolean][]).map(([l, val, ok]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 15, color: ok ? 'var(--text)' : 'var(--err)' }}>{val}</b></div>)}
                </div>
                {changed.length > 0 && <div className="vstack" style={{ gap: 4 }}><b style={{ fontSize: 13 }}>Sizes that changed</b>{changed.map(c => <span key={c.no} className="small t2">{c.no}. {c.name}: {c.sales} → <b style={{ color: 'var(--text)' }}>{paper ? 'see the paperwork report' : c.checked}</b></span>)}</div>}
                {paper && <PaperCard p={paper} />}
                <Field label="Notes for the office (optional)"><textarea className="textarea" disabled={!onSite} value={notes} onChange={x => setNotes(x.target.value)} placeholder="e.g. Customer wants the back door to open out instead — please check with sales" /></Field>
                <Field label="Notes for the fitters (optional)"><textarea className="textarea" disabled={!onSite} value={fitter} onChange={x => setFitter(x.target.value)} placeholder="e.g. Bring a 3-step ladder for the landing window. Dog in the kitchen." /></Field>
                <div className="card" style={{ padding: 14, gap: 10 }}>
                  <span className="hstack" style={{ gap: 8 }}><IconSignature size={18} color="#0b6e5c" /><b>Customer signature</b></span>
                  <span className="small t2">The customer signs to say the sizes and the work were explained to them.</span>
                  {onSite ? <>
                    <Field label="Customer name"><input className="input" value={signer} onChange={x => setSigner(x.target.value)} /></Field>
                    <SignaturePad value={signed} onChange={setSigned} name={signer} />
                    {!signed && <Field label="Customer can't sign? Say why"><input className="input" value={noSign} onChange={x => setNoSign(x.target.value)} placeholder="e.g. Only the tenant was in — the owner will sign the order" /></Field>}
                  </> : <span className="small muted">Available once the survey is started.</span>}
                </div>
                {onSite && <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} onClick={() => setModal('submit')}><IconSend size={16} />Submit survey</button>}
              </div>
            )}

            {tab === 'report' && done && (
              <div className="vstack" style={{ gap: 18 }}>
                <FinalSurveyView e={e} />
                {fs.site && <div className="vstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>Site checks</b>{SITE_CHECKS.map(([k, l]) => fs.site![k] && <div key={k} className="between small" style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 10 }}><span>{l}{fs.site![k].note ? <span className="t2"> — {fs.site![k].note}</span> : ''}</span><Tag tone={fs.site![k].ok === 'Yes' ? 'ok' : 'warn'}>{fs.site![k].ok}</Tag></div>)}</div>}
                <div className="grid-3" style={{ rowGap: 12 }}>
                  {([['Photos', String((fs.photos || 0) + (fs.checks || []).reduce((a, c) => a + (c.photos || 0), 0))], ['Signed by', fs.signed ? fs.signedBy || e.name : 'Not signed'], ['Notes for the fitters', fs.fitterNotes || '—']] as [string, string][]).map(([l, val]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>)}
                </div>
                <FileChip name={`Final survey ${e.jobId || e.id}.pdf`} sub="Saved on the customer record" onOpen={() => toast('Opening the final survey report')} />
              </div>
            )}

            {tab === 'history' && (
              <div className="timeline">
                {(e.comms || []).map(cm => { const [I, col] = commIcon[cm.kind]; return (
                  <div key={cm.id} className="tl-item"><Tile icon={<I size={15} />} color={col} size={32} radius={16} /><div className="vstack" style={{ gap: 4, flex: 1 }}><div className="between"><b style={{ fontSize: 13.5 }}>{cm.title}</b><span className="tiny muted">{cm.when}</span></div><span className="tiny muted">{cm.who}</span>{cm.body && <div className="small t2" style={{ background: 'var(--bg)', borderRadius: 10, padding: '10px 12px', whiteSpace: 'pre-wrap' }}>{cm.body}</div>}</div></div>
                ); })}
              </div>
            )}
          </Card>
        </div>

        <div className="col w-360">
          <Card>
            <CardHead title="Customer" />
            <div className="hstack" style={{ gap: 12 }}><Avatar i={e.initials} size={42} /><div className="vstack" style={{ gap: 2 }}><b>{e.name}</b><span className="small t2">{e.phone}</span></div></div>
            <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
              <a className="btn btn-outline btn-sm" href={`tel:${e.phone.replace(/\s/g, '')}`} onClick={() => toast(`Calling ${e.name}`)}><IconPhone size={14} />Call</a>
              <a className="btn btn-outline btn-sm" href={maps} target="_blank" rel="noreferrer"><IconMapPin size={14} />Directions</a>
              {!done && canStart && !fs.onWay && !onSite && <button className="btn btn-outline btn-sm" onClick={() => setModal('way')}><IconCar size={14} />On my way</button>}
            </div>
          </Card>
          {onSite && (
            <Card>
              <CardHead title="Before you submit" />
              {([[paper ? 'Sizes · paperwork report added' : 'All sizes measured', measured === items.length, 'measure'], ['Every site check answered', answered === SITE_CHECKS.length, 'site'], ['At least one photo', allPhotos > 0, 'photos'], ['Customer signed (or reason given)', signed || noSign.trim().length > 3, 'sign']] as [string, boolean, string][]).map(([l, ok, t]) => (
                <button key={l} type="button" className="hstack small" style={{ gap: 8, border: 0, background: 'none', padding: '4px 0', textAlign: 'left' }} onClick={() => setTab(t)}>{ok ? <IconCircleCheck size={17} color="#1f9d5b" /> : <span className="jl-dot" />}<span style={{ color: ok ? 'var(--text)' : 'var(--text-2)' }}>{l}</span></button>
              ))}
              <button className="btn btn-primary btn-sm" disabled={!ready} onClick={() => setModal('submit')}><IconSend size={14} />Submit survey</button>
            </Card>
          )}
          <Card>
            <CardHead title="People on this job" />
            <div className="list">
              {([['Salesperson', salespersonOf(e), staffById(e.assigned)?.initials], ['Surveyor', `${me.name} (you)`, me.initials], ['Office', 'Sarah Mitchell', 'SM']] as [string, string, string | undefined][]).map(([r, n, i]) => (
                <div key={r} className="hstack" style={{ gap: 10, padding: '10px 0' }}>{i ? <Avatar i={i} size={32} /> : <IconUser size={18} />}<div className="vstack" style={{ gap: 1 }}><span className="tiny muted">{r}</span><b style={{ fontSize: 13 }}>{n}</b></div></div>
              ))}
            </div>
          </Card>
          <Card>
            <CardHead title="Message the office" sub="Only staff see this" />
            <textarea className="textarea" value={msg} onChange={x => setMsg(x.target.value)} placeholder="e.g. Customer asked if the door can be fitted first" />
            <button className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} disabled={!msg.trim()} onClick={sendMsg}><IconMessage size={14} />Send to the office</button>
          </Card>
        </div>
      </div>

      {modal === 'way' && <OnMyWayModal v={v} onClose={() => setModal(null)} />}
      {modal === 'cant' && <CantMakeItModal v={v} onClose={() => setModal(null)} />}
      {modal === 'paper' && <PaperReportModal items={items} customer={e.name} typed={typed} current={paper} onClose={() => setModal(null)} onSave={usePaper} />}
      {modal === 'noaccess' && <NoAccessModal v={v} onClose={() => setModal(null)} />}
      {modal === 'submit' && (
        <Modal title="Submit the final survey" sub={`${e.name} · ${checks.length} items`} onClose={() => setModal(null)} width={620}
          footer={<><button className="btn btn-grey" onClick={() => setModal(null)}>Keep working</button><button className="btn btn-primary" disabled={!ready} onClick={submit}><IconSend size={16} />Submit to the office</button></>}>
          <div className="list" style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px' }}>
            {([['Sizes', paper ? `From the paperwork report (${paper.file}) · ${changed.length ? `${changed.length} different from sales` : 'all the same as sales'}` : measured === items.length ? (changed.length ? `${changed.length} changed · ${items.length - changed.length} the same` : 'All the same as sales') : `${items.length - measured} still to measure`, measured === items.length], ['Site checks', answered === SITE_CHECKS.length ? (issues.length ? `${issues.length} to look at: ${issues.map(([, l]) => l.toLowerCase()).join(', ')}` : 'No problems found') : `${SITE_CHECKS.length - answered} not answered`, answered === SITE_CHECKS.length], ['Photos', allPhotos ? `${allPhotos} photos` : 'No photos yet', allPhotos > 0], ['Signature', signed ? `Signed by ${signer}` : noSign ? `Not signed: ${noSign}` : 'Not signed yet', signed || noSign.trim().length > 3]] as [string, string, boolean][]).map(([l, val, ok]) => (
              <div key={l} className="hstack" style={{ gap: 12, padding: '12px 0' }}>{ok ? <IconCircleCheck size={20} color="#1f9d5b" /> : <IconAlertTriangle size={20} color="#e0a100" />}<div className="vstack" style={{ gap: 2 }}><b style={{ fontSize: 13 }}>{l}</b><span className="small t2">{val}</span></div></div>
            ))}
          </div>
          {!ready ? <div className="alert warn small"><IconAlertTriangle size={16} />Finish the items marked in amber first.</div>
            : changed.length ? <div className="alert info small"><IconInfoCircle size={16} />{salespersonOf(e)} is asked to revise the quote. The office orders with your sizes once the new version is agreed.</div>
            : <div className="alert ok small"><IconCircleCheck size={16} />All sizes match. The office can get the order ready.</div>}
        </Modal>
      )}
    </>
  );
}

