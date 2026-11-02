// My calendar: every visit the office has booked for me, and my time off. In step with Outlook.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconChevronLeft, IconChevronRight, IconBeach, IconBrandWindows, IconRefresh, IconClipboardCheck, IconTool, IconTrash, IconLayoutGrid, IconListDetails, IconMapPin, IconClock, IconCalendar } from '@tabler/icons-react';
import { PageHead, Card, Tag, Seg, useToast, Modal, Tile, Empty } from '../components/ui';
import { me } from '../data/mock';
import { useStore, TODAY, fmtDate, addDays, mondayOf, Appt } from '../data/store';
import { useMyVisits, statusTone, TimeOffModal, Visit } from '../components/survey';

export default function Calendar() {
  const nav = useNavigate();
  const toast = useToast();
  const { appts, set } = useStore();
  const visits = useMyVisits().filter(v => v.status !== 'No access');
  const [week, setWeek] = useState(mondayOf(TODAY));
  const [view, setView] = useState('week');
  const [off, setOff] = useState<string | null>(null);
  const [offOpen, setOffOpen] = useState<Appt | null>(null);
  const days = Array.from({ length: 6 }, (_, i) => addDays(week, i));
  const timeOff = appts.filter(a => a.who === me.id && a.kind === 'Time off');
  const inWeek = visits.filter(v => v.date >= week && v.date <= days[5]);
  const notSynced = appts.filter(a => a.who === me.id && !a.synced).length;
  const VisitCard = ({ v }: { v: Visit }) => (
    <button type="button" className="card" onClick={() => nav(v.to)} style={{ padding: 10, gap: 6, borderLeft: `3px solid ${v.kind === 'Final survey' ? '#0b6e5c' : '#e0a100'}`, textAlign: 'left', cursor: 'pointer', opacity: v.status === 'Submitted' ? 0.65 : 1 }}>
      <span className="hstack tiny b" style={{ gap: 5, color: v.kind === 'Final survey' ? '#0b6e5c' : '#8a6400' }}>{v.kind === 'Final survey' ? <IconClipboardCheck size={13} /> : <IconTool size={13} />}{v.time.split(' ')[0]} · {v.kind === 'Final survey' ? 'Survey' : 'Inspection'}</span>
      <b style={{ fontSize: 13 }}>{v.customer}</b>
      <span className="tiny muted">{v.address.split(', ').slice(-2, -1)[0] || v.address}</span>
      <Tag tone={statusTone[v.status]}>{v.status}</Tag>
    </button>
  );
  const agenda = [...visits.filter(v => v.date >= TODAY).map(v => ({ k: 'v' + v.id, date: v.date, time: v.time, v })), ...timeOff.filter(a => a.date >= TODAY).map(a => ({ k: a.id, date: a.date, time: a.time, a }))].sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time));
  return (
    <>
      <PageHead title="My calendar" crumbs={[{ label: 'Today', to: '/' }, { label: 'My calendar' }]} actions={<button className="btn btn-primary" onClick={() => setOff(TODAY)}><IconBeach size={16} />Add time off</button>} />
      <div className={`alert ${notSynced ? 'warn' : 'ok'} small`}><IconBrandWindows size={16} />{notSynced ? `${notSynced} visit is waiting to sync with your Outlook.` : 'Your visits are in your Outlook calendar and on your phone.'}<button className="link ml-auto" onClick={() => { set('appts', as => as.map(a => (a.who === me.id ? { ...a, synced: true } : a))); toast('Synced with Outlook'); }}><IconRefresh size={14} />Sync now</button></div>
      <div className="grid-4">
        {([['Visits this week', String(inWeek.length), IconCalendar], ['Final surveys', String(inWeek.filter(v => v.kind === 'Final survey').length), IconClipboardCheck], ['Inspections', String(inWeek.filter(v => v.kind === 'Inspection').length), IconTool], ['Time off this week', String(timeOff.filter(a => a.date >= week && a.date <= days[5]).length), IconBeach]] as [string, string, any][]).map(([l, val, I]) => (
          <div key={l} className="card" style={{ flexDirection: 'row', gap: 14, alignItems: 'center', padding: 16 }}><Tile icon={<I size={22} />} color="#0b6e5c" size={48} /><div className="vstack" style={{ gap: 2 }}><span className="small t2">{l}</span><b style={{ fontSize: 22 }}>{val}</b></div></div>
        ))}
      </div>
      <Card>
        <div className="between" style={{ flexWrap: 'wrap', gap: 10 }}>
          {view === 'week' ? (
            <div className="hstack" style={{ gap: 8 }}>
              <button className="icon-btn" onClick={() => setWeek(addDays(week, -7))} aria-label="Previous week"><IconChevronLeft size={16} /></button>
              <b style={{ fontSize: 16, minWidth: 220, textAlign: 'center' }}>{fmtDate(week, { day: 'numeric', month: 'short' })} – {fmtDate(days[5], { day: 'numeric', month: 'long', year: 'numeric' })}</b>
              <button className="icon-btn" onClick={() => setWeek(addDays(week, 7))} aria-label="Next week"><IconChevronRight size={16} /></button>
              <button className="btn btn-outline btn-xs" onClick={() => setWeek(mondayOf(TODAY))}>This week</button>
            </div>
          ) : <b style={{ fontSize: 16 }}>Coming up</b>}
          <Seg value={view} onChange={setView} items={[{ id: 'week', label: 'Week', icon: <IconLayoutGrid size={15} /> }, { id: 'list', label: 'List', icon: <IconListDetails size={15} /> }]} />
        </div>
        {view === 'week' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 10 }}>
            {days.map(d => (
              <div key={d} className="vstack" style={{ gap: 8, minHeight: 320, padding: 8, borderRadius: 10, background: d === TODAY ? 'var(--tint)' : 'var(--bg)', outline: d === TODAY ? '2px solid var(--primary)' : 'none' }}>
                <div className="between"><b className="small" style={{ color: d === TODAY ? 'var(--primary-dark)' : 'var(--text-2)' }}>{fmtDate(d, { weekday: 'short', day: 'numeric' })}</b>{d === TODAY && <Tag tone="jade">Today</Tag>}</div>
                {visits.filter(v => v.date === d).map(v => <VisitCard key={v.id} v={v} />)}
                {timeOff.filter(a => a.date === d).map(a => <button key={a.id} type="button" className="card" onClick={() => setOffOpen(a)} style={{ padding: 10, gap: 4, textAlign: 'left', background: 'repeating-linear-gradient(135deg, #f1f3f2, #f1f3f2 6px, #e9edec 6px, #e9edec 12px)', borderLeft: '3px solid #9aa7a4', cursor: 'pointer' }}><span className="hstack tiny b" style={{ gap: 5, color: 'var(--text-2)' }}><IconBeach size={13} />Time off · {a.note}</span><b style={{ fontSize: 13 }}>{a.customer}</b><span className="tiny muted">{a.time}</span></button>)}
                {d >= TODAY && <button type="button" className="tiny muted" style={{ border: '1.5px dashed #d5dcd9', borderRadius: 8, background: 'none', padding: '8px 4px', marginTop: 'auto' }} onClick={() => setOff(d)}>+ Time off</button>}
              </div>
            ))}
          </div>
        ) : (
          <div className="vstack" style={{ gap: 8 }}>
            {agenda.length === 0 && <Empty icon={<IconCalendar size={22} />} title="Nothing booked" sub="The office books your visits." />}
            {Array.from(new Set(agenda.map(x => x.date))).map(d => (
              <div key={d} className="vstack" style={{ gap: 8 }}>
                <b className="small" style={{ color: d === TODAY ? 'var(--primary-dark)' : 'var(--text-2)' }}>{d === TODAY ? 'Today' : d === addDays(TODAY, 1) ? 'Tomorrow' : fmtDate(d, { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                {agenda.filter(x => x.date === d).map(x => 'v' in x && x.v ? (
                  <div key={x.k} className="card click" onClick={() => nav(x.v!.to)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, cursor: 'pointer', borderLeft: `3px solid ${x.v.kind === 'Final survey' ? '#0b6e5c' : '#e0a100'}` }}>
                    <Tile icon={x.v.kind === 'Final survey' ? <IconClipboardCheck size={18} /> : <IconTool size={18} />} color={x.v.kind === 'Final survey' ? '#0b6e5c' : '#e0a100'} size={38} />
                    <div className="vstack" style={{ gap: 3, flex: 1 }}><b style={{ fontSize: 13.5 }}>{x.v.kind} · {x.v.customer}</b><span className="small t2 hstack" style={{ gap: 12 }}><span className="hstack" style={{ gap: 4 }}><IconClock size={13} />{x.v.time}</span><span className="hstack" style={{ gap: 4 }}><IconMapPin size={13} />{x.v.address}</span></span></div>
                    <Tag tone={statusTone[x.v.status]}>{x.v.status}</Tag>
                  </div>
                ) : (
                  <div key={x.k} className="card click" onClick={() => setOffOpen((x as any).a)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, cursor: 'pointer', borderLeft: '3px solid #9aa7a4' }}>
                    <Tile icon={<IconBeach size={18} />} color="#6b7a78" size={38} />
                    <div className="vstack" style={{ gap: 3, flex: 1 }}><b style={{ fontSize: 13.5 }}>Time off · {(x as any).a.customer}</b><span className="small t2">{x.time} · {(x as any).a.note}</span></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <div className="hstack small t2" style={{ gap: 14 }}><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#0b6e5c' }} />Final survey</span><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#e0a100' }} />Inspection</span><span className="hstack" style={{ gap: 6 }}><i className="dot" style={{ background: '#9aa7a4' }} />Time off</span><span className="muted">The office books your visits. Click one to open it.</span></div>
      </Card>
      {off && <TimeOffModal day={off} onClose={() => setOff(null)} />}
      {offOpen && (
        <Modal title={`Time off · ${offOpen.customer}`} sub={`${fmtDate(offOpen.date, { weekday: 'long', day: 'numeric', month: 'long' })} · ${offOpen.time}`} onClose={() => setOffOpen(null)} width={460}
          footer={<><button className="btn btn-outline" style={{ marginRight: 'auto', color: 'var(--err)' }} onClick={() => { set('appts', as => as.filter(a => a.id !== offOpen.id)); toast('Time off removed · the office can book you then'); setOffOpen(null); }}><IconTrash size={16} />Remove</button><button className="btn btn-primary" onClick={() => setOffOpen(null)}>Done</button></>}>
          <span className="small t2">The office cannot book visits for you during this time.</span>
        </Modal>
      )}
    </>
  );
}
