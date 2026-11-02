// Who is on a booking, and who is free. Installers are booked one by one, so every
// diary booking keeps a list of installer ids ("crew"). Older bookings that only
// had a team id are read as that team's two people.
import { installers as roster0, Installer } from './mock';
import type { DiaryEvent } from './store';

let roster: Installer[] = roster0;
/** The store keeps the live list (new installers can be added in Settings). */
export const setRoster = (list: Installer[]) => { roster = list; };
export const getRoster = () => roster;

const TEAM_CREW: Record<string, string[]> = { t1: ['dh', 'lb'], t2: ['ak', 'jp'], t3: ['tw', 'bc'] };

const addDays = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const lastDay = (ev: { date: string; days: number }) => addDays(ev.date, ev.days - 1);
export const overlaps = (s1: string, d1: number, s2: string, d2: number) => s1 <= addDays(s2, d2 - 1) && s2 <= addDays(s1, d1 - 1);
export const onDay = (ev: { date: string; days: number }, day: string) => ev.date <= day && lastDay(ev) >= day;

export const personById = (id?: string) => roster.find(p => p.id === id);
export const crewOf = (ev?: Partial<Pick<DiaryEvent, 'crew' | 'team'>>): string[] => (!ev ? [] : ev.crew && ev.crew.length ? ev.crew : TEAM_CREW[ev.team || ''] || []);
export const crewPeople = (ev?: Partial<DiaryEvent>) => crewOf(ev).map(personById).filter(Boolean) as Installer[];
export const joinNames = (n: string[]) => (n.length <= 1 ? n[0] || '' : `${n.slice(0, -1).join(', ')} & ${n[n.length - 1]}`);
const first = (n: string) => n.split(' ')[0];

/** A small "team-like" view of a booking so pages can show who is going. */
export function crewTeam(ev?: Partial<DiaryEvent>) {
  if (!ev) return undefined;
  const p = crewPeople(ev);
  return { name: joinNames(p.map(x => first(x.name))) || 'Installers', members: joinNames(p.map(x => x.name)) || 'No installer yet', initials: p[0]?.initials || '?', ids: p.map(x => x.id), people: p };
}

/** What (if anything) keeps an installer busy on these days. Leave counts as busy. */
export function busyWith(id: string, date: string, days: number, events: DiaryEvent[], ignoreId?: string) {
  return events.find(e => e.id !== ignoreId && e.team !== 'un' && crewOf(e).includes(id) && overlaps(date, days, e.date, e.days));
}

/** Installers not booked and not on leave for the whole of these days. */
export const freeOn = (date: string, days: number, events: DiaryEvent[], ignoreId?: string) => roster.filter(p => p.active !== false && !busyWith(p.id, date, days, events, ignoreId));

export const isSunday = (iso: string) => new Date(iso + 'T12:00:00').getDay() === 0;
