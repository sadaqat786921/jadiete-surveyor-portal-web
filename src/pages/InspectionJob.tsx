// An aftercare or snag inspection: the office sends the surveyor to look at a problem first,
// so the right fitter goes back with the right part. The findings go straight to the office.
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { IconPhone, IconMapPin, IconCar, IconCircleCheck, IconAlertTriangle, IconPlayerPlay, IconSend, IconDoorOff, IconCalendarOff, IconInfoCircle, IconArrowRight, IconShieldCheck, IconTool, IconHome, IconMail } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Avatar, useToast, Empty, Field } from '../components/ui';
import { IMG, me } from '../data/mock';
import { useStore, TODAY, fmtDate } from '../data/store';
import { useMyVisits, statusTone, nowTime, short, PhotoStrip, SignaturePad, OnMyWayModal, CantMakeItModal, NoAccessModal, Visit } from '../components/survey';

const CAUSES = ['Needs adjusting', 'Part needed', 'Glass unit failed', 'Seal or silicone', 'Not a fault — advice given'];

export default function InspectionJob() {
  const { id } = useParams();
  const v = useMyVisits().find(x => x.kind === 'Inspection' && x.id === id && x.status !== 'No access');
  if (!v) return <Empty icon={<IconTool size={22} />} title="This inspection is not booked for you" sub="It may have been sent back to the office or moved to someone else." action={<Link to="/inspections" className="btn btn-primary btn-sm">Back to inspections</Link>} />;
  return <InspectionView key={v.id} v={v} />;
}

function InspectionView({ v }: { v: Visit }) {
  const toast = useToast();
  const { set, updEnq, appts } = useStore();
  const x = v.snag;
  const e = v.e;
  const a = appts.find(ap => ap.snag === x.id);
  const done = !!x.inspected;
  const onSite = !!x.inspStarted && !done;
  const canStart = v.date <= TODAY;
  const [modal, setModal] = useState<string | null>(null);
  const [cause, setCause] = useState('');
  const [found, setFound] = useState('');
  const [fix, setFix] = useState('');
  const [part, setPart] = useState('');
  const [urgent, setUrgent] = useState('Within 2 weeks');
  const [photos, setPhotos] = useState(0);
  const [signed, setSigned] = useState(false);
  const advice = cause.startsWith('Not a fault');
  const ready = !!cause && found.trim().length > 4 && photos > 0 && (advice || fix.trim().length > 3);
  const maps = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address)}`;
  const start = () => { set('snags', ss => ss.map(s => (s.id === x.id ? { ...s, inspStarted: nowTime() } : s))); if (e) updEnq(e.id, {}, { kind: 'system', title: `${me.name} arrived to inspect: ${x.title}`, who: me.name }); toast('Inspection started'); };
  const submit = () => {
    const text = `${cause}. ${found}${advice ? '' : ` Fix: ${fix}.${part ? ` Part: ${part}.` : ''} ${urgent}.`} ${photos} photos.${signed ? ' Customer signed.' : ''}`;
    set('snags', ss => ss.map(s => (s.id === x.id ? { ...s, status: advice ? 'Fixed' : 'Inspected', tone: advice ? 'ok' : 'warn', owner: 'Aftercare team', inspectedBy: me.name, detail: `${s.detail} — Inspected by ${me.name} ${short(TODAY)}: ${text}`, inspected: { on: short(TODAY), iso: TODAY, cause, found, fix, part, urgent, photos, signed } } : s)));
    set('appts', as => as.map(ap => (ap.snag === x.id && ap.status === 'Booked' ? { ...ap, status: 'Done' } : ap)));
    if (e) updEnq(e.id, {}, { kind: 'note', title: `Inspection done · ${x.title}`, body: advice ? `${text} No visit needed.` : `${text} Please book the return visit.`, who: me.name });
    toast(advice ? 'Submitted · closed with advice to the customer' : 'Submitted · the office will book the fitter with the right part');
  };
  const step = ['Booked', 'On my way', 'On site', 'Submitted'].indexOf(v.status);
  return (
    <>
      <PageHead title={x.title} crumbs={[{ label: 'Inspections', to: '/inspections' }, { label: `${x.id} · ${x.customer}` }]}
        actions={done ? <Tag tone="ok" icon={<IconCircleCheck size={12} />}>Submitted {x.inspected.on}</Tag>
          : onSite ? <button className="btn btn-primary" disabled={!ready} onClick={submit}><IconSend size={16} />Submit findings</button>
          : <>
            <button className="btn btn-grey" onClick={() => setModal('cant')}><IconCalendarOff size={16} />Can't make it</button>
            {canStart && <button className="btn btn-outline" onClick={() => setModal('noaccess')}><IconDoorOff size={16} />Customer not in</button>}
            {canStart && !x.inspOnWay && <button className="btn btn-outline" onClick={() => setModal('way')}><IconCar size={16} />On my way</button>}
            <button className="btn btn-primary" disabled={!canStart} onClick={start}><IconPlayerPlay size={16} />{canStart ? 'Start inspection' : `Starts ${fmtDate(v.date)}`}</button>
          </>} />
      <Card>
        <div className="hstack" style={{ gap: 16, alignItems: 'flex-start' }}>
          <img src={IMG[x.photo as keyof typeof IMG]} alt="" style={{ width: 84, height: 84, borderRadius: 12, objectFit: 'cover' }} />
          <div className="vstack" style={{ gap: 8, flex: 1 }}>
            <div className="hstack" style={{ flexWrap: 'wrap' }}><h2 style={{ fontSize: 20 }}>{x.customer}</h2><Tag tone="warn">{x.kind === 'Aftercare' ? 'Aftercare inspection' : 'Snag inspection'}</Tag><Tag tone={statusTone[v.status]}>{v.status}</Tag><Tag tone="grey">{x.job}</Tag></div>
            {e && <div className="hstack small t2" style={{ gap: 16, flexWrap: 'wrap' }}><span className="hstack" style={{ gap: 5 }}><IconPhone size={14} />{e.phone}</span><span className="hstack" style={{ gap: 5 }}><IconMail size={14} />{e.email}</span><span className="hstack" style={{ gap: 5 }}><IconHome size={14} />{v.address}</span></div>}
            <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
              {([['When', `${fmtDate(v.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${v.time}`], ['Reported', x.reported], ['Products', e?.product || '—'], ['Fitted', e?.ops?.completion?.on || '—']] as [string, string][]).map(([l, val]) => <div key={l} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px' }}><div className="tiny muted">{l}</div><b style={{ fontSize: 13 }}>{val}</b></div>)}
            </div>
          </div>
        </div>
        <div className="stepper" style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {['Booked', 'On my way', 'On site', 'Submitted'].map((s, i) => <React.Fragment key={s}>{i > 0 && <span className="step-line" />}<span className={`step ${i < step || (done && i === 3) ? 'done' : i === step ? 'now' : ''}`}>{(i < step || (done && i === 3)) && <IconCircleCheck size={14} />}{s}</span></React.Fragment>)}
        </div>
      </Card>
      {x.moveAsked && !done && <div className="alert warn"><IconCalendarOff size={18} /><div><b>You asked the office to move this visit.</b> {x.moveAsked}</div></div>}
      <div className={`alert ${done ? 'ok' : onSite ? 'warn' : 'info'}`}><IconArrowRight size={18} /><div>{done ? <><b>Submitted {x.inspected.on}.</b> {x.inspected.cause}. {x.status === 'Fixed' ? 'Closed with advice — no visit needed.' : 'The office books the fitter with the right part.'}</> : onSite ? <><b>On site since {x.inspStarted}.</b> Say what you found, how to fix it and take photos.</> : <><b>What the customer said:</b> {x.detail}</>}</div></div>

      <div className="row">
        <div className="col grow">
          <Card>
            <CardHead title={done ? 'What you found' : 'Your findings'} sub={done ? undefined : 'The office and the fitter read this'} />
            {done ? (
              <div className="grid-3" style={{ rowGap: 14 }}>
                {([['Cause', x.inspected.cause], ['What you found', x.inspected.found], ['Fix', x.inspected.fix || 'None needed'], ['Part', x.inspected.part || '—'], ['How soon', x.status === 'Fixed' ? '—' : x.inspected.urgent], ['Photos', String(x.inspected.photos)]] as [string, string][]).map(([l, val]) => <div key={l} className="vstack" style={{ gap: 4 }}><span className="small muted">{l}</span><b style={{ fontSize: 13 }}>{val}</b></div>)}
              </div>
            ) : (
              <>
                {!onSite && <div className="alert info small"><IconInfoCircle size={16} />Press <b>&nbsp;Start inspection&nbsp;</b> when you arrive.</div>}
                <Field label="What is causing it?"><div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>{CAUSES.map(c => <button key={c} type="button" disabled={!onSite} className={`chip ${cause === c ? 'on' : ''}`} onClick={() => setCause(c)}>{c}</button>)}</div></Field>
                <Field label="What did you find?"><textarea className="textarea" disabled={!onSite} value={found} onChange={y => setFound(y.target.value)} placeholder="e.g. Top hinge is loose so the sash drops and the top seal does not close" /></Field>
                {!advice && (
                  <div className="grid-2">
                    <Field label="How should it be fixed?"><input className="input" disabled={!onSite} value={fix} onChange={y => setFix(y.target.value)} placeholder="e.g. Re-pack and adjust the hinges" /></Field>
                    <Field label="Part needed (optional)"><input className="input" disabled={!onSite} value={part} onChange={y => setPart(y.target.value)} placeholder="e.g. Friction hinge 16in" /></Field>
                    <Field label="How soon?"><select className="select" disabled={!onSite} value={urgent} onChange={y => setUrgent(y.target.value)}><option>As soon as possible</option><option>Within 2 weeks</option><option>Next time we are nearby</option></select></Field>
                  </div>
                )}
                {advice && <div className="alert ok small"><IconShieldCheck size={16} />No visit is needed. The office sends the customer your advice and closes it.</div>}
                <Field label="Photos"><PhotoStrip n={photos} onAdd={() => (onSite ? setPhotos(p => p + 1) : toast('Start the inspection first'))} /></Field>
                {onSite && <div className="card" style={{ padding: 14, gap: 8 }}><b style={{ fontSize: 13 }}>Customer signature (optional)</b><SignaturePad value={signed} onChange={setSigned} name={x.customer} /></div>}
                {onSite && <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }} disabled={!ready} onClick={submit}><IconSend size={16} />Submit findings</button>}
                {onSite && !ready && <span className="tiny muted">Choose a cause, say what you found{advice ? '' : ' and how to fix it'}, and add at least one photo.</span>}
              </>
            )}
          </Card>
        </div>
        <div className="col w-360">
          <Card>
            <CardHead title="Customer" />
            <div className="hstack" style={{ gap: 12 }}><Avatar i={e?.initials || 'C'} size={42} /><div className="vstack" style={{ gap: 2 }}><b>{x.customer}</b><span className="small t2">{e?.phone}</span></div></div>
            <div className="hstack" style={{ gap: 8, flexWrap: 'wrap' }}>
              {e && <a className="btn btn-outline btn-sm" href={`tel:${e.phone.replace(/\s/g, '')}`} onClick={() => toast(`Calling ${x.customer}`)}><IconPhone size={14} />Call</a>}
              <a className="btn btn-outline btn-sm" href={maps} target="_blank" rel="noreferrer"><IconMapPin size={14} />Directions</a>
            </div>
          </Card>
          <Card>
            <CardHead title="About the job" />
            <div className="vstack small" style={{ gap: 8 }}>
              <span>Fitted: <b>{e?.ops?.completion?.on || '—'}</b></span>
              <span>Products: <b>{e?.product}</b></span>
              <span>Guarantee: <b>{e?.ops?.closed ? '10 years from fitting' : 'Job not closed yet'}</b></span>
              {a && <span>Booked by the office for <b>{fmtDate(a.date)} · {a.time}</b></span>}
            </div>
          </Card>
        </div>
      </div>
      {modal === 'way' && <OnMyWayModal v={v} onClose={() => setModal(null)} />}
      {modal === 'cant' && <CantMakeItModal v={v} onClose={() => setModal(null)} />}
      {modal === 'noaccess' && <NoAccessModal v={v} onClose={() => setModal(null)} />}
    </>
  );
}

