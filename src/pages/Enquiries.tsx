import React, { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  IconPlus, IconSearch, IconDownload, IconPhone, IconMail, IconUserPlus, IconChevronRight, IconNotes, IconChecklist, IconPaperclip,
  IconCalendarEvent, IconPhoneCall, IconCircleCheck, IconUser, IconWorld, IconInbox, IconAlertTriangle, IconFileText, IconHome, IconArrowsSplit, IconTrophy, IconX, IconLayoutKanban, IconListDetails, IconUserCheck,
} from '@tabler/icons-react';
import { PageHead, Card, CardHead, Tag, Avatar, Tabs, Tile, useToast, Modal, Field, Seg } from '../components/ui';
import { stepFor, needsOffice, PHASES, JourneyCard, ActionModal, roleTone, remindText } from '../components/Journey';
import { NewEnquiryModal, LogCallModal, AssignModal, AddTaskModal } from '../components/Forms';
import { staffById, STAGES, IMG, gbp } from '../data/mock';
import { useStore, TODAY, fmtDate } from '../data/store';

export const stageTone: Record<string, string> = { 'New Enquiry': 'info', Qualification: 'jade', Appointment: 'jade', 'Quote Preparation': 'warn', 'Quote Sent': 'info', 'Follow-up': 'warn', Won: 'ok', Lost: 'err' };
const typeTone: Record<string, string> = { Sales: 'jade', 'Existing job': 'info', Aftercare: 'warn' };

export function RouteModal({ id, onClose }: { id: string; onClose: () => void }) {
  const toast = useToast();
  const { enquiries, set, updEnq } = useStore();
  const e = enquiries.find(x => x.id === id)!;
  const [to, setTo] = useState<'Existing job' | 'Aftercare'>(e.type === 'Sales' ? 'Aftercare' : (e.type as any));
  // Jobs come from the won customer records. The customer's own jobs (same name, email, postcode or address) come first.
  const jobs = enquiries.filter(x => x.jobId && x.id !== e.id);
  const mine = (x: any) => x.name === e.name || (e.email && x.email === e.email) || x.postcode === e.postcode || x.address === e.address;
  const theirs = jobs.filter(mine);
  const others = jobs.filter(x => !mine(x));
  const [job, setJob] = useState((theirs[0] || jobs[0])?.jobId || '');
  const target = jobs.find(x => x.jobId === job);
  const send = () => {
    if (!target) return;
    const msg = e.comms?.[0]?.body || 'Customer message';
    set('enquiries', es => es.map(x => (x.id === id ? { ...x, type: to, routedTo: job, next: `Sent to ${to === 'Aftercare' ? 'aftercare' : 'job owner'}`, nextDue: 'Done' } : x)));
    if (to === 'Aftercare') set('snags', ss => [{ id: 'SN-' + (130 + ss.length), job, kind: 'Aftercare', title: e.product && e.product !== 'Other' ? `${e.product} · customer reported problem` : 'Customer reported problem', detail: msg, customer: target.name, severity: 'Medium', status: 'Open', tone: 'err', owner: 'Aftercare team', reported: fmtDate(TODAY), photo: target.photo } as any, ...ss]);
    updEnq(target.id, {}, { kind: 'email-in', title: `${to === 'Aftercare' ? 'Aftercare request' : 'Customer question'} received`, body: msg, who: e.name });
    toast(`Sent to ${to === 'Aftercare' ? 'aftercare' : 'the job owner'} · saved on ${job}`); onClose();
  };
  return (
    <Modal title="Send to the right person" sub={`${e.name} · this is not a new sale`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!target} onClick={send}>Send</button></>}>
      <Field label="What is it about?"><div className="hstack" style={{ gap: 8 }}>{(['Existing job', 'Aftercare'] as const).map(k => <button key={k} className={`chip ${to === k ? 'on' : ''}`} onClick={() => setTo(k)}>{k === 'Existing job' ? 'A current job' : 'Aftercare problem'}</button>)}</div></Field>
      <Field label={`Which of ${e.name}’s jobs is this about?`} hint={theirs.length ? `We found ${theirs.length === 1 ? '1 job' : `${theirs.length} jobs`} for ${e.name}.` : `No jobs found for ${e.name} — pick the right one from all jobs.`}>
        <select className="select" value={job} onChange={x => setJob(x.target.value)}>
          {theirs.length > 0 && <optgroup label={`${e.name}’s jobs`}>{theirs.map(j => <option key={j.id} value={j.jobId}>{j.jobId} · {j.product} · {j.ops?.closed ? 'Fitted, in guarantee' : 'In progress'}</option>)}</optgroup>}
          <optgroup label={theirs.length ? 'Other customers’ jobs' : 'All jobs'}>{others.map(j => <option key={j.id} value={j.jobId}>{j.jobId} · {j.name} · {j.address}</option>)}</optgroup>
        </select>
      </Field>
      <div className="alert info small"><IconArrowsSplit size={16} />{to === 'Aftercare' ? 'An aftercare request is opened on that job.' : 'The message is added to that job.'} It does not go to Sales.</div>
    </Modal>
  );
}

export function Enquiries() {
  const nav = useNavigate();
  const toast = useToast();
  const { enquiries, events, snags, updEnq } = useStore();
  const ctx = { events, snags: snags as any };
  const [view, setView] = useState('board');
  const [stage, setStage] = useState('All');
  const [q, setQ] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const [act, setAct] = useState<{ id: string; k: string } | null>(null);
  const steps = useMemo(() => Object.fromEntries(enquiries.map(e => [e.id, stepFor(e, ctx)])), [enquiries, events, snags]);
  const search = (e: any) => (e.name + e.postcode + e.id + e.product).toLowerCase().includes(q.toLowerCase());
  const phaseLabel = (id: string) => PHASES.find(p => p.id === id)?.label || id;
  const match = (e: any, s: string) => s === 'All' || (s === 'Your turn' ? needsOffice(steps[e.id]) : s === 'Not sales' ? e.type !== 'Sales' : steps[e.id].phase === s);
  const rows = enquiries.filter(e => match(e, stage) && search(e));
  const count = (s: string) => enquiries.filter(e => match(e, s)).length;
  const yours = enquiries.filter(e => needsOffice(steps[e.id]));
  const overdue = enquiries.filter(e => e.nextDue === 'Overdue').length;
  const remind = (e: any) => { const r = remindText(e, steps[e.id], events); updEnq(e.id, {}, { kind: 'reminder', title: `Reminder sent to ${r.who}`, body: r.body, who: 'Sarah Mitchell' }); toast(`Reminder sent to ${r.who} about ${e.name}`); };
  const actE = act && enquiries.find(x => x.id === act.id);
  const cols = PHASES.filter(p => p.id !== 'lost' || showLost);
  return (
    <>
      <PageHead title="Enquiries" crumbs={[{ label: 'Dashboard', to: '/' }, { label: 'Enquiries' }]}
        actions={<><Seg value={view} onChange={setView} items={[{ id: 'board', label: 'Board', icon: <IconLayoutKanban size={15} /> }, { id: 'list', label: 'List', icon: <IconListDetails size={15} /> }]} /><button className="btn btn-grey"><IconDownload size={16} />Export</button><button className="btn btn-primary" onClick={() => setModal('new')}><IconPlus size={16} />New enquiry</button></>} />
      <div className="alert info small"><IconInbox size={16} /><div>Every customer, from the first enquiry to aftercare. Cards marked <b>Your turn</b> need the office. Everyone else’s step shows who has it, with a reminder button if it goes quiet.</div></div>
      <div className="grid-4">
        {[['Your turn', String(yours.length), IconUserCheck, '#e0a100', 'Office tasks waiting', 'Your turn'], ['New, not yet handled', String(count('new')), IconInbox, '#0b6e5c', 'Assign or route each one', 'new'], ['Follow-ups overdue', String(overdue), IconAlertTriangle, '#d64545', overdue ? 'Chase them up' : 'All on time', 'All'], ['In progress after Won', String(enquiries.filter(e => e.stage === 'Won' && steps[e.id].phase !== 'after').length), IconTrophy, '#1f9d5b', 'Orders, fitting and closing', 'won']].map(([l, v, I, c, sub, f]: any) => (
          <button key={l} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, textAlign: 'left', cursor: 'pointer' }} onClick={() => { if (f === 'Your turn') { setMineOnly(true); setStage('Your turn'); } else { setStage(f); setView('list'); } }}>
            <Tile icon={<I size={22} />} color={c} size={48} />
            <div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{v}</b><span className="tiny muted">{sub}</span></div>
          </button>
        ))}
      </div>
      <div className="hstack" style={{ gap: 10, flexWrap: 'wrap' }}>
        <div className="input-icon" style={{ width: 280 }}><IconSearch size={16} /><input className="input" style={{ height: 36 }} placeholder="Search name, postcode or reference" value={q} onChange={e => setQ(e.target.value)} /></div>
        {view === 'board' ? <>
          <button className={`chip ${mineOnly ? 'on' : ''}`} onClick={() => setMineOnly(!mineOnly)}><IconUserCheck size={14} />Only my turn<span className="n">{yours.length}</span></button>
          <button className={`chip ${showLost ? 'on' : ''}`} onClick={() => setShowLost(!showLost)}>Show lost<span className="n">{count('lost')}</span></button>
        </> : (
          <div className="hstack" style={{ flexWrap: 'wrap', gap: 6 }}>
            {['All', 'Your turn', 'Not sales', ...PHASES.map(p => p.id)].map(s => <button key={s} className={`chip ${stage === s ? 'on' : ''}`} onClick={() => setStage(s)}>{PHASES.find(p => p.id === s)?.label || s}<span className="n">{count(s)}</span></button>)}
          </div>
        )}
      </div>
      {view === 'board' ? (
        <div className="kanban journey-board">
          {cols.map(p => {
            const cards = enquiries.filter(e => steps[e.id].phase === p.id && search(e) && (!mineOnly || needsOffice(steps[e.id])));
            const n = enquiries.filter(e => steps[e.id].phase === p.id && needsOffice(steps[e.id])).length;
            return (
              <div key={p.id} className="kcol">
                <div className="kcol-head">
                  <span className="bar" style={{ background: p.color }} />
                  <div className="between"><span className="hstack" style={{ gap: 8 }}><b style={{ fontSize: 13 }}>{p.label}</b><span className="tag grey">{cards.length}</span></span>{n > 0 && <Tag tone="warn">{n} your turn</Tag>}</div>
                </div>
                {cards.map(e => <JourneyCard key={e.id} e={e} st={steps[e.id]} mode="enquiry" onOpen={() => nav(`/enquiries/${e.id}`)} onAct={k => setAct({ id: e.id, k })} onRemind={() => remind(e)} />)}
                {cards.length === 0 && <div className="tiny muted" style={{ textAlign: 'center', padding: '18px 0', border: '1.5px dashed #d5dcd9', borderRadius: 10 }}>{mineOnly ? 'Nothing for you here' : 'Nothing here'}</div>}
              </div>
            );
          })}
        </div>
      ) : (
      <div className="card flush">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Customer</th><th>About</th><th>Source</th><th>Received</th><th>Salesperson</th><th>Where it is</th><th>Next step</th><th></th></tr></thead>
            <tbody>
              {rows.map(e => {
                const s = staffById(e.assigned);
                const stp = steps[e.id];
                return (
                  <tr key={e.id} className="click" onClick={() => nav(`/enquiries/${e.id}`)}>
                    <td><div className="hstack" style={{ gap: 10 }}><Avatar i={e.initials} size={34} /><div className="vstack" style={{ gap: 2 }}><b>{e.name}</b><span className="tiny muted">{e.id} · {e.postcode}</span></div>{e.hot && e.stage === 'New Enquiry' && <Tag tone="err">New</Tag>}</div></td>
                    <td><div className="hstack" style={{ gap: 8 }}><img src={IMG[e.photo]} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 3 }}><span>{e.product}</span>{e.type !== 'Sales' && <Tag tone={typeTone[e.type]}>{e.type}</Tag>}</div></div></td>
                    <td className="t2">{e.source}</td>
                    <td className="t2" style={{ whiteSpace: 'nowrap' }}>{e.received}</td>
                    <td>{s ? <span className="hstack" style={{ gap: 8, whiteSpace: 'nowrap' }}><Avatar i={s.initials} size={26} />{s.name}</span> : <span className="muted">—</span>}</td>
                    <td><Tag tone={stageTone[e.stage] || 'grey'}>{phaseLabel(stp.phase)}</Tag></td>
                    <td><div className="vstack" style={{ gap: 3 }}><span className="hstack" style={{ gap: 6 }}><Tag tone={roleTone[stp.role]}>{stp.role}</Tag>{stp.label}</span><span className="tiny" style={{ color: e.nextDue === 'Overdue' ? 'var(--err)' : 'var(--muted)', fontWeight: e.nextDue === 'Overdue' ? 600 : 400 }}>{stp.status}{e.nextDue && !['—', 'Done'].includes(e.nextDue) ? ` · ${e.nextDue}` : ''}</span></div></td>
                    <td onClick={ev => ev.stopPropagation()}>{needsOffice(stp) ? <button className="btn btn-primary btn-xs" onClick={() => setAct({ id: e.id, k: stp.key })}>{stp.icon}{stp.label}</button> : <IconChevronRight size={16} color="#6b7a78" />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="pager"><span>Showing {rows.length} of {enquiries.length} enquiries</span><span className="hstack"><button className="btn btn-outline btn-xs">Previous</button><button className="btn btn-outline btn-xs">Next</button></span></div>
      </div>
      )}
      {modal === 'new' && <NewEnquiryModal onClose={() => setModal(null)} />}
      {act && actE && <ActionModal k={act.k} e={actE} onClose={() => setAct(null)} />}
    </>
  );
}
