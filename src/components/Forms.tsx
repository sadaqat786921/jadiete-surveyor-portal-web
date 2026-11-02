import React, { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconCircleCheck, IconInfoCircle, IconRefresh, IconCalendarOff, IconEraser, IconBriefcase, IconShieldCheck, IconUserCheck } from '@tabler/icons-react';
import { Modal, Field, useToast, Check, Tag, Avatar } from './ui';
import { salespeople, surveyors, teams, IMG, staff, staffById, teamById } from '../data/mock';
import { useStore, TODAY, addDays, fmtDate, DiaryEvent } from '../data/store';

const initialsOf = (n: string) => n.replace(/^(Mr|Mrs|Ms|Dr|Miss)\.?\s+/i, '').split(/\s|&/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase() || 'NC';

/* ------------------------------------------------------------------ */
/* Step 4–8: a new enquiry arrives → route → customer → salesperson     */
/* ------------------------------------------------------------------ */
export function NewEnquiryModal({ onClose, preset }: { onClose: () => void; preset?: { name: string; phone: string; email: string; address: string; postcode: string } }) {
  const toast = useToast();
  const { set, enquiries, jobs, log } = useStore();
  const [type, setType] = useState<'Sales' | 'Existing job' | 'Aftercare'>('Sales');
  const [product, setProduct] = useState<string[]>(['Windows']);
  const [name, setName] = useState(preset?.name || '');
  const [postcode, setPostcode] = useState(preset?.postcode || '');
  const [phone, setPhone] = useState(preset?.phone || '');
  const [email, setEmail] = useState(preset?.email || '');
  const [address, setAddress] = useState(preset?.address || '');
  const [source, setSource] = useState('Website');
  const [sales, setSales] = useState('');
  const [follow, setFollow] = useState(addDays(TODAY, 1));
  const [job, setJob] = useState(jobs[0].id);
  const [linked, setLinked] = useState(!!preset?.name);
  const dup = postcode.trim().length >= 3 ? enquiries.find(e => e.postcode.replace(/\s/g, '').toUpperCase().startsWith(postcode.replace(/\s/g, '').toUpperCase())) : undefined;
  const toggle = (p: string) => setProduct(ps => (ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]));
  const save = () => {
    if (type !== 'Sales') {
      const j = jobs.find(x => x.id === job)!;
      const rec = enquiries.find(x => x.jobId === j.id);
      const msg = `${type === 'Aftercare' ? 'Aftercare request' : 'Customer question'} logged by the office`;
      if (type === 'Aftercare') set('snags', ss => [{ id: 'SN-' + (130 + ss.length), job: j.id, kind: 'Aftercare', title: 'Customer reported problem', detail: 'Logged by the office from a phone call or email.', customer: rec?.name || j.customer, severity: 'Medium', status: 'Open', tone: 'err', owner: 'Aftercare team', reported: 'Office · ' + fmtDate(TODAY), photo: rec?.photo || j.photo } as any, ...ss]);
      if (rec) set('enquiries', es => es.map(x => (x.id === rec.id ? { ...x, comms: [{ id: 'c' + Date.now(), kind: 'note', title: msg, when: fmtDate(TODAY) + ', ' + new Date().toTimeString().slice(0, 5), who: 'Sarah Mitchell' }, ...(x.comms || [])] } : x)));
      log(j.id, `${msg} and sent to ${type === 'Aftercare' ? 'aftercare' : j.owner}`);
      toast(`Sent to ${type === 'Aftercare' ? 'aftercare' : 'the job owner'} · saved on ${j.id}`);
      return onClose();
    }
    if (!name.trim()) return toast('Please add the customer’s name');
    const id = 'EN-' + (2300 + enquiries.length);
    set('enquiries', es => [{ id, name: name.trim(), initials: initialsOf(name), phone: phone || '—', email: email || '—', address: address || '—', postcode: postcode.toUpperCase() || '—', product: product.join(', ') || 'Not known', source, received: 'Just now', daysAgo: 0, assigned: sales || undefined, stage: 'New Enquiry', value: 0, next: sales ? 'First call' : 'Assign to sales', nextDue: sales ? fmtDate(follow) : 'Today', photo: 'house', type: 'Sales', stageDays: 0, followUp: sales ? follow : undefined, hot: true }, ...es]);
    toast(sales ? `Enquiry added and assigned to ${staffById(sales)?.name} · follow-up ${fmtDate(follow)}` : 'Enquiry added · waiting to be assigned');
    onClose();
  };
  return (
    <Modal title="New enquiry" sub="Every customer query starts here. Tell us what it is about first." onClose={onClose} width={740}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>{type === 'Sales' ? 'Save enquiry' : `Send to ${type === 'Aftercare' ? 'aftercare' : 'job owner'}`}</button></>}>
      <Field label="What is this about?">
        <div className="grid-3" style={{ gap: 10 }}>
          {([['Sales', 'A new sales enquiry', 'Windows, doors or a new project'], ['Existing job', 'A question about a current job', 'Goes to the person who owns the job'], ['Aftercare', 'A problem after fitting', 'Goes to aftercare']] as const).map(([k, t, s]) => (
            <button key={k} onClick={() => setType(k)} className="card" style={{ padding: 12, gap: 4, textAlign: 'left', borderColor: type === k ? 'var(--primary)' : undefined, background: type === k ? 'var(--tint-2)' : '#fff', boxShadow: type === k ? '0 0 0 3px rgba(0,199,161,.15)' : 'none' }}>
              <b style={{ fontSize: 13 }}>{t}</b><span className="tiny muted">{s}</span>
            </button>
          ))}
        </div>
      </Field>
      {type !== 'Sales' ? (
        <>
          <Field label="Which job is it about?">
            <select className="select" value={job} onChange={e => setJob(e.target.value)}>{jobs.map(j => <option key={j.id} value={j.id}>{j.id} · {j.customer} · {j.address}</option>)}</select>
          </Field>
          <Field label="What did the customer say?"><textarea className="textarea" placeholder="e.g. One of the new windows lets in a draught at the top" /></Field>
          <div className="alert info small"><IconInfoCircle size={16} />It will be saved on the job and sent to {type === 'Aftercare' ? 'aftercare' : `the job owner (${jobs.find(j => j.id === job)?.owner})`}. It never goes to Sales.</div>
        </>
      ) : (
        <>
          <div className="grid-2">
            <Field label="Customer name"><input className="input" placeholder="e.g. Mr & Mrs Patel" value={name} onChange={e => setName(e.target.value)} /></Field>
            <Field label="Phone"><input className="input" placeholder="07700 900 000" value={phone} onChange={e => setPhone(e.target.value)} /></Field>
            <Field label="Email"><input className="input" placeholder="name@email.co.uk" value={email} onChange={e => setEmail(e.target.value)} /></Field>
            <Field label="Postcode" hint="We look for an existing customer as you type."><input className="input" placeholder="LS6 2AB" value={postcode} onChange={e => { setPostcode(e.target.value); setLinked(false); }} /></Field>
          </div>
          <Field label="Property address"><input className="input" placeholder="House number and street, town" value={address} onChange={e => setAddress(e.target.value)} /></Field>
          {dup && !linked && (
            <div className="alert warn"><IconAlertTriangle size={18} /><div style={{ flex: 1 }}><b>This may be an existing customer:</b> {dup.name}, {dup.address} {dup.postcode}.</div><button className="btn btn-dark btn-xs" onClick={() => { setLinked(true); setName(dup.name); setPhone(dup.phone); setEmail(dup.email); setAddress(dup.address); }}>Use this customer</button></div>
          )}
          {linked && <div className="alert ok small"><IconCircleCheck size={16} />Linked to the existing customer — no duplicate record will be made. One customer can have many projects.</div>}
          <Field label="Interested in">
            <div className="hstack" style={{ flexWrap: 'wrap' }}>{['Windows', 'Doors', 'Bi-folds', 'Conservatory', 'Roof lantern', 'Repairs'].map(p => <button key={p} className={`chip ${product.includes(p) ? 'on' : ''}`} onClick={() => toggle(p)}>{p}</button>)}</div>
          </Field>
          <div className="grid-3">
            <Field label="Where did they hear about us?"><select className="select" value={source} onChange={e => setSource(e.target.value)}><option>Website</option><option>Phone call</option><option>Referral</option><option>Showroom</option><option>Email</option></select></Field>
            <Field label="Salesperson"><select className="select" value={sales} onChange={e => setSales(e.target.value)}><option value="">Assign later</option>{salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
            <Field label="First follow-up"><input type="date" className="input" value={follow} disabled={!sales} onChange={e => setFollow(e.target.value)} style={{ background: sales ? '#fff' : 'var(--bg)' }} /></Field>
          </div>
          <Field label="Notes"><textarea className="textarea" placeholder="What did the customer say? e.g. wants grey frames, 1930s semi" /></Field>
        </>
      )}
    </Modal>
  );
}

/* Step 8: choose the salesperson and set the first follow-up date */
export function AssignModal({ enquiryId, onClose }: { enquiryId: string; onClose: () => void }) {
  const toast = useToast();
  const { enquiries, set } = useStore();
  const e = enquiries.find(x => x.id === enquiryId)!;
  const [pick, setPick] = useState(e.assigned || 'mh');
  const [follow, setFollow] = useState(addDays(TODAY, 1));
  const [nextAct, setNextAct] = useState(e.stage === 'New Enquiry' ? 'Call the customer' : e.next);
  const { updEnq } = useStore();
  const load: Record<string, string> = { mh: '4 open enquiries · works Leeds and Harrogate', ec: '6 open enquiries · works Ripon and Otley', jb: '3 open enquiries · on a visit until 2pm' };
  return (
    <Modal title={e.assigned ? 'Move to another salesperson' : 'Assign to a salesperson'} sub={`${e.name} · ${e.product} · ${e.postcode}`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { updEnq(e.id, { assigned: pick, followUp: follow, next: nextAct, nextDue: fmtDate(follow) }, { kind: 'system', title: `${e.assigned ? 'Moved' : 'Assigned'} to ${staffById(pick)?.name}`, body: `Next action: ${nextAct} by ${fmtDate(follow)}.`, who: 'Sarah Mitchell' }); toast(`${staffById(pick)?.name} has it · follow-up ${fmtDate(follow)} · they’ll see it on their phone`); onClose(); }}>Assign</button></>}>
      <div className="vstack" style={{ gap: 10 }}>
        {salespeople.map(s => (
          <button key={s.id} onClick={() => setPick(s.id)} className="card" style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderColor: pick === s.id ? 'var(--primary)' : undefined, background: pick === s.id ? 'var(--tint-2)' : '#fff', textAlign: 'left' }}>
            <Avatar i={s.initials} size={40} />
            <div className="vstack" style={{ gap: 2, flex: 1 }}><b>{s.name}</b><span className="small muted">{load[s.id]}</span></div>
            {pick === s.id && <IconCircleCheck color="#00c7a1" />}
          </button>
        ))}
      </div>
      <div className="grid-2">
        <Field label="Next action"><select className="select" value={nextAct} onChange={x => setNextAct(x.target.value)}>{Array.from(new Set([nextAct, 'Call the customer', 'Email the customer', 'Send a brochure', 'Book appointment'])).map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field label="Due date" hint="They get a reminder. You see it if it is missed."><input type="date" className="input" value={follow} onChange={x => setFollow(x.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* Step 14: book a survey */
export function BookSurveyModal({ onClose, jobId }: { onClose: () => void; jobId?: string }) {
  const toast = useToast();
  const { jobs, set, log } = useStore();
  const [job, setJob] = useState(jobId || 'JG-10490');
  const [who, setWho] = useState('ps');
  const [date, setDate] = useState(addDays(TODAY, 4));
  const [time, setTime] = useState('10:00 – 12:00');
  const j = jobs.find(x => x.id === job)!;
  const busy = who === 'ps' && date === '2026-10-19' && time === '10:00 – 12:00';
  return (
    <Modal title="Book a survey" sub="The surveyor gets it on their phone and in their calendar. The customer is told the date." onClose={onClose} width={640}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy} style={{ opacity: busy ? 0.5 : 1 }} onClick={() => {
        set('surveys', ss => [{ id: 'SV-' + (312 + ss.length), job: j.id, customer: j.customer, address: j.address, date: fmtDate(date), time, surveyor: who, status: 'Booked', tone: 'info', photo: j.photo }, ...ss]);
        set('appts', as => [{ id: 'ap' + Date.now(), kind: 'Survey', customer: j.customer, who, date, time, job: j.id, address: j.address, synced: true, status: 'Booked' }, ...as]);
        log(j.id, `Survey booked with ${staffById(who)?.name} for ${fmtDate(date)}, ${time}`);
        toast(`Survey booked · ${staffById(who)?.name} · ${fmtDate(date)} · customer told`); onClose();
      }}>Book survey</button></>}>
      <Field label="Job"><select className="select" value={job} onChange={e => setJob(e.target.value)}>{jobs.map(x => <option key={x.id} value={x.id}>{x.id} · {x.customer}</option>)}</select></Field>
      <div className="grid-2">
        <Field label="Surveyor"><select className="select" value={who} onChange={e => setWho(e.target.value)}>{surveyors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Address"><input className="input" value={j.address + ', ' + j.postcode} readOnly style={{ background: 'var(--bg)' }} /></Field>
        <Field label="Date"><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Time"><select className="select" value={time} onChange={e => setTime(e.target.value)}><option>08:00 – 10:00</option><option>10:00 – 12:00</option><option>13:00 – 15:00</option><option>15:00 – 17:00</option></select></Field>
      </div>
      {busy ? <div className="alert err"><IconAlertTriangle size={18} />Priya already has a survey at The Lees that morning. Pick another time or surveyor.</div> : <div className="alert ok small"><IconCircleCheck size={16} />{staffById(who)?.name} is free then. It will appear in their Outlook calendar too.</div>}
    </Modal>
  );
}

/* Step 17a: delivery problem keeps the job blocked */
export function DeliveryProblemModal({ onClose, deliveryRef }: { onClose: () => void; deliveryRef: string }) {
  const toast = useToast();
  const { deliveries, set, updateJob } = useStore();
  const d = deliveries.find(x => x.ref === deliveryRef)!;
  const [kind, setKind] = useState('Damaged');
  const [note, setNote] = useState('');
  return (
    <Modal title="Report a delivery problem" sub={`${d.customer} · ${d.ref} · ${d.items}`} onClose={onClose} width={600}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-danger" onClick={() => {
        set('deliveries', ds => ds.map(x => (x.ref === d.ref ? { ...x, status: `Problem: ${kind.toLowerCase()}`, tone: 'err', problem: kind } : x)));
        updateJob(d.job, { blocked: `Delivery ${kind.toLowerCase()}`, next: 'Sort out the delivery problem with the supplier', due: 'Today' }, `Delivery problem logged: ${kind}${note ? ' — ' + note : ''}. Job blocked until it is solved.`);
        toast('Problem logged · the job is blocked until it is solved'); onClose();
      }}>Log problem and block the job</button></>}>
      <Field label="What is wrong?">
        <div className="hstack" style={{ gap: 8 }}>{['Damaged', 'Missing items', 'Wrong items', 'Part delivery'].map(k => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}</div>
      </Field>
      <Field label="Details"><textarea className="textarea" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. 2 frames cracked, glass chipped on the bedroom window" /></Field>
      <Field label="Proof" hint="Photos or the delivery note"><button className="btn btn-outline">Add photos</button></Field>
      <div className="alert warn small"><IconAlertTriangle size={16} />The job can’t be booked in the diary until this problem is closed.</div>
    </Modal>
  );
}

/* Steps 18–21: book, change or cancel an installation — see Booking.tsx */
export { BookInstallModal } from './Booking';

/* Step 24: job sign-off with the customer's signature */
export function SignOffModal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const toast = useToast();
  const { jobs, snags, updateJob } = useStore();
  const j = jobs.find(x => x.id === jobId)!;
  const open = snags.filter(s => s.job === j.id && s.status !== 'Fixed');
  const [refused, setRefused] = useState(false);
  const [why, setWhy] = useState('');
  const [signed, setSigned] = useState(false);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return; const ctx = c.getContext('2d')!; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.strokeStyle = '#0b1f1b';
    let down = false;
    const pos = (e: PointerEvent) => { const r = c.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const d = (e: PointerEvent) => { down = true; const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); };
    const m = (e: PointerEvent) => { if (!down) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); setSigned(true); };
    const u = () => { down = false; };
    c.addEventListener('pointerdown', d); c.addEventListener('pointermove', m); window.addEventListener('pointerup', u);
    return () => { c.removeEventListener('pointerdown', d); c.removeEventListener('pointermove', m); window.removeEventListener('pointerup', u); };
  }, [refused, open.length]);
  const clear = () => { const c = cv.current; c?.getContext('2d')?.clearRect(0, 0, c.width, c.height); setSigned(false); };
  if (open.length) return (
    <Modal title="Sign off this job" sub={`${j.id} · ${j.customer}`} onClose={onClose} width={560} footer={<button className="btn btn-primary" onClick={onClose}>OK</button>}>
      <div className="alert err"><IconAlertTriangle size={18} /><div><b>Not yet — {open.length} snag{open.length > 1 ? 's are' : ' is'} still open.</b> A job with an open snag stays marked “Snag”. Fix and close the snags first, then sign off.</div></div>
      {open.map(s => <div key={s.id} className="hstack small" style={{ gap: 8 }}><Tag tone={s.tone}>{s.status}</Tag>{s.title}</div>)}
    </Modal>
  );
  return (
    <Modal title="Sign off this job" sub={`${j.id} · ${j.customer} · all snags closed`} onClose={onClose} width={620}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={!refused && !signed} style={{ opacity: refused || signed ? 1 : 0.45 }} onClick={() => {
        updateJob(j.id, { stage: 'Complete', blocked: undefined, next: 'Send guarantee pack', due: fmtDate(addDays(TODAY, 1)), signedOff: { by: j.customer, when: fmtDate(TODAY), refused: refused ? why : undefined } }, refused ? `Customer did not sign — ${why || 'no reason given'}. Marked complete by the office.` : 'Job signed off by the customer. Marked complete.');
        toast('Job completed · guarantee pack is next'); onClose();
      }}><IconShieldCheck size={16} />Mark job complete</button></>}>
      {!refused ? (
        <>
          <span className="small t2">Ask the customer to sign below to confirm they are happy with the work.</span>
          <div style={{ border: '1.5px dashed var(--border-input)', borderRadius: 10, position: 'relative', background: '#fbfcfc' }}>
            <canvas ref={cv} width={570} height={170} style={{ display: 'block', touchAction: 'none', cursor: 'crosshair' }} />
            {!signed && <span className="muted small" style={{ position: 'absolute', left: 16, bottom: 12, pointerEvents: 'none' }}>Sign here</span>}
          </div>
          <div className="between"><button className="link" onClick={clear}><IconEraser size={14} />Clear</button><button className="link" style={{ color: 'var(--err)' }} onClick={() => setRefused(true)}>The customer won’t sign</button></div>
        </>
      ) : (
        <>
          <div className="alert warn"><IconAlertTriangle size={18} />What happens when a customer refuses to sign is still to be agreed with Jadeite. For now, write down why — it is saved in History.</div>
          <Field label="Why didn’t the customer sign?"><textarea className="textarea" value={why} onChange={e => setWhy(e.target.value)} placeholder="e.g. Wants to see the window in daylight first" /></Field>
          <button className="link" onClick={() => setRefused(false)}>Back to signature</button>
        </>
      )}
    </Modal>
  );
}

/* Step 29: a task with an owner and due date */
export function AddTaskModal({ onClose, jobId }: { onClose: () => void; jobId?: string }) {
  const toast = useToast();
  const { set, jobs } = useStore();
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('sm');
  const [due, setDue] = useState(TODAY);
  const [job, setJob] = useState(jobId || '');
  return (
    <Modal title="Add a task" sub="Every task has an owner and a due date, so nothing is forgotten." onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { if (!title.trim()) return toast('Please write what needs doing'); set('tasks', ts => [{ id: 'tk' + Date.now(), title: title.trim(), owner, due, job: job || undefined, done: false }, ...ts]); toast(`Task added for ${staffById(owner)?.name}`); onClose(); }}>Add task</button></>}>
      <Field label="What needs doing?"><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call Mrs Patel about the snag visit" autoFocus /></Field>
      <div className="grid-2">
        <Field label="Who will do it?"><select className="select" value={owner} onChange={e => setOwner(e.target.value)}>{staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Due date"><input type="date" className="input" value={due} onChange={e => setDue(e.target.value)} /></Field>
      </div>
      <Field label="Job (optional)"><select className="select" value={job} onChange={e => setJob(e.target.value)}><option value="">Not linked to a job</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.id} · {j.customer}</option>)}</select></Field>
    </Modal>
  );
}

/* Step 11: sales visit, survey or follow-up appointment */
export function AddApptModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const { set, enquiries } = useStore();
  const [kind, setKind] = useState<'Sales visit' | 'Follow-up call'>('Sales visit');
  const [cust, setCust] = useState(enquiries[0].name);
  const [who, setWho] = useState('mh');
  const [date, setDate] = useState(addDays(TODAY, 2));
  const [time, setTime] = useState('10:00 – 11:00');
  return (
    <Modal title="New appointment" sub="It goes into the person’s Outlook calendar and phone app." onClose={onClose} width={600}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { set('appts', as => [{ id: 'ap' + Date.now(), kind, customer: cust, who, date, time, synced: true, status: 'Booked' }, ...as]); toast(`${kind} booked for ${fmtDate(date)} · added to Outlook`); onClose(); }}>Book appointment</button></>}>
      <Field label="Type"><div className="hstack" style={{ gap: 8 }}>{(['Sales visit', 'Follow-up call'] as const).map(k => <button key={k} className={`chip ${kind === k ? 'on' : ''}`} onClick={() => setKind(k)}>{k}</button>)}<span className="small muted">Surveys are booked from the Surveys page.</span></div></Field>
      <div className="grid-2">
        <Field label="Customer"><select className="select" value={cust} onChange={e => setCust(e.target.value)}>{enquiries.map(e => <option key={e.id}>{e.name}</option>)}</select></Field>
        <Field label="With"><select className="select" value={who} onChange={e => setWho(e.target.value)}>{salespeople.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Date"><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <Field label="Time"><input className="input" value={time} onChange={e => setTime(e.target.value)} /></Field>
      </div>
    </Modal>
  );
}

/* Step 27: link an unmatched email to a job by hand */
export function LinkEmailModal({ emailId, onClose }: { emailId: string; onClose: () => void }) {
  const toast = useToast();
  const { emails, jobs, set, log } = useStore();
  const em = emails.find(e => e.id === emailId)!;
  const [job, setJob] = useState(jobs[0].id);
  return (
    <Modal title="Link email to a job" sub={`From ${em.from} · “${em.subject}”`} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { set('emails', es => es.map(e => (e.id === em.id ? { ...e, linked: job } : e))); log(job, `Email “${em.subject}” from ${em.from} linked to this job by hand`); toast(`Linked to ${job}`); onClose(); }}>Link to job</button></>}>
      <div className="card" style={{ padding: 12, background: 'var(--bg)' }}><span className="small t2">{em.preview}</span></div>
      <Field label="Which job is this about?"><select className="select" value={job} onChange={e => setJob(e.target.value)}>{jobs.map(j => <option key={j.id} value={j.id}>{j.id} · {j.customer} · {j.email}</option>)}</select></Field>
      <div className="alert info small"><IconInfoCircle size={16} />Linking an email never shows it to the customer. It only adds it to the job timeline for staff.</div>
    </Modal>
  );
}

export function LogCallModal({ onClose, who }: { onClose: () => void; who?: string }) {
  const toast = useToast();
  return (
    <Modal title="Log a phone call" sub={who ? `With ${who} · saved to the customer record and job history` : 'Saved to the customer record and job history'} onClose={onClose} width={560}
      footer={<><button className="btn btn-grey" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { toast('Call logged'); onClose(); }}>Save call</button></>}>
      <div className="grid-2">
        <Field label="Direction"><select className="select"><option>Customer called us</option><option>We called the customer</option></select></Field>
        <Field label="Outcome"><select className="select"><option>Spoke to customer</option><option>Left a voicemail</option><option>No answer</option></select></Field>
      </div>
      <Field label="What was said"><textarea className="textarea" placeholder="Short summary of the call" /></Field>
      <Field label="Next step (optional)"><input className="input" placeholder="e.g. Call back Monday morning" /></Field>
    </Modal>
  );
}
