// Book an installation in three simple steps:
//   1. choose the job  2. pick the date and arrival time  3. choose the installers who are free.
// The booking is saved on the job and in the diary under the job's name, and the
// customer and every chosen installer are told. The same window changes or cancels a booking.
import React, { useMemo, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconCalendarOff, IconChevronLeft, IconChevronRight, IconSearch, IconCheck, IconBeach, IconClock, IconUsers, IconCalendarPlus, IconInfoCircle } from '@tabler/icons-react';
import { Modal, Field, useToast, Check, Tag, Avatar } from './ui';
import { IMG, Installer } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, mondayOf, DiaryEvent, EnquiryX } from '../data/store';
import { busyWith, freeOn, crewOf, crewTeam, joinNames, isSunday, getRoster } from '../data/crew';

export const TIMES = ['08:00 – 09:00', '08:30 – 09:30', '10:00 – 11:00', '12:00 – 13:00'];
const first = (n: string) => n.split(' ')[0];
const range = (date: string, days: number) => `${fmtDate(date)}${days > 1 ? ` – ${fmtDate(addDays(date, days - 1))}` : ''}`;

/** Every day shown in a month grid: Monday of the first week to Sunday of the last. */
export function monthCells(month: string) {
  const start = mondayOf(month.slice(0, 7) + '-01');
  const d = new Date(month.slice(0, 7) + '-01T12:00:00'); d.setMonth(d.getMonth() + 1); d.setDate(0);
  const last = d.toISOString().slice(0, 10);
  const out: string[] = [];
  for (let x = start; x <= last || out.length % 7 !== 0; x = addDays(x, 1)) out.push(x);
  return out;
}
export const shiftMonth = (month: string, n: number) => { const d = new Date(month.slice(0, 7) + '-01T12:00:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 7) + '-01'; };
export const monthName = (month: string) => fmtDate(month.slice(0, 7) + '-01', { month: 'long', year: 'numeric' });

/** Why an installer can or can't go on these days. */
export function availability(p: Installer, date: string, days: number, events: DiaryEvent[], ignoreId?: string) {
  const hit = busyWith(p.id, date, days, events, ignoreId);
  if (!hit) return { free: true, label: 'Free', tone: 'ok' as const };
  if (hit.kind === 'leave') return { free: false, label: `On leave ${range(hit.date, hit.days)}`, tone: 'grey' as const, hit };
  return { free: false, label: `Booked: ${hit.title.split(' · ')[0]} · ${range(hit.date, hit.days)}`, tone: 'warn' as const, hit };
}

/** One week strip for an installer: dark = booked, striped = leave. */
export function WeekStrip({ id, date, days, events, ignoreId }: { id: string; date: string; days: number; events: DiaryEvent[]; ignoreId?: string }) {
  const mon = mondayOf(date);
  return (
    <div className="wstrip">
      {Array.from({ length: 7 }, (_, i) => addDays(mon, i)).map(d => {
        const hit = busyWith(id, d, 1, events, ignoreId);
        const inRange = d >= date && d <= addDays(date, days - 1);
        return <span key={d} title={`${fmtDate(d)} · ${hit ? hit.title : 'Free'}`} className={`${hit ? (hit.kind === 'leave' ? 'leave' : 'busy') : ''} ${inRange ? 'pick' : ''}`}>{fmtDate(d, { weekday: 'narrow' })}</span>;
      })}
    </div>
  );
}

/** Pick one or more installers. Busy or on-leave people can't be picked. */
export function InstallerPicker({ date, days, value, onChange, ignoreId }: { date: string; days: number; value: string[]; onChange: (v: string[]) => void; ignoreId?: string }) {
  const { events, installers } = useStore();
  const [onlyFree, setOnlyFree] = useState(false);
  const list = installers.filter(p => p.active !== false).map(p => ({ p, a: availability(p, date, days, events, ignoreId) })).sort((x, y) => Number(y.a.free) - Number(x.a.free));
  const shown = onlyFree ? list.filter(x => x.a.free) : list;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id]);
  return (
    <div className="vstack" style={{ gap: 10 }}>
      <div className="between">
        <span className="small t2"><b style={{ color: 'var(--text)' }}>{list.filter(x => x.a.free).length} of {list.length}</b> installers are free {days > 1 ? `for all ${days} days` : 'that day'}</span>
        <button type="button" className={`chip ${onlyFree ? 'on' : ''}`} onClick={() => setOnlyFree(!onlyFree)}>Only show free</button>
      </div>
      <div className="grid-2" style={{ gap: 10 }}>
        {shown.map(({ p, a }) => {
          const on = value.includes(p.id);
          return (
            <button type="button" key={p.id} disabled={!a.free && !on} onClick={() => toggle(p.id)} className={`inst-card ${on ? 'on' : ''} ${a.free ? '' : 'busy'}`}>
              <span className="tick">{on && <IconCheck size={14} />}</span>
              <Avatar i={p.initials} size={38} bg={p.color} fg="#fff" />
              <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                <div className="between" style={{ gap: 6 }}><b style={{ fontSize: 13 }}>{p.name}</b>{a.free ? <Tag tone="ok">Free</Tag> : a.hit?.kind === 'leave' ? <Tag tone="grey" icon={<IconBeach size={12} />}>Leave</Tag> : <Tag tone="warn">Busy</Tag>}</div>
                <span className="tiny muted">{p.role} · {p.skills}</span>
                {!a.free && <span className="tiny" style={{ color: 'var(--text-2)' }}>{a.label}</span>}
                <WeekStrip id={p.id} date={date} days={days} events={events} ignoreId={ignoreId} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Small month calendar: each day shows how many installers are free. */
function PickDay({ date, days, onPick, ignoreId }: { date: string; days: number; onPick: (d: string) => void; ignoreId?: string }) {
  const { events, installers } = useStore();
  const [month, setMonth] = useState(date.slice(0, 7) + '-01');
  const total = installers.filter(p => p.active !== false).length;
  return (
    <div className="pickday">
      <div className="between" style={{ marginBottom: 8 }}>
        <button type="button" className="icon-btn" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"><IconChevronLeft size={16} /></button>
        <b style={{ fontSize: 14 }}>{monthName(month)}</b>
        <button type="button" className="icon-btn" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month"><IconChevronRight size={16} /></button>
      </div>
      <div className="pd-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d} className="pd-hd">{d}</span>)}
        {monthCells(month).map(d => {
          const out = d.slice(0, 7) !== month.slice(0, 7);
          const past = d < TODAY;
          const sun = isSunday(d);
          const n = freeOn(d, 1, events, ignoreId).length;
          const inRange = d >= date && d <= addDays(date, days - 1);
          return (
            <button type="button" key={d} disabled={past || sun} onClick={() => onPick(d)} className={`pd-day ${out ? 'out' : ''} ${inRange ? 'pick' : ''} ${d === date ? 'start' : ''} ${d === TODAY ? 'today' : ''}`}>
              <span className="n">{+d.slice(8)}</span>
              {!past && !sun && <span className={`free ${n === 0 ? 'none' : n < total / 2 ? 'few' : ''}`}>{n} free</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

type Props = { onClose: () => void; jobId?: string; event?: DiaryEvent; presetDate?: string; presetCrew?: string[]; presetTeam?: string };

export function BookInstallModal({ onClose, jobId, event, presetDate, presetCrew }: Props) {
  const toast = useToast();
  const { jobs, set, updateJob, enquiries, updEnq, events } = useStore();
  const mode = event ? 'change' : 'new';
  const hasInstall = (e: EnquiryX) => events.some(ev => ev.job === e.jobId && ev.kind === 'install' && ev.team !== 'un');
  const choices = useMemo(() => enquiries.filter(e => e.type === 'Sales' && e.stage === 'Won' && e.jobId && !hasInstall(e) && !e.ops?.work && !e.ops?.closed)
    .map(e => { const o = e.ops || {}; const waiting = events.find(ev => ev.job === e.jobId && ev.team === 'un'); const ready = !!o.received?.ok || !!o.override; return { e, ready, waiting }; })
    .sort((a, b) => Number(b.ready) - Number(a.ready)), [enquiries, events]);
  const [job, setJob] = useState(event?.job || jobId || choices.find(c => c.ready)?.e.jobId || '');
  const startWait = events.find(ev => ev.job === (event?.job || jobId) && ev.team === 'un');
  const [step, setStep] = useState(event || jobId ? 1 : 0);
  const [date, setDate] = useState(event?.date || presetDate || startWait?.date || addDays(TODAY, 3));
  const [days, setDays] = useState(event?.days || 2);
  const [time, setTime] = useState(event?.time || TIMES[0]);
  const [crew, setCrew] = useState<string[]>(event ? crewOf(event) : presetCrew || []);
  const [q, setQ] = useState('');
  const [reason, setReason] = useState('');
  const [cancelAsk, setCancelAsk] = useState(false);
  const rec = enquiries.find(x => x.jobId === job);
  const j = jobs.find(x => x.id === job);
  const o = rec?.ops || {};
  const checks: [string, boolean][] = [['Order delivered and checked', !!o.received?.ok], ['Deposit paid', !!o.deposit], ['No open delivery problem', !(o.received && !o.received.ok)]];
  const allReady = checks.every(c => c[1]);
  const ov = o.override;
  const okToBook = allReady || !!ov || reason.trim().length > 4;
  const busyPicked = crew.filter(id => busyWith(id, date, days, events, event?.id));
  const people = crew.map(id => getRoster().find(p => p.id === id)!).filter(Boolean);
  const names = joinNames(people.map(p => p.name));
  const firsts = joinNames(people.map(p => first(p.name)));
  const canBook = !!rec && crew.length > 0 && busyPicked.length === 0 && !isSunday(date) && (mode === 'change' || okToBook);

  const save = () => {
    if (!rec) return;
    const town = rec.address.split(', ').pop() || '';
    if (mode === 'new') {
      const ev: DiaryEvent = { id: 'ev' + Date.now(), team: 'crew', crew, time, date, days, kind: 'install', title: `${rec.name} · ${rec.product.toLowerCase()}`, sub: `${job} · ${town}`, photo: rec.photo, job };
      set('events', es => [...es.filter(x => !(x.team === 'un' && x.job === job)), ev]);
      if (j) updateJob(job, { installDate: date, installDays: days, next: 'Installation', due: fmtDate(date) }, `Installation booked: ${names}, ${range(date, days)}, arriving ${time}${allReady || ov ? '' : ` · checks overridden — reason: ${reason}`}. Customer and installers told.`);
      updEnq(rec.id, { next: 'Installation', nextDue: fmtDate(date) }, { kind: 'email-out', title: `Installation booked · ${range(date, days)}`, body: `Dear ${rec.name}, your installation is booked for ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${days > 1 ? ` for ${days} days` : ''}. ${names} will arrive between ${time.replace(' – ', ' and ')}.`, who: 'Sarah Mitchell' });
      toast(`Booked · ${firsts} · ${range(date, days)} · customer and installers told`);
    } else {
      set('events', es => es.map(x => (x.id === event!.id ? { ...x, crew, team: 'crew', date, days, time } : x)));
      if (j) updateJob(job, { installDate: date, installDays: days, due: fmtDate(date) }, `Installation changed: ${names}, ${range(date, days)}, arriving ${time}. Customer and installers told again.`);
      updEnq(rec.id, { nextDue: fmtDate(date) }, { kind: 'email-out', title: `Installation changed · ${range(date, days)}`, body: `Dear ${rec.name}, we have updated your installation: ${fmtDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}${days > 1 ? ` for ${days} days` : ''}, ${names}, arriving ${time}.`, who: 'Sarah Mitchell' });
      toast('Booking changed · customer and installers told again');
    }
    onClose();
  };
  const cancel = () => {
    set('events', es => es.filter(x => x.id !== event!.id));
    if (j) updateJob(job, { installDate: undefined, next: 'Book installation', due: 'Today' }, `Installation on ${fmtDate(event!.date)} cancelled${reason ? ' — ' + reason : ''}. Back in the ready-to-book list.`);
    if (rec) updEnq(rec.id, { next: 'Book installation', nextDue: 'Today' }, { kind: 'email-out', title: 'Installation cancelled', body: `Dear ${rec.name}, your installation on ${fmtDate(event!.date)} has been cancelled${reason ? ` (${reason})` : ''}. We will call you to agree a new date.`, who: 'Sarah Mitchell' });
    toast('Booking cancelled · back in Ready to book · customer told'); onClose();
  };

  const STEPS = ['Choose the job', 'Pick date and time', 'Choose installers'];
  const next = () => setStep(s => Math.min(2, s + 1));
  const foot = cancelAsk ? (
    <><span className="small t2" style={{ marginRight: 'auto' }}>Cancel this installation and tell the customer?</span><button className="btn btn-grey" onClick={() => setCancelAsk(false)}>Keep booking</button><button className="btn btn-danger" onClick={cancel}>Yes, cancel it</button></>
  ) : (
    <>
      {mode === 'change' && <button className="btn btn-outline" style={{ marginRight: 'auto', color: 'var(--err)' }} onClick={() => setCancelAsk(true)}><IconCalendarOff size={16} />Cancel booking</button>}
      {step > (mode === 'change' ? 1 : 0) ? <button className="btn btn-grey" onClick={() => setStep(step - 1)}>Back</button> : <button className="btn btn-grey" onClick={onClose}>Close</button>}
      {step < 2
        ? <button className="btn btn-primary" disabled={!rec || (step === 1 && isSunday(date))} onClick={next}>Next</button>
        : <button className="btn btn-primary" disabled={!canBook} onClick={save}><IconCalendarPlus size={16} />{mode === 'new' ? 'Book installation' : 'Save change and tell everyone'}</button>}
    </>
  );

  return (
    <Modal title={mode === 'new' ? 'Book installation' : 'Change or cancel booking'} sub={rec ? `${rec.name} · ${job} · ${rec.product}` : 'Choose the job, then the day, then who goes.'} onClose={onClose} width={860} footer={foot}>
      <div className="stepper">
        {STEPS.map((s, i) => (
          <button type="button" key={s} className={`st ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`} disabled={i > step || (mode === 'change' && i === 0)} onClick={() => setStep(i)}>
            <span className="num">{i < step ? <IconCheck size={13} /> : i + 1}</span>{s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="input-icon"><IconSearch size={16} /><input className="input" placeholder="Search customer or job number" value={q} onChange={x => setQ(x.target.value)} /></div>
          <div className="vstack" style={{ gap: 8, maxHeight: 380, overflow: 'auto' }}>
            {choices.filter(c => (c.e.name + c.e.jobId + c.e.address).toLowerCase().includes(q.toLowerCase())).map(({ e, ready, waiting }) => (
              <button type="button" key={e.id} className={`job-pick ${job === e.jobId ? 'on' : ''}`} onClick={() => { setJob(e.jobId!); if (waiting) setDate(waiting.date); }}>
                <img src={IMG[e.photo]} alt="" />
                <div className="vstack" style={{ gap: 3, flex: 1, minWidth: 0 }}>
                  <b style={{ fontSize: 14 }}>{e.name} <span className="tiny muted">· {e.jobId}</span></b>
                  <span className="tiny muted">{e.product} · {e.address}</span>
                </div>
                {waiting ? <Tag tone="warn">Waiting for installers</Tag> : ready ? <Tag tone="ok">{e.ops?.received?.ok ? 'Ready to book' : 'Approved early'}</Tag> : <Tag tone="grey">Not delivered yet</Tag>}
                <span className="tick">{job === e.jobId && <IconCheck size={14} />}</span>
              </button>
            ))}
            {choices.length === 0 && <div className="small muted">Every job is already booked.</div>}
          </div>
        </>
      )}

      {step === 1 && (
        <div className="row" style={{ gap: 18, alignItems: 'flex-start' }}>
          <div className="col grow"><PickDay date={date} days={days} onPick={setDate} ignoreId={event?.id} /></div>
          <div className="vstack w-280" style={{ gap: 14 }}>
            <Field label="Start date"><input type="date" className="input" min={TODAY} value={date} onChange={x => x.target.value && setDate(x.target.value)} /></Field>
            <Field label="How many days?"><div className="hstack" style={{ gap: 6, flexWrap: 'wrap' }}>{[1, 2, 3, 4, 5].map(d => <button type="button" key={d} className={`chip ${days === d ? 'on' : ''}`} onClick={() => setDays(d)}>{d} day{d > 1 ? 's' : ''}</button>)}</div></Field>
            <Field label="Arrival time"><div className="vstack" style={{ gap: 6 }}>{TIMES.map(t => <button type="button" key={t} className={`chip ${time === t ? 'on' : ''}`} style={{ justifyContent: 'flex-start' }} onClick={() => setTime(t)}><IconClock size={14} />{t}</button>)}</div></Field>
            {isSunday(date)
              ? <div className="alert warn small"><IconAlertTriangle size={16} />Nobody works on Sundays. Pick another day.</div>
              : <div className="alert ok small"><IconUsers size={16} /><div><b>{freeOn(date, days, events, event?.id).length} installers free</b> {range(date, days)}</div></div>}
          </div>
        </div>
      )}

      {step === 2 && (
        <>
          <div className="hstack small" style={{ gap: 10, padding: '10px 12px', borderRadius: 10, background: 'var(--tint)', flexWrap: 'wrap' }}>
            <IconCalendarPlus size={16} color="#0b6e5c" /><b>{range(date, days)}</b><span className="t2">· {days} day{days > 1 ? 's' : ''} · arriving {time}</span>
            <button type="button" className="link small ml-auto" onClick={() => setStep(1)}>Change date</button>
          </div>
          <InstallerPicker date={date} days={days} value={crew} onChange={setCrew} ignoreId={event?.id} />
          <div className="card" style={{ padding: 14, gap: 10 }}>
            <div className="between"><b>Booking summary</b>{crew.length ? <Tag tone="jade">{crew.length} installer{crew.length > 1 ? 's' : ''}</Tag> : <Tag tone="warn">Choose at least one installer</Tag>}</div>
            <div className="grid-2" style={{ rowGap: 8 }}>
              {[['Shows in the diary as', rec ? `${rec.name} · ${rec.product.toLowerCase()}` : '—'], ['When', `${range(date, days)} · ${time}`], ['Installers', names || '—'], ['Address', rec?.address || '—']].map(([l, v]) => <div key={l} className="vstack" style={{ gap: 2 }}><span className="tiny muted">{l}</span><b style={{ fontSize: 13 }}>{v}</b></div>)}
            </div>
            {crew.length === 1 && <span className="hstack tiny t2" style={{ gap: 6 }}><IconInfoCircle size={13} />Most jobs need two installers. Bigger jobs need three.</span>}
            {busyPicked.length > 0 && <div className="alert err small"><IconAlertTriangle size={16} />{joinNames(busyPicked.map(id => getRoster().find(p => p.id === id)?.name || id))} {busyPicked.length > 1 ? 'are' : 'is'} not free on these days. Remove them or pick another date.</div>}
            {mode === 'new' && (
              <>
                <div className="hstack" style={{ gap: 14, flexWrap: 'wrap' }}>{checks.map(([l, ok]) => <span key={l} className="hstack small" style={{ gap: 6, color: ok ? 'var(--ok)' : 'var(--err)' }}>{ok ? <IconCircleCheck size={16} /> : <IconAlertTriangle size={16} />}<span style={{ color: ok ? 'var(--text)' : 'var(--err)', fontWeight: ok ? 400 : 600 }}>{l}</span></span>)}</div>
                {!allReady && ov && <div className="alert ok small"><IconCircleCheck size={16} /><div><b>Booking early approved by {ov.by}</b> on {ov.on}: {ov.reason}</div></div>}
                {!allReady && !ov && <Field label="Reason to book anyway (required)" hint="Only if a manager agreed. The reason is saved in the job history."><input className="input" value={reason} onChange={x => setReason(x.target.value)} placeholder="e.g. Director agreed — delivery confirmed for Monday" /></Field>}
              </>
            )}
            <Check on label="Tell the customer (email) and each installer (phone app)" />
          </div>
        </>
      )}
      {mode === 'change' && cancelAsk && <Field label="Reason for cancelling (optional)"><input className="input" value={reason} onChange={x => setReason(x.target.value)} placeholder="e.g. Customer asked to move it" /></Field>}
    </Modal>
  );
}

export { crewTeam };
