// My surveys and Inspections: every visit booked for me, with one button for what to do next.
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconSearch, IconClipboardCheck, IconTool, IconCalendar, IconCircleCheck, IconAlertTriangle, IconChevronRight, IconDoorOff, IconRuler, IconInfoCircle } from '@tabler/icons-react';
import { PageHead, Tag, Tile, Empty } from '../components/ui';
import { IMG } from '../data/mock';
import { TODAY, fmtDate } from '../data/store';
import { useMyVisits, isOpenVisit, statusTone, Visit, VisitKind, salespersonOf } from '../components/survey';

export function VisitList({ kind }: { kind: VisitKind }) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const all = useMyVisits().filter(v => v.kind === kind);
  const [q, setQ] = useState('');
  const [f, setF] = useState(params.get('show') || 'todo');
  useEffect(() => { setF(params.get('show') || 'todo'); }, [params]);
  const filters: [string, string, (v: Visit) => boolean][] = [
    ['todo', 'To do', isOpenVisit], ['today', 'Today', v => v.date === TODAY && v.status !== 'No access'], ['progress', 'Not finished', v => v.status === 'On site'],
    ['moved', 'Move asked', v => !!v.moveAsked && isOpenVisit(v)], ['done', 'Submitted', v => v.status === 'Submitted'], ['noaccess', 'Customer not in', v => v.status === 'No access'], ['all', 'All', () => true],
  ];
  const fn = (filters.find(x => x[0] === f) || filters[0])[2];
  const list = all.filter(v => fn(v) && (v.customer + v.address + (v.e?.jobId || '') + v.id).toLowerCase().includes(q.toLowerCase())).sort((a, b) => (f === 'done' || f === 'noaccess' ? (b.date + b.time).localeCompare(a.date + a.time) : (a.date + a.time).localeCompare(b.date + b.time)));
  const pick = (k: string) => { setF(k); setParams(k === 'todo' ? {} : { show: k }, { replace: true }); };
  const survey = kind === 'Final survey';
  const open = all.filter(isOpenVisit);
  return (
    <>
      <PageHead title={survey ? 'My surveys' : 'Inspections'} crumbs={[{ label: 'Today', to: '/' }, { label: survey ? 'My surveys' : 'Inspections' }]} />
      <div className="grid-4">
        {(survey
          ? [['To do', String(open.length), `${open.reduce((a, v) => a + v.items, 0)} frames to check`, IconClipboardCheck, '#0b6e5c'], ['Today', String(all.filter(v => v.date === TODAY && isOpenVisit(v)).length), fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'short' }), IconCalendar, '#0b6e5c'], ['Submitted', String(all.filter(v => v.status === 'Submitted').length), 'Sent to the office', IconCircleCheck, '#1f9d5b'], ['Sizes changed', String(all.filter(v => (v.changed || 0) > 0).length), 'Surveys where a size was different', IconRuler, '#e0a100']]
          : [['To do', String(open.length), 'Aftercare and snag visits', IconTool, '#0b6e5c'], ['Today', String(all.filter(v => v.date === TODAY && isOpenVisit(v)).length), fmtDate(TODAY, { weekday: 'long', day: 'numeric', month: 'short' }), IconCalendar, '#0b6e5c'], ['Submitted', String(all.filter(v => v.status === 'Submitted').length), 'Findings sent to the office', IconCircleCheck, '#1f9d5b'], ['Customer not in', String(all.filter(v => v.status === 'No access').length), 'Sent back to rebook', IconDoorOff, '#d64545']]
        ).map(([l, val, s, I, c]: any) => (
          <div key={l} className="card" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}><Tile icon={<I size={22} />} color={c} size={48} /><div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{val}</b><span className="tiny muted">{s}</span></div></div>
        ))}
      </div>
      {!survey && <div className="alert info small"><IconInfoCircle size={16} />The office sends you to look at a problem first, so the fitter goes back with the right part.</div>}
      <div className="card flush">
        <div className="toolbar" style={{ flexWrap: 'wrap' }}>
          <div className="input-icon" style={{ width: 300 }}><IconSearch size={16} /><input className="input" style={{ height: 36 }} placeholder="Search customer, address or job" value={q} onChange={e => setQ(e.target.value)} /></div>
          {filters.map(([k, l, t]) => <button key={k} className={`chip ${f === k ? 'on' : ''}`} onClick={() => pick(k)}>{l}<span className="n">{all.filter(t).length}</span></button>)}
        </div>
        <table className="tbl">
          <thead><tr><th>Customer</th><th>When</th><th>Address</th><th>{survey ? 'To check' : 'Problem'}</th>{survey && <th>Measured by</th>}<th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(v => (
              <tr key={v.id} className="click" onClick={() => nav(v.to)}>
                <td><div className="hstack" style={{ gap: 10 }}><img src={IMG[v.photo as keyof typeof IMG]} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover' }} /><div className="vstack" style={{ gap: 2 }}><b style={{ whiteSpace: 'nowrap' }}>{v.customer}</b><span className="tiny muted">{v.e?.jobId || v.e?.id || v.id}</span></div></div></td>
                <td style={{ whiteSpace: 'nowrap' }}><b style={{ color: v.date === TODAY ? 'var(--primary-dark)' : 'var(--text)' }}>{v.date === TODAY ? 'Today' : fmtDate(v.date)}</b><div className="tiny muted">{v.time}</div></td>
                <td className="t2">{v.address}</td>
                <td className="t2">{survey ? `${v.items} frame${v.items === 1 ? '' : 's'} · ${v.e?.product || ''}` : v.snag?.title || '—'}</td>
                {survey && <td className="t2" style={{ whiteSpace: 'nowrap' }}>{salespersonOf(v.e)}</td>}
                <td><div className="vstack" style={{ gap: 4, alignItems: 'flex-start' }}><Tag tone={statusTone[v.status]}>{v.status}</Tag>{v.status === 'Submitted' && v.kind === 'Final survey' && (v.changed ? <span className="tiny" style={{ color: '#8a6400' }}>{v.changed} size{v.changed > 1 ? 's' : ''} changed</span> : <span className="tiny muted">All sizes match</span>)}{v.moveAsked && isOpenVisit(v) && <span className="tiny" style={{ color: '#8a6400' }}>Move asked</span>}{v.status === 'No access' && <span className="tiny muted">{v.reason}</span>}</div></td>
                <td onClick={ev => ev.stopPropagation()}>{v.status === 'No access' ? <span className="tiny muted">Office rebooks</span> : <button className={`btn btn-xs ${v.status === 'Submitted' ? 'btn-grey' : v.date <= TODAY ? 'btn-primary' : 'btn-outline'}`} onClick={() => nav(v.to)}>{v.status === 'Submitted' ? 'View' : v.status === 'On site' ? 'Continue' : v.date <= TODAY ? 'Open and start' : 'Get ready'}<IconChevronRight size={13} /></button>}</td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={7}><Empty icon={survey ? <IconClipboardCheck size={22} /> : <IconTool size={22} />} title="Nothing here" sub="Try another filter." /></td></tr>}
          </tbody>
        </table>
      </div>
      {survey && all.some(v => v.moveAsked && isOpenVisit(v)) && <div className="alert warn small"><IconAlertTriangle size={16} />You asked the office to move a visit. It stays here until Sarah confirms the new time.</div>}
    </>
  );
}

export const Surveys = () => <VisitList kind="Final survey" />;
export const Inspections = () => <VisitList kind="Inspection" />;
