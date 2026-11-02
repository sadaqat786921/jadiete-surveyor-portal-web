// Sample data for the Jadeite Systems Surveyor portal prototype.
// All names, numbers and addresses are invented for demonstration.

export const IMG = {
  house: 'images/house.jpg',
  door: 'images/door.jpg',
  bifold: 'images/bifold.jpg',
  orangery: 'images/orangery.jpg',
  window: 'images/window.jpg',
  roof: 'images/roof.jpg',
};

// The Surveyor portal is used by one surveyor at a time. The demo signs in as Priya Shah.
export const me = { id: 'ps', name: 'Priya Shah', first: 'Priya', initials: 'PS', role: 'Surveyor', email: 'priya.shah@jadeiteglazing.co.uk', phone: '07700 900 104', area: 'Leeds, Harrogate and Leicester', target: 0 };

export type Staff = { id: string; name: string; initials: string; role: string; phone?: string };
export const staff: Staff[] = [
  { id: 'mh', name: 'Mike Harris', initials: 'MH', role: 'Salesperson', phone: '07700 900 101' },
  { id: 'ec', name: 'Emma Clarke', initials: 'EC', role: 'Salesperson', phone: '07700 900 102' },
  { id: 'jb', name: 'James Brook', initials: 'JB', role: 'Salesperson', phone: '07700 900 103' },
  { id: 'ps', name: 'Priya Shah', initials: 'PS', role: 'Surveyor', phone: '07700 900 104' },
  { id: 'rk', name: 'Rob King', initials: 'RK', role: 'Surveyor', phone: '07700 900 105' },
  { id: 'sm', name: 'Sarah Mitchell', initials: 'SM', role: 'Office Admin' },
];
export const salespeople = staff.filter(s => s.role === 'Salesperson');
export const surveyors = staff.filter(s => s.role === 'Surveyor');

export const teams = [
  { id: 't1', name: 'Team 1', lead: 'Smith', members: 'Dan Hughes & Lee Brooks', initials: 'T1', progress: 40, color: '#00c7a1', status: 'On site', where: 'The Smiths, Leicester', since: '08:30' },
  { id: 't2', name: 'Team 2', lead: 'Hartley Dental', members: 'Amir Khan & Joe Patel', initials: 'T2', progress: 10, color: '#0b6e5c', status: 'Travelling', where: 'Hartley Dental, Oadby', since: 'ETA 13:00' },
  { id: 't3', name: 'Team 3', lead: 'Workshop', members: 'Tom Wright & Ben Cole', initials: 'T3', progress: 70, color: '#e0a100', status: 'Workshop', where: 'Head office workshop', since: 'Free from 14:00' },
];

// Installers are booked one by one (not as fixed teams). The office picks whoever is free that day.
export type Installer = { id: string; name: string; initials: string; role: string; skills: string; phone: string; color: string; base: string; active?: boolean };
export const installers: Installer[] = [
  { id: 'dh', name: 'Dan Hughes', initials: 'DH', role: 'Lead fitter', skills: 'Windows, doors', phone: '07700 900 201', color: '#00c7a1', base: 'Leicester' },
  { id: 'lb', name: 'Lee Brooks', initials: 'LB', role: 'Fitter', skills: 'Windows, doors', phone: '07700 900 202', color: '#0b6e5c', base: 'Leicester' },
  { id: 'ak', name: 'Amir Khan', initials: 'AK', role: 'Lead fitter', skills: 'Orangeries, roofs, commercial', phone: '07700 900 203', color: '#13836d', base: 'Harrogate' },
  { id: 'jp', name: 'Joe Patel', initials: 'JP', role: 'Fitter', skills: 'Orangeries, bi-folds', phone: '07700 900 204', color: '#3a9c86', base: 'Harrogate' },
  { id: 'tw', name: 'Tom Wright', initials: 'TW', role: 'Lead fitter', skills: 'Repairs, snags, doors', phone: '07700 900 205', color: '#0b1f1b', base: 'Leeds' },
  { id: 'bc', name: 'Ben Cole', initials: 'BC', role: 'Fitter', skills: 'Windows, workshop', phone: '07700 900 206', color: '#2f5d55', base: 'Leeds' },
  { id: 'cr', name: 'Chris Reid', initials: 'CR', role: 'Fitter', skills: 'Doors, bi-folds', phone: '07700 900 207', color: '#5fb8a3', base: 'Ripon' },
  { id: 'sp', name: 'Sam Price', initials: 'SP', role: 'Apprentice', skills: 'Helps on any job', phone: '07700 900 208', color: '#7a8f8b', base: 'Leeds' },
];

export const STAGES =['New Enquiry', 'Qualification', 'Appointment', 'Quote Preparation', 'Quote Sent', 'Follow-up', 'Won', 'Lost'] as const;
export type Stage = typeof STAGES[number];

export type Enquiry = {
  id: string; name: string; initials: string; phone: string; email: string; address: string; postcode: string;
  product: string; source: string; received: string; daysAgo: number; assigned?: string; stage: Stage; value: number;
  next: string; nextDue: string; hot?: boolean; photo: keyof typeof IMG;
};
export const enquiries: Enquiry[] = [
  { id: 'EN-2291', name: 'Mr & Mrs Patel', initials: 'MP', phone: '07700 900 412', email: 'raj.patel@email.co.uk', address: '14 Oak Lane, Leeds', postcode: 'LS6 2AB', product: 'Bi-fold doors', source: 'Website', received: '16 Oct, 09:15', daysAgo: 0, stage: 'New Enquiry', value: 8400, next: 'Assign and call', nextDue: 'Today', hot: true, photo: 'bifold' },
  { id: 'EN-2290', name: 'Mr Khan', initials: 'MK', phone: '07700 900 233', email: 'a.khan@email.co.uk', address: '3 Mill Road, Harrogate', postcode: 'HG1 4QS', product: 'Windows', source: 'Phone call', received: '14 Oct, 11:02', daysAgo: 2, stage: 'New Enquiry', value: 6200, next: 'Call back', nextDue: 'Overdue', photo: 'window' },
  { id: 'EN-2289', name: 'The Lees', initials: 'TL', phone: '07700 900 870', email: 'lee.family@email.co.uk', address: '27 Park View, Otley', postcode: 'LS21 1AA', product: 'Conservatory', source: 'Referral', received: '13 Oct, 16:40', daysAgo: 3, assigned: 'mh', stage: 'Appointment', value: 18500, next: 'Sales appointment', nextDue: 'Tue 20 Oct', photo: 'orangery' },
  { id: 'EN-2288', name: 'Ms Green', initials: 'MG', phone: '07700 900 655', email: 'h.green@email.co.uk', address: '9 Church St, Ilkley', postcode: 'LS29 9DR', product: 'Front door', source: 'Showroom', received: '12 Oct, 10:20', daysAgo: 4, assigned: 'ec', stage: 'Qualification', value: 2900, next: 'Send brochure', nextDue: 'Today', photo: 'door' },
  { id: 'EN-2287', name: 'Dr Whitfield', initials: 'DW', phone: '07700 900 318', email: 'whitfield@email.co.uk', address: '3 High Street, Harrogate', postcode: 'HG2 7LP', product: 'Front door', source: 'Website', received: '10 Oct, 14:05', daysAgo: 6, assigned: 'jb', stage: 'Quote Preparation', value: 2380, next: 'Send quote', nextDue: 'Today', photo: 'door' },
  { id: 'EN-2286', name: 'Ashby Farm', initials: 'AF', phone: '07700 900 909', email: 'office@ashbyfarm.co.uk', address: 'Ashby Road, Thirsk', postcode: 'YO7 3HT', product: 'Windows', source: 'Referral', received: '08 Oct, 09:00', daysAgo: 8, assigned: 'mh', stage: 'Quote Sent', value: 6120, next: 'Follow up quote', nextDue: 'Fri 16 Oct', photo: 'window' },
  { id: 'EN-2285', name: 'M. Duffy', initials: 'MD', phone: '07700 900 777', email: 'm.duffy@email.co.uk', address: '60 Kirk Lane, Otley', postcode: 'LS21 3EP', product: 'Bi-fold doors', source: 'Website', received: '05 Oct, 12:30', daysAgo: 11, assigned: 'ec', stage: 'Follow-up', value: 8450, next: 'Second follow-up', nextDue: 'Mon 19 Oct', photo: 'bifold' },
  { id: 'EN-2284', name: 'K. Roberts', initials: 'KR', phone: '07700 900 123', email: 'k.roberts@email.co.uk', address: '11 Bridge St, Wetherby', postcode: 'LS22 6NN', product: 'Roof lantern', source: 'Phone call', received: '04 Oct, 15:10', daysAgo: 12, assigned: 'jb', stage: 'Quote Sent', value: 4300, next: 'Chase decision', nextDue: 'Tue 20 Oct', photo: 'roof' },
  { id: 'EN-2283', name: 'Sarah & David Smith', initials: 'SS', phone: '07700 900 482', email: 'smiths@email.co.uk', address: '14 Ashby Road, Leicester', postcode: 'LE2 3HT', product: 'Windows & door', source: 'Website', received: '28 Sep, 10:00', daysAgo: 18, assigned: 'mh', stage: 'Won', value: 12400, next: 'Book survey', nextDue: 'Done', photo: 'house' },
  { id: 'EN-2282', name: 'The Bakers', initials: 'TB', phone: '07700 900 561', email: 'bakers@email.co.uk', address: '22 Ripon Road, Ripon', postcode: 'HG4 1AB', product: 'Windows', source: 'Showroom', received: '25 Sep, 13:20', daysAgo: 21, assigned: 'ec', stage: 'Won', value: 9600, next: 'Order placed', nextDue: 'Done', photo: 'window' },
  { id: 'EN-2281', name: 'Mrs Okafor', initials: 'MO', phone: '07700 900 345', email: 'okafor@email.co.uk', address: '5 Ash Grove, Headingley', postcode: 'LS6 3JJ', product: 'Windows', source: 'Website', received: '22 Sep, 09:45', daysAgo: 24, assigned: 'jb', stage: 'Lost', value: 5100, next: 'Chose cheaper quote', nextDue: '—', photo: 'window' },
  // Mike Harris's own deals, so every sales stage has a real example in the Sales portal.
  { id: 'EN-2295', name: 'Mr & Mrs Taylor', initials: 'TT', phone: '07700 900 515', email: 'taylors@email.co.uk', address: '8 Beech Grove, Harrogate', postcode: 'HG2 0LT', product: 'Windows', source: 'Website', received: '16 Oct, 08:40', daysAgo: 0, assigned: 'mh', stage: 'New Enquiry', value: 0, next: 'Call the customer', nextDue: 'Today', hot: true, photo: 'house' },
  { id: 'EN-2294', name: 'Ms Ahmed', initials: 'SA', phone: '07700 900 377', email: 's.ahmed@email.co.uk', address: '19 Victoria Ave, Harrogate', postcode: 'HG1 5QY', product: 'Front door', source: 'Phone call', received: '15 Oct, 15:20', daysAgo: 1, assigned: 'mh', stage: 'New Enquiry', value: 0, next: 'Call the customer', nextDue: 'Overdue', photo: 'door' },
  { id: 'EN-2293', name: 'The Wrights', initials: 'TW', phone: '07700 900 458', email: 'wright.family@email.co.uk', address: '4 Linton Lane, Wetherby', postcode: 'LS22 4HL', product: 'Bi-fold doors', source: 'Referral', received: '13 Oct, 10:15', daysAgo: 3, assigned: 'mh', stage: 'Qualification', value: 9200, next: 'Book appointment', nextDue: 'Mon 19 Oct', photo: 'bifold' },
  { id: 'EN-2278', name: 'Mr Price', initials: 'DP', phone: '07700 900 734', email: 'd.price@email.co.uk', address: '22 Grove Road, Ilkley', postcode: 'LS29 9PH', product: 'Roof lantern', source: 'Website', received: '06 Oct, 09:30', daysAgo: 10, assigned: 'mh', stage: 'Quote Preparation', value: 4200, next: 'Prepare quote in Framepoint', nextDue: 'Today', photo: 'roof' },
  { id: 'EN-2277', name: 'Mrs Noble', initials: 'EN', phone: '07700 900 826', email: 'e.noble@email.co.uk', address: '31 Kent Road, Harrogate', postcode: 'HG1 2EU', product: 'Windows', source: 'Showroom', received: '29 Sep, 14:00', daysAgo: 17, assigned: 'mh', stage: 'Follow-up', value: 4800, next: 'Decide: won or lost', nextDue: 'Today', photo: 'window' },
  { id: 'EN-2275', name: 'Mr Shaw', initials: 'RS', phone: '07700 900 163', email: 'r.shaw@email.co.uk', address: '12 Otley Road, Leeds', postcode: 'LS16 5JT', product: 'Windows', source: 'Website', received: '18 Sep, 13:10', daysAgo: 28, assigned: 'mh', stage: 'Lost', value: 5600, next: 'Went with another company', nextDue: '—', photo: 'window' },
  { id: 'EN-2273', name: 'Dr Lowe', initials: 'AL', phone: '07700 900 952', email: 'a.lowe@email.co.uk', address: '2 Cold Bath Road, Harrogate', postcode: 'HG2 0NA', product: 'Windows & door', source: 'Website', received: '15 Sep, 10:00', daysAgo: 31, assigned: 'mh', stage: 'Won', value: 7900, next: 'Revise quote in Framepoint', nextDue: 'Today', photo: 'house' },
  // Won jobs waiting for Priya's final survey (Surveyor portal demo).
  { id: 'EN-2274', name: 'Mr & Mrs Collins', initials: 'MC', phone: '07700 900 641', email: 'collins.home@email.co.uk', address: '17 Ripon Road, Harrogate', postcode: 'HG1 2JA', product: 'Windows & door', source: 'Website', received: '22 Sep, 10:30', daysAgo: 24, assigned: 'jb', stage: 'Won', value: 8600, next: 'Final survey', nextDue: 'Today', photo: 'house' },
  { id: 'EN-2272', name: 'Mrs Grant', initials: 'LG', phone: '07700 900 732', email: 'l.grant@email.co.uk', address: '6 Woodlands Drive, Wetherby', postcode: 'LS22 7QP', product: 'Bi-fold doors', source: 'Referral', received: '18 Sep, 14:00', daysAgo: 28, assigned: 'mh', stage: 'Won', value: 7300, next: 'Final survey', nextDue: 'Mon 19 Oct', photo: 'bifold' },
  { id: 'EN-2270', name: 'Mr Fisher', initials: 'TF', phone: '07700 900 519', email: 't.fisher@email.co.uk', address: '44 Skipton Road, Ilkley', postcode: 'LS29 9EJ', product: 'Windows', source: 'Showroom', received: '10 Sep, 11:00', daysAgo: 36, assigned: 'ec', stage: 'Won', value: 6100, next: 'Final survey', nextDue: 'Wed 21 Oct', photo: 'window' },
  { id: 'EN-2280', name: 'Mr Evans', initials: 'ME', phone: '07700 900 288', email: 'evans@email.co.uk', address: '18 Station Rd, Knaresborough', postcode: 'HG5 9AA', product: 'Conservatory', source: 'Referral', received: '20 Sep, 11:30', daysAgo: 26, assigned: 'mh', stage: 'Appointment', value: 21000, next: 'Sales appointment', nextDue: 'Wed 21 Oct', photo: 'orangery' },
];

export type JobStage = 'Survey' | 'Quote' | 'Ordered' | 'Delivery' | 'Installation' | 'Snag' | 'Complete' | 'Aftercare';
export const JOB_STAGES: JobStage[] = ['Survey', 'Quote', 'Ordered', 'Delivery', 'Installation', 'Snag', 'Complete', 'Aftercare'];
export type Job = {
  id: string; customer: string; initials: string; address: string; postcode: string; phone: string; email: string;
  products: string; productList: { name: string; qty: number; detail: string; photo: keyof typeof IMG; ready: number }[];
  value: number; deposit: number; paid: number; stage: JobStage; sales: string; surveyor: string; team?: string;
  next: string; owner: string; due: string; overdue?: boolean; blocked?: string; photo: keyof typeof IMG;
  dates: { label: string; date: string; done?: boolean }[]; checklist: number; portal: 'Active' | 'Invited' | 'Not invited';
};
export const jobs: Job[] = [
  { id: 'JG-10482', customer: 'Sarah & David Smith', initials: 'SS', address: '14 Ashby Road, Leicester', postcode: 'LE2 3HT', phone: '07700 900 482', email: 'smiths@email.co.uk', products: '6 windows + front door', value: 6280, deposit: 3140, paid: 3140, stage: 'Ordered', sales: 'mh', surveyor: 'ps', team: 't1', next: 'Send stage payment link', owner: 'Sarah M', due: 'Today', photo: 'house', checklist: 57, portal: 'Active',
    productList: [{ name: '6 × uPVC casement windows', qty: 6, detail: 'Anthracite grey · Emplas', photo: 'window', ready: 100 }, { name: 'Composite front door', qty: 1, detail: 'Anthracite · Emplas', photo: 'door', ready: 100 }, { name: '3-pane bi-fold door', qty: 1, detail: 'Grey · Emplas', photo: 'bifold', ready: 60 }],
    dates: [{ label: 'Survey', date: '02 Oct', done: true }, { label: 'Order confirmed', date: '13 Oct', done: true }, { label: 'Delivery', date: '20 Oct' }, { label: 'Installation', date: '22–23 Oct' }, { label: 'Sign-off visit', date: '30 Oct' }] },
  { id: 'JG-10477', customer: 'The Bakers', initials: 'TB', address: '22 Ripon Road, Ripon', postcode: 'HG4 1AB', phone: '07700 900 561', email: 'bakers@email.co.uk', products: '8 windows', value: 5200, deposit: 2600, paid: 2600, stage: 'Delivery', sales: 'ec', surveyor: 'rk', next: 'Book installation', owner: 'Sarah M', due: 'Today', photo: 'window', checklist: 70, portal: 'Active',
    productList: [{ name: '8 × uPVC casement windows', qty: 8, detail: 'White · Emplas', photo: 'window', ready: 100 }],
    dates: [{ label: 'Survey', date: '29 Sep', done: true }, { label: 'Order confirmed', date: '15 Oct', done: true }, { label: 'Delivery', date: '15 Oct', done: true }, { label: 'Installation', date: 'Not booked' }] },
  { id: 'JG-10471', customer: 'Mrs Patel', initials: 'RP', address: '7 Leeds Road, Oadby', postcode: 'LE2 5AA', phone: '07700 900 643', email: 'patel.r@email.co.uk', products: 'Bi-fold doors + 2 windows', value: 8020, deposit: 4010, paid: 7218, stage: 'Snag', sales: 'mh', surveyor: 'ps', team: 't2', next: 'Order replacement handle', owner: 'Sarah M', due: 'Tomorrow', blocked: 'Waiting for part', photo: 'bifold', checklist: 92, portal: 'Active',
    productList: [{ name: '4-pane bi-fold door', qty: 1, detail: 'Grey · Emplas', photo: 'bifold', ready: 100 }, { name: '2 × casement windows', qty: 2, detail: 'Grey · Emplas', photo: 'window', ready: 100 }],
    dates: [{ label: 'Survey', date: '14 Sep', done: true }, { label: 'Delivery', date: '05 Oct', done: true }, { label: 'Installation', date: '08–09 Oct', done: true }, { label: 'Snag visit', date: 'To book' }] },
  { id: 'JG-10455', customer: 'Mr Khan', initials: 'MK', address: '41 York Road, Harrogate', postcode: 'HG1 2QL', phone: '07700 900 233', email: 'a.khan@email.co.uk', products: 'Orangery roof', value: 4680, deposit: 2340, paid: 4680, stage: 'Complete', sales: 'ec', surveyor: 'rk', team: 't2', next: 'Send guarantee pack', owner: 'Sarah M', due: 'Mon 19 Oct', photo: 'orangery', checklist: 100, portal: 'Active',
    productList: [{ name: 'Orangery roof lantern', qty: 1, detail: 'Grey · Origin', photo: 'roof', ready: 100 }],
    dates: [{ label: 'Installation', date: '12–14 Oct', done: true }, { label: 'Signed off', date: '14 Oct', done: true }] },
  { id: 'JG-10493', customer: 'Hartley Dental', initials: 'HD', address: '2 Market Place, Oadby', postcode: 'LE2 4AA', phone: '0116 496 0222', email: 'practice@hartleydental.co.uk', products: '10 windows (commercial)', value: 6500, deposit: 3250, paid: 3250, stage: 'Installation', sales: 'jb', surveyor: 'rk', team: 't2', next: 'Installation day 1 of 3', owner: 'Team 2', due: 'Today', photo: 'house', checklist: 76, portal: 'Active',
    productList: [{ name: '10 × aluminium windows', qty: 10, detail: 'Anthracite · Origin', photo: 'window', ready: 100 }],
    dates: [{ label: 'Delivery', date: '14 Oct', done: true }, { label: 'Installation', date: '16–18 Oct' }] },
  { id: 'JG-10433', customer: 'The Greens', initials: 'GR', address: '6 Mill Lane, Ilkley', postcode: 'LS29 8QJ', phone: '07700 900 412', email: 'greens@email.co.uk', products: 'Front door', value: 2380, deposit: 1190, paid: 2142, stage: 'Complete', sales: 'ec', surveyor: 'ps', team: 't1', next: 'Chase final payment', owner: 'Sarah M', due: 'Overdue', photo: 'door', checklist: 100, portal: 'Active',
    productList: [{ name: 'Composite front door', qty: 1, detail: 'Anthracite · Origin', photo: 'door', ready: 100 }],
    dates: [{ label: 'Installation', date: '29 Sep', done: true }, { label: 'Signed off', date: '29 Sep', done: true }] },
  { id: 'JG-10398', customer: 'Mrs Cooper', initials: 'JC', address: '5 Elm Close, Ripon', postcode: 'HG4 2BB', phone: '07700 900 990', email: 'j.cooper@email.co.uk', products: '4 windows', value: 2600, deposit: 1300, paid: 2600, stage: 'Complete', sales: 'ec', surveyor: 'rk', team: 't2', next: 'In guarantee until Jun 2036', owner: 'Sarah M', due: 'Done', photo: 'window', checklist: 100, portal: 'Active',
    productList: [{ name: '4 × uPVC casement windows', qty: 4, detail: 'White · Emplas', photo: 'window', ready: 100 }],
    dates: [{ label: 'Installation', date: '09–10 Jun', done: true }, { label: 'Signed off', date: '10 Jun', done: true }] },
];

export const enquirySources = [
  { name: 'Website', n: 14, pct: 41, color: '#00c7a1' },
  { name: 'Phone calls', n: 9, pct: 26, color: '#00c7a1' },
  { name: 'Referrals', n: 6, pct: 18, color: '#e0a100' },
  { name: 'Showroom', n: 5, pct: 15, color: '#b7c2bf' },
];

export const salesByMonth = [
  { m: 'Mar 26', quoted: 52, won: 30 }, { m: 'Apr 26', quoted: 48, won: 36 }, { m: 'May 26', quoted: 43, won: 32 }, { m: 'Jun 26', quoted: 50, won: 38 },
  { m: 'Jul 26', quoted: 46, won: 33 }, { m: 'Aug 26', quoted: 41, won: 26 }, { m: 'Sep 26', quoted: 49, won: 34 }, { m: 'Oct 26', quoted: 47, won: 35 },
];

export const supplierIssues = [
  { supplier: 'Emplas', initial: 'E', status: 'Late', tone: 'err', job: 'JG-10466 · Ashby Farm', left: 'Due 10 Oct', right: '3 days late', rightTone: 'err' },
  { supplier: 'Origin', initial: 'O', status: 'Not confirmed', tone: 'warn', job: 'JG-10471 · Hartley Dental', left: 'Ordered 7 Oct', right: 'Due 14 Oct' },
  { supplier: 'Emplas', initial: 'E', status: 'Part delivery', tone: 'info', job: 'JG-10459 · Dr Whitfield', left: '4 of 6 frames', right: 'Due 17 Oct' },
];

export const upcoming = [
  { title: 'Survey · The Bakers', date: '15 Oct 2026', time: '09:00 – 10:30', who: ['TB'], photo: 'house', color: '#00c7a1' },
  { title: 'Installation · Smith', date: '13–15 Oct 2026', time: '08:30 – 17:00', who: ['DH', 'LB'], photo: 'bifold', color: '#0b1f1b' },
  { title: 'Delivery · Hartley Dental', date: '14 Oct 2026', time: '11:30 – 12:00', who: ['WH'], photo: 'door', color: '#0b6e5c' },
];

export const updates = [
  { d: '14', m: 'OCT', title: 'Emplas delivery moved to Thursday', sub: 'JG-10471 · The Patels · supplier update', tag: 'Supplier', tone: 'warn' },
  { d: '13', m: 'OCT', title: 'New price list from Emplas', sub: 'Used for all quotes from 1 November', tag: 'Prices', tone: 'info' },
  { d: '12', m: 'OCT', title: 'Team 2 is back from holiday', sub: 'Free for installations from Monday', tag: 'Teams', tone: 'ok' },
  { d: '10', m: 'OCT', title: 'Survey checklist updated', sub: 'System Admin added 2 new checks', tag: 'Checks', tone: 'jade' },
  { d: '09', m: 'OCT', title: 'Customer portal is now live', sub: 'Customers can sign off and see their dates online', tag: 'Portal', tone: 'ok' },
];

export const activity = [
  { i: 'SS', who: 'Sarah & David Smith', what: 'Signed the quote online', job: 'JG-10482', when: '10 min ago', tag: 'Signed', tone: 'ok' },
  { i: 'TB', who: 'The Bakers', what: 'Paid the deposit · £2,400', job: 'JG-10477', when: '1 hour ago', tag: 'Paid', tone: 'info' },
  { i: 'MK', who: 'Mr Khan', what: 'Left a 5-star review', job: 'JG-10455', when: '3 hours ago', tag: 'Review', tone: 'jade' },
  { i: 'RP', who: 'Mrs Patel', what: 'Reported a snag · window handle', job: 'JG-10471', when: 'Yesterday', tag: 'Snag', tone: 'err' },
  { i: 'TL', who: 'The Lees', what: 'Booked a home survey', job: 'JG-10490', when: 'Yesterday', tag: 'Booked', tone: 'warn' },
];

export const todos = [
  { t: 'Chase Emplas for the JG-10466 delivery', when: 'Today', tag: 'In progress', tone: 'warn', done: false },
  { t: 'Book installation for The Bakers', when: 'Today', tag: 'Yet to start', tone: 'grey', done: false },
  { t: 'Send balance reminder to Mr Khan', when: 'Tomorrow', tag: 'Yet to start', tone: 'grey', done: false },
  { t: 'Confirm survey time with The Lees', when: 'Done today', tag: 'Completed', tone: 'ok', done: true },
  { t: 'Check new Emplas price list', when: '16 Oct', tag: 'In progress', tone: 'warn', done: false },
];

export const topProducts = [
  { name: 'Windows', sold: 142, pct: 46, photo: 'window' }, { name: 'Doors', sold: 68, pct: 22, photo: 'door' },
  { name: 'Bi-folds', sold: 43, pct: 14, photo: 'bifold' }, { name: 'Conservatories', sold: 12, pct: 10, photo: 'orangery' },
  { name: 'Roofs', sold: 9, pct: 8, photo: 'roof' },
];

export const quotes = [
  { ref: 'FP-55120', customer: 'Ashby Farm', product: '12 windows', value: 6120, sent: '09 Oct', status: 'Sent', tone: 'info', sales: 'mh', expires: '09 Nov' },
  { ref: 'FP-55118', customer: 'K. Roberts', product: 'Roof lantern', value: 4300, sent: '06 Oct', status: 'Sent', tone: 'info', sales: 'jb', expires: '06 Nov' },
  { ref: 'FP-55114', customer: 'M. Duffy', product: 'Bi-fold doors', value: 8450, sent: '05 Oct', status: 'Accepted', tone: 'ok', sales: 'ec', expires: '—' },
  { ref: 'FP-55109', customer: 'Sarah & David Smith', product: 'Windows & door', value: 12400, sent: '30 Sep', status: 'Accepted', tone: 'ok', sales: 'mh', expires: '—' },
  { ref: 'FP-55101', customer: 'Mrs Okafor', product: 'Windows', value: 5100, sent: '24 Sep', status: 'Declined', tone: 'err', sales: 'jb', expires: '—' },
  { ref: 'FP-55097', customer: 'Mr Grant', product: 'French doors', value: 3650, sent: '15 Sep', status: 'Expired', tone: 'grey', sales: 'ec', expires: '15 Oct' },
];

export const surveys: { id: string; job: string; customer: string; address: string; date: string; time: string; surveyor: string; status: string; tone: string; photo: string; kind?: string; reason?: string; iso?: string; notes?: string }[] = [];

export const orders = [
  { ref: 'SO-48238', job: 'JG-10482', customer: 'Sarah & David Smith', supplier: 'Emplas', ordered: '06 Oct', confirmed: true, confirmRef: 'EMP-77104', expected: '20 Oct', frames: '0 of 7', status: 'On the way', tone: 'info', checks: 5, enquiry: 'EN-2283', items: '6 × casement window, 1 × composite front door' },
  { ref: 'SO-48213', job: 'JG-10477', customer: 'The Bakers', supplier: 'Emplas', ordered: '08 Oct', confirmed: true, confirmRef: 'EMP-77096', expected: '15 Oct', frames: '8 of 8', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2282', items: '8 × casement window' },
  { ref: 'SO-48190', job: 'JG-10493', customer: 'Hartley Dental', supplier: 'Emplas', ordered: '25 Sep', confirmed: true, confirmRef: 'EMP-76988', expected: '14 Oct', frames: '10 of 10', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2276', items: '10 × casement window' },
  { ref: 'SO-48121', job: 'JG-10471', customer: 'Mrs Patel', supplier: 'Origin', ordered: '29 Aug', confirmed: true, confirmRef: 'ORG-30412', expected: '05 Oct', frames: '3 of 3', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2271', items: '1 × bi-fold door, 2 × casement window' },
  { ref: 'SO-48101', job: 'JG-10455', customer: 'Mr Khan', supplier: 'Origin', ordered: '21 Aug', confirmed: true, confirmRef: 'ORG-30377', expected: '09 Oct', frames: '1 of 1', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2268', items: '1 × roof lantern' },
  { ref: 'SO-48060', job: 'JG-10433', customer: 'The Greens', supplier: 'Origin', ordered: '27 Jul', confirmed: true, confirmRef: 'ORG-30188', expected: '26 Sep', frames: '1 of 1', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2262', items: '1 × composite front door' },
  { ref: 'SO-47820', job: 'JG-10398', customer: 'Mrs Cooper', supplier: 'Emplas', ordered: '16 May', confirmed: true, confirmRef: 'EMP-75120', expected: '05 Jun', frames: '4 of 4', status: 'Arrived', tone: 'ok', checks: 5, enquiry: 'EN-2240', items: '4 × casement window' },
];

export const deliveries = [
  { time: '08:00', ref: 'SO-48238', customer: 'Sarah & David Smith', job: 'JG-10482', where: 'Leicester', status: 'On the way', tone: 'info', day: 'Tue 20 Oct', items: '7 frames', photo: 'house' },
  { time: '08:00', ref: 'SO-48213', customer: 'The Bakers', job: 'JG-10477', where: 'Ripon', status: 'Arrived', tone: 'ok', day: 'Thu 15 Oct', items: '8 frames', photo: 'window' },
  { time: '09:00', ref: 'SO-48190', customer: 'Hartley Dental', job: 'JG-10493', where: 'Oadby', status: 'Arrived', tone: 'ok', day: 'Wed 14 Oct', items: '10 frames', photo: 'house' },
];

export const diaryDays = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16', 'Sat 17'];
export const diaryEvents = [
  { team: 't1', start: 1, days: 3, kind: 'install', title: 'Smith · windows', sub: 'JG-10482 · Leicester', photo: 'house' },
  { team: 't1', start: 4, days: 1, kind: 'survey', title: 'Survey help · Lees', sub: 'JG-10490', photo: 'orangery' },
  { team: 't2', start: 0, days: 3, kind: 'install', title: 'Khan · orangery roof', sub: 'JG-10455 · Harrogate', photo: 'orangery' },
  { team: 't2', start: 4, days: 2, kind: 'install', title: 'Hartley Dental', sub: 'JG-10493 · 3 days', photo: 'window' },
  { team: 't3', start: 0, days: 1, kind: 'delivery', title: 'Workshop prep', sub: 'Glazing beads', photo: 'window' },
  { team: 't3', start: 2, days: 2, kind: 'install', title: 'Patel · bi-folds', sub: 'JG-10471 · snag visit', photo: 'bifold' },
];

export const snags = [
  { id: 'SN-118', job: 'JG-10471', customer: 'Mrs Patel', title: 'Window handle is stiff', detail: 'Rear bedroom window handle hard to turn.', reported: 'Customer · 15 Oct', status: 'Waiting part', tone: 'warn', severity: 'Minor', photo: 'window', owner: 'Team 2' },
  { id: 'SN-117', job: 'JG-10471', customer: 'Mrs Patel', title: 'Scratch on bi-fold frame', detail: 'Small scratch on the left panel frame.', reported: 'Installer · 09 Oct', status: 'Open', tone: 'err', severity: 'Minor', photo: 'bifold', owner: 'Team 2' },
  { id: 'SN-116', job: 'JG-10455', customer: 'Mr Khan', title: 'Trim colour mismatch', detail: 'One trim delivered in white, not grey.', reported: 'Installer · 13 Oct', status: 'Fixed', tone: 'ok', severity: 'Minor', photo: 'roof', owner: 'Team 2' },
  { id: 'SN-114', job: 'JG-10433', customer: 'The Greens', title: 'Door draught', detail: 'Draught at the bottom of the front door.', reported: 'Customer · 01 Oct', status: 'Fixed', tone: 'ok', severity: 'Minor', photo: 'door', owner: 'Team 1' },
];

export const threads = [
  { id: 1, who: 'Sarah & David Smith', i: 'SS', job: 'JG-10482', source: 'Portal', last: 'Thanks! Will the fitters need the driveway clear?', when: '10:42', unread: true },
  { id: 2, who: 'Emplas · Tom Reed', i: 'TR', job: 'JG-10466', source: 'Email', last: 'Re: Delivery for Ashby Farm — new date Thursday', when: '09:15', unread: true },
  { id: 3, who: 'Mrs Patel', i: 'RP', job: 'JG-10471', source: 'Call', last: 'Call logged: handle still stiff, wants a visit', when: 'Yesterday', unread: true },
  { id: 4, who: 'The Bakers', i: 'TB', job: 'JG-10477', source: 'Email', last: 'Deposit paid — when can you fit?', when: 'Yesterday' },
  { id: 5, who: 'Mr Khan', i: 'MK', job: 'JG-10455', source: 'Portal', last: 'Very happy with the roof, thank you all', when: 'Mon' },
  { id: 6, who: 'Dr Whitfield', i: 'DW', job: 'JG-10459', source: 'Email', last: 'Can the last two frames come Saturday?', when: 'Mon' },
];

export const invoices = [
  { ref: 'INV-3381', customer: 'Sarah & David Smith', job: 'JG-10482', type: 'Deposit', amount: 3140, paid: 3140, status: 'Paid', tone: 'ok', due: '05 Oct' },
  { ref: 'INV-3392', customer: 'Sarah & David Smith', job: 'JG-10482', type: 'Stage payment', amount: 2512, paid: 0, status: 'Due', tone: 'warn', due: '20 Oct' },
  { ref: 'INV-3375', customer: 'Mr Khan', job: 'JG-10455', type: 'Balance', amount: 2340, paid: 2340, status: 'Paid', tone: 'ok', due: '14 Oct' },
  { ref: 'INV-3369', customer: 'Mrs Patel', job: 'JG-10471', type: 'Balance', amount: 802, paid: 0, status: 'On hold · snag', tone: 'info', due: 'After snag' },
  { ref: 'INV-3360', customer: 'Ashby Farm', job: 'JG-10466', type: 'Deposit', amount: 3700, paid: 3700, status: 'Paid', tone: 'ok', due: '30 Sep' },
  { ref: 'INV-3352', customer: 'Hartley Dental', job: 'JG-10493', type: 'Deposit', amount: 3250, paid: 3250, status: 'Paid', tone: 'ok', due: '28 Sep' },
  { ref: 'INV-3348', customer: 'The Greens', job: 'JG-10433', type: 'Balance', amount: 238, paid: 0, status: 'Overdue', tone: 'err', due: '02 Oct' },
];

export const notifications = [
  { icon: 'truck', tone: 'warn', title: 'Emplas delivery for the Smiths is on its way', sub: 'SO-48238 · due Tue 20 Oct', when: '5 min ago' },
  { icon: 'pound', tone: 'ok', title: 'Deposit received from Mrs Hughes', sub: 'Xero · matched automatically', when: '1 hour ago' },
  { icon: 'clipboard', tone: 'warn', title: 'Mrs Hughes needs a final survey', sub: 'Won today · assign a surveyor', when: '1 hour ago' },
  { icon: 'alert', tone: 'err', title: 'Mrs Patel has 2 open snags', sub: 'JG-10471 · book a return visit', when: 'Yesterday' },
];

// Mike's own month-by-month figures in £ thousands (value quoted and value won). October is worked out live.
export const mySalesByMonth = [
  { m: 'Mar', quoted: 38, won: 16 }, { m: 'Apr', quoted: 44, won: 21 }, { m: 'May', quoted: 46, won: 24 }, { m: 'Jun', quoted: 40, won: 19 },
  { m: 'Jul', quoted: 52, won: 27 }, { m: 'Aug', quoted: 48, won: 23 }, { m: 'Sep', quoted: 56, won: 31 },
];

export const gbp = (n: number) => '£' + n.toLocaleString('en-GB');
export const staffById = (id?: string) => staff.find(s => s.id === id);
export const teamById = (id?: string) => teams.find(t => t.id === id);
export const jobById = (id?: string) => jobs.find(j => j.id === id);
