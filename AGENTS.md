# Jadeite Systems · Surveyor portal (Figma Make)

Clickable prototype of the **Surveyor portal** for Jadeite Glazing (windows, doors, bifolds, orangeries) — the surveyor's side of the same platform as the Office Admin and the Sales portal.
React 19 + Vite + TypeScript, running inside Figma Make. It is a complete stand-alone app with the same design system, components and customer records as the other portals, so keep the look the same.

The demo is signed in as **Priya Shah** (surveyor). She only sees the visits booked for her.

## Development server
A Vite dev server is already running on `$PORT` (default 8443). Changes hot-reload in the preview.

## Structure
- `src/main.tsx` – entry: HashRouter → StoreProvider → ToastProvider → App. Imports Sora font, `src/index.css`, `src/styles/app.css`.
- `src/App.tsx` – routes: login, welcome tour, Today, Final surveys (`/surveys`, `/surveys/:id`), Inspections (`/inspections`, `/inspections/:id`), My calendar, Messages, Settings.
- `src/components/Layout.tsx` – surveyor sidebar, header (⌘K search of my visits, notifications, profile menu), footer.
- `src/components/survey.tsx` – my visits, statuses, and the shared pop-ups (On my way, Can't make it, Customer not in, Time off), signature pad and photos.
- `src/pages/SurveyJob.tsx` – the final survey visit: visit details, measure every Framepoint item, site checks, photos, signature, submit, report. `src/pages/InspectionJob.tsx` – aftercare / snag inspections.
- `src/components/ui.tsx` – shared UI: Card, Tag, Avatar, Tabs, Modal, Drawer, Field, Switch, Toast…
- `src/data/mock.ts`, `src/data/lifecycle.ts` – sample data; `src/data/store.tsx` – shared demo state (saved in sessionStorage; "Reset demo data" in the profile menu clears it). Demo "today" is 16 Oct 2026.
- `public/images` – property photos and the Jadeite J logo (use relative paths like `images/house.jpg`).

## Surveyor flow (matches the agreed flow)
Deal Won → office checks documents and deposit → office books the final survey with a surveyor → it appears in Today, the calendar and Outlook → On my way (text to the customer) → Start survey on site → measure every item against the salesperson's Framepoint size (within 5mm = same) → site checks → photos → customer signs → Submit. All sizes the same → the office prepares the order. A size changed → the salesperson revises the quote in Framepoint first. Can't make it → the office moves it. Customer not in → sent back to the office to rebook. The office can also send the surveyor to inspect an aftercare or snag problem; the findings go back so the fitter brings the right part.

## Design system (do not drift)
- Font: Sora (400–700). Plain CSS tokens in `src/styles/app.css` — reuse its classes (`card`, `tag`, `btn`, `input`, `list`, `grid-2`, `hstack`, `vstack`, `between`, `muted`…).
- Colours: primary `#00c7a1`, primary-dark `#0b6e5c`, deep `#0b1f1b`, tint `#ebf7f3`, page `#f6f8f7`, border `#e3e9e7`, text `#0f1414` / `#3a4a4a` / `#6b7a78`, ok `#1f9d5b`, warn `#e0a100`, error `#d64545` (use red sparingly).
- Calm, simple, jargon-free wording. Real property photos where they help.
- Tailwind utilities are available, but Tailwind's base reset is intentionally not loaded.

## Demo sign-in
Any email · security code **482193** (3 wrong codes locks the account).

## Code quality
- Use double quotes for strings containing apostrophes, or escape them.
- Keep JSX balanced; pages export components used in `App.tsx`.
