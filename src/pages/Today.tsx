// Today: the surveyor's day — where to go, in what order, and what to check when they get there.
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IconMapPin, IconPhone, IconCar, IconPlayerPlay, IconChevronRight, IconClock, IconRuler, IconCircleCheck, IconAlertTriangle, IconRefresh, IconBeach, IconCalendar, IconTool, IconClipboardCheck, IconMessage, IconArrowRight, IconInbox } from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Tile, hexA, useToast, Avatar } from '../components/ui';
import { IMG, me } from '../data/mock';
import { useStore, TODAY, fmtDate, addDays, mondayOf } from '../data/store';
import { useMyVisits, isOpenVisit, statusTone, Visit, OnMyWayModal, TimeOffModal, itemsToCheck, salespersonOf } from '../components/survey';
import { commTime } from './Messages';

export default function Today() {
  const nav = useNavigate();
  const toast = useToast();
  const { updEnq, set } = useStore();
  const visits = useMyVisits();
  const [way, setWay] = useState<Visit | null>(null);
  const [off, setOff] = useState(false);
  const today = visits.filter(v => v.date === TODAY && v.status !== 'No access');
  const next = today.find(isOpenVisit);
  const weekEnd = addDays(mondayOf(TODAY), 5);
  const week = visits.filter(v => v.date > TODAY && v.date <= weekEnd && isOpenVisit(v));
  const later = visits.filter(v => v.date > TODAY && isOpenVisit(v)).slice(0, 5);
  const inProgress = visits.filter(v => v.status === 'On site');
  const moved = visits.filter(v => v.moveAsked && isOpenVisit(v));
  const done = visits.filter(v => v.status === 'Submitted');
  const doneMonth = done.filter(v => (v.e?.finalSurvey?.doneOn || v.snag?.inspected?.on || '').endsWith('Oct'));
  const surveysMonth = doneMonth.filter(v => v.kind === 'Final survey');
  const changedMonth = surveysMonth.filter(v => (v.changed || 0) > 0);
  const framesWeek = visits.filter(v => v.date >= TODAY && v.date <= weekEnd && isOpenVisit(v) && v.kind === 'Final survey').reduce((a, v) => a + v.items, 0);
  const fromOffice = visits.filter((v, i, a) => v.e && a.findIndex(y => y.e?.id === v.e?.id) === i).flatMap(v => (v.e?.comms || []).filter(c => c.who === 'Sarah Mitchell' && ['note', 'email-out', 'system'].includes(c.kind)).slice(0, 2).map(c => ({ v, c }))).sort((a, b) => commTime(b.c.when) - commTime(a.c.when)).slice(0, 4);
  const start = (v: Visit) => {
    if (v.kind === 'Final survey' && v.e) { updEnq(v.e.id, x => ({ finalSurvey: { ...x.finalSurvey!, status: 'Started', startedAt: new Date().toTimeString().slice(0, 5) } }), { kind: 'system', title: `${me.name} arrived for the final survey`, who: me.name }); set('appts', as => as.map(a => (a.enq === v.e!.id && a.kind === 'Survey' && a.status === 'Booked' ? { ...a, status: 'On site' } : a))); }
    else set('snags', ss => ss.map(s => (s.id === v.id ? { ...s, inspStarted: new Date().toTimeString().slice(0, 5) } : s)));
    toast('Started · everything saves as you go'); nav(v.to);
  };
  const Action = ({ v, big }: { v: Visit; big?: boolean }) => {
    const cls = `btn ${big ? '' : 'btn-xs'}`;
    if (v.status === 'Submitted') return <Link to={v.to} className={`${cls} btn-grey`}>View report</Link>;
    if (v.status === 'On site') return <Link to={v.to} className={`${cls} btn-primary`}><IconArrowRight size={big ? 16 : 13} />Continue</Link>;
    if (v.date > TODAY) return <Link to={v.to} className={`${cls} btn-outline`}>Get ready</Link>;
    return <>{v.status === 'Booked' && <button className={`${cls} btn-outline`} onClick={() => setWay(v)}><IconCar size={big ? 16 : 13} />On my way</button>}<button className={`${cls} btn-primary`} onClick={() => start(v)}><IconPlayerPlay size={big ? 16 : 13} />Start</button></>;
  };
  return (
    <>
      <PageHead title="Today" crumbs={[{ label: 'Today', to: '/' }, { label: me.name }]}
        actions={<><button className="btn btn-grey" onClick={() => setOff(true)}><IconBeach size={16} />Add time off</button><Link to="/calendar" className="btn btn-primary"><IconCalendar size={16} />My calendar</Link></>} />

      <div className="attn">
        <div style={{ background: 'var(--deep)', color: '#fff' }}><IconAlertTriangle size={18} color="#00c7a1" /><b style={{ fontSize: 13 }}>Needs your<br />attention</b></div>
        {[['Visits today', today.filter(isOpenVisit).length, 'Booked for you today', '#e0a100', '/surveys?show=today'], ['Not finished', inProgress.length, 'Started but not submitted', '#d64545', '/surveys?show=progress'], ['Waiting for the office', moved.length, 'You asked to move a visit', '#e0a100', '/surveys?show=moved'], ['Done this month', doneMonth.length, 'Surveys and inspections', '#1f9d5b', '/surveys?show=done']].map(([l, n, sub, c, to]: any) => (
          <Link key={l} to={to}>
            <span className="n" style={{ color: n ? c : 'var(--ok)' }}>{n}</span>
            <span className="vstack" style={{ gap: 1 }}><b style={{ fontSize: 13 }}>{l}</b><span className="tiny muted">{n ? sub : 'All clear'}</span></span>
            <IconChevronRight size={15} color="#6b7a78" style={{ marginLeft: 'auto' }} />
          </Link>
        ))}
      </div>

      <div className="banner">
        <div className="photo" style={{ backgroundImage: `url(${IMG.house})` }} />
        <span className="glow" style={{ left: 520, top: -60 }} />
        <div className="vstack" style={{ gap: 8 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.4 }}>Good morning, {me.first}</h2>
          <span style={{ color: '#cfe0db', fontSize: 14 }}>{today.filter(isOpenVisit).length ? `You have ${today.filter(isOpenVisit).length} visit${today.filter(isOpenVisit).length > 1 ? 's' : ''} left today${next ? ` — next is ${next.customer} at ${next.time.split(' ')[0]} in ${next.address.split(', ').slice(-2, -1)[0] || next.address}` : ''}.` : 'All your visits for today are done. Well done.'}</span>
        </div>
        <span className="ml-auto hstack" style={{ color: '#e6efec', fontSize: 13.5 }}><IconRefresh size={16} />In step with the office</span>
      </div>

      <div className="grid-4">
        {([['Visits this week', String(week.length + today.filter(isOpenVisit).length), 'Including today', IconCalendar, '#0b6e5c'], ['Frames to check', String(framesWeek), 'This week', IconRuler, '#0b6e5c'], ['Surveys done', String(surveysMonth.length), 'This month', IconClipboardCheck, '#1f9d5b'], ['Sizes changed', surveysMonth.length ? `${Math.round((changedMonth.length / surveysMonth.length) * 100)}%` : '0%', `${changedMonth.length} of ${surveysMonth.length} surveys this month`, IconAlertTriangle, '#e0a100']] as [string, string, string, any, string][]).map(([l, val, s, I, c]) => (
          <div key={l} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}><Tile icon={<I size={22} />} color={c} size={48} /><div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{val}</b><span className="tiny muted">{s}</span></div></div>
        ))}
      </div>

      <div className="row">
        <div className="col grow">
          {next ? (
            <Card>
              <CardHead title={next.status === 'On site' ? 'You are here now' : 'Next visit'} right={<Tag tone={statusTone[next.status]}>{next.status}</Tag>} />
              <div className="hstack" style={{ gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <img src={IMG[next.photo as keyof typeof IMG]} alt="" style={{ width: 220, height: 150, borderRadius: 12, objectFit: 'cover' }} />
                <div className="vstack" style={{ gap: 8, flex: 1, minWidth: 260 }}>
                  <div className="hstack" style={{ gap: 8 }}><b style={{ fontSize: 18 }}>{next.customer}</b><Tag tone={next.kind === 'Final survey' ? 'jade' : 'warn'}>{next.kind}</Tag></div>
                  <span className="hstack small t2" style={{ gap: 6 }}><IconClock size={14} />{next.time}</span>
                  <span className="hstack small t2" style={{ gap: 6 }}><IconMapPin size={14} />{next.address}</span>
                  {next.kind === 'Final survey' ? <span className="hstack small t2" style={{ gap: 6 }}><IconRuler size={14} />{next.items} frame{next.items === 1 ? '' : 's'} to check · measured by {salespersonOf(next.e)}</span> : <span className="hstack small t2" style={{ gap: 6 }}><IconTool size={14} />{next.snag.title}</span>}
                  {next.e?.survey?.notes && next.kind === 'Final survey' && <div className="alert warn small"><IconAlertTriangle size={15} />{next.e.survey.notes}</div>}
                  {next.e?.survey?.access && <span className="tiny muted">Access: {next.e.survey.access} · Parking: {next.e.survey.parking}</span>}
                  <div className="hstack" style={{ gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                    <a className="btn btn-grey" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(next.address)}`} target="_blank" rel="noreferrer"><IconMapPin size={16} />Directions</a>
                    {next.e && <a className="btn btn-grey" href={`tel:${next.e.phone.replace(/\s/g, '')}`} onClick={() => toast(`Calling ${next.customer}`)}><IconPhone size={16} />Call</a>}
                    <Link to={next.to} className="btn btn-outline">Visit details</Link>
                    <Action v={next} big />
                  </div>
                </div>
              </div>
              {next.kind === 'Final survey' && (
                <div className="hstack" style={{ gap: 8, flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {itemsToCheck(next.e).map(i => <span key={i.no} className="tag grey">{i.no}. {i.name.split(' – ')[0]} · {i.size}</span>)}
                </div>
              )}
            </Card>
          ) : (
            <Card><div className="alert ok"><IconCircleCheck size={18} />Nothing left for today. Your next visits are below.</div></Card>
          )}

          <Card>
            <CardHead title="Today's route" sub={fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'long' })} right={<a className="link" href={`https://www.google.com/maps/dir/${today.map(v => encodeURIComponent(v.address)).join('/')}`} target="_blank" rel="noreferrer"><IconMapPin size={14} />Whole route in Maps</a>} />
            <div className="route">
              {today.map((v, i) => (
                <React.Fragment key={v.id}>
                  {i > 0 && <div className="drive"><IconCar size={13} />About {20 + i * 5} minutes' drive</div>}
                  <div className="stop">
                    <div className="rail"><span className={`pin ${v.status === 'Submitted' ? 'done' : v === next ? 'now' : ''}`}>{v.status === 'Submitted' ? <IconCircleCheck size={16} /> : i + 1}</span>{i < today.length - 1 && <span className="line" />}</div>
                    <div className="card" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, marginBottom: 4 }}>
                      <img src={IMG[v.photo as keyof typeof IMG]} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                      <Link to={v.to} className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                        <b style={{ fontSize: 13.5 }}>{v.time.split(' ')[0]} · {v.customer}</b>
                        <span className="tiny muted">{v.kind}{v.kind === 'Final survey' ? ` · ${v.items} frames` : ` · ${v.snag.title}`} · {v.address.split(', ').slice(-2).join(', ')}</span>
                      </Link>
                      <Tag tone={statusTone[v.status]}>{v.status}</Tag>
                      <div className="hstack" style={{ gap: 6 }}><Action v={v} /></div>
                    </div>
                  </div>
                </React.Fragment>
              ))}
              {today.length === 0 && <span className="small muted">Nothing booked today.</span>}
            </div>
          </Card>
        </div>

        <div className="col w-360">
          <Card>
            <CardHead title="Coming up" right={<Link to="/calendar" className="link">Calendar<IconChevronRight size={14} /></Link>} />
            {later.length === 0 && <span className="small muted">Nothing else booked yet.</span>}
            {later.map(v => (
              <Link key={v.id} to={v.to} className="card" style={{ padding: 0, gap: 0, borderLeft: `3px solid ${v.kind === 'Final survey' ? '#0b6e5c' : '#e0a100'}` }}>
                <div className="hstack" style={{ gap: 10, padding: 12 }}>
                  <img src={IMG[v.photo as keyof typeof IMG]} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
                  <div className="vstack" style={{ gap: 3, flex: 1 }}><b style={{ fontSize: 13.5 }}>{v.customer}</b><span className="small t2 hstack" style={{ gap: 5 }}><IconCalendar size={13} />{fmtDate(v.date, { weekday: 'short', day: 'numeric', month: 'short' })}</span></div>
                  {v.moveAsked && <Tag tone="warn">Move asked</Tag>}
                </div>
                <div className="between small t2" style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}><span className="hstack" style={{ gap: 5 }}><IconClock size={13} />{v.time}</span><span>{v.kind === 'Final survey' ? `${v.items} frame${v.items === 1 ? '' : 's'}` : 'Inspection'}</span></div>
              </Link>
            ))}
          </Card>
          <Card>
            <CardHead title="From the office" right={<Link to="/messages" className="link">Messages<IconChevronRight size={14} /></Link>} />
            {fromOffice.length === 0 && <span className="small muted">Nothing new.</span>}
            {fromOffice.map(({ v, c }) => (
              <Link key={c.id} to={v.to} className="hstack" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)', alignItems: 'flex-start' }}>
                <Avatar i="SM" size={30} />
                <div className="vstack" style={{ gap: 2, flex: 1, minWidth: 0 }}><b style={{ fontSize: 13 }}>{c.title}</b><span className="tiny muted">{v.customer} · {c.when}</span></div>
              </Link>
            ))}
          </Card>
          <Card>
            <CardHead title="Recently submitted" right={<Link to="/surveys?show=done" className="link">All<IconChevronRight size={14} /></Link>} />
            {done.slice(-4).reverse().map(v => (
              <Link key={v.id} to={v.to} className="hstack" style={{ gap: 10, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                <img src={IMG[v.photo as keyof typeof IMG]} alt="" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
                <div className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 13 }}>{v.customer}</b><span className="tiny muted">{v.kind} · {v.e?.finalSurvey?.doneOn || v.snag?.inspected?.on}</span></div>
                {v.kind === 'Final survey' ? (v.changed ? <Tag tone="warn">{v.changed} changed</Tag> : <Tag tone="ok">All match</Tag>) : <Tag tone="ok">Inspected</Tag>}
              </Link>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid-4" style={{ gap: 16 }}>
        {[['My surveys', 'Every final survey booked for you', '#0b6e5c', IconClipboardCheck, '/surveys'], ['Inspections', 'Aftercare and snag visits', '#00c7a1', IconTool, '/inspections'], ['Messages', 'Notes from the office', '#0b6e5c', IconMessage, '/messages'], ['My calendar', 'Visits and time off', '#0b6e5c', IconInbox, '/calendar']].map(([t, s, c, I, to]: any) => (
          <button key={t} className="pill-action" style={{ background: hexA(c, 0.08), borderColor: hexA(c, 0.2), textAlign: 'left' }} onClick={() => nav(to)}>
            <span className="ic" style={{ background: c }}><I size={19} /></span>
            <span className="vstack" style={{ gap: 2, flex: 1 }}><b style={{ fontSize: 14 }}>{t}</b><span className="small t2">{s}</span></span>
            <IconChevronRight size={17} color={c} />
          </button>
        ))}
      </div>
      {way && <OnMyWayModal v={way} onClose={() => setWay(null)} />}
      {off && <TimeOffModal onClose={() => setOff(false)} />}
    </>
  );
}
