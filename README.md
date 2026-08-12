# BAR8

The digital home of a private drivers club — a community built around great
cars, great roads and the people behind the wheel.

Members discover events, see who's going, RSVP, and revisit past drives. The
site's whole job is to answer one question — _what are we doing next?_ — and
then get people off the screen and onto the road.

**Full specification:** [`docs/BRIEF.md`](docs/BRIEF.md)

## Stack

| Concern                   | Choice                                         |
| ------------------------- | ---------------------------------------------- |
| Framework                 | Next.js 16 (App Router), React 19, TypeScript  |
| Styling                   | Tailwind CSS v4 + CSS custom properties        |
| Database / Auth / Storage | Supabase (Postgres + RLS, magic link)          |
| Email                     | Resend                                         |
| RSVP                      | Luma (behind a provider interface — swappable) |
| Maps                      | Google Maps                                    |
| Hosting                   | Vercel                                         |
| Tests                     | Vitest (unit) + Playwright (mobile flows)      |

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase / Resend / Maps keys
npm run dev
```

Then visit:

- `/` — public homepage
- `/styleguide` — the design system on one page (internal; removed before launch)

## Design system

Dark-first, single restrained accent, hairline rules instead of cards.
Everything is built from tokens in `src/app/globals.css` and primitives in
`src/components/`.

**Type voices** — `type-display` (uppercase, tight tracking), `type-editorial`
(65ch measure), `type-label` (small caps), `type-data` (tabular numerals).

**Colors** — `ink` `charcoal` `slate` `hairline` `bone` `muted`, plus `signal`,
a desaturated red used as a fill in exactly one place: the confirmed-RSVP
state. If it starts appearing elsewhere, the system is drifting.

**No cards.** Event and member cards are hairline-above with air below, never
boxes. This is what separates "private paddock" from "ticketing platform."

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm test           # vitest
npm run test:e2e   # playwright, iPhone 15 viewport
npm run format     # prettier
```

## Conventions

- Server Components by default; `"use client"` only where interaction requires it.
- Zod schemas in `src/lib/schemas/` are shared between client and server.
- No Audi- or R8-specific logic in the data model — the club has an R8 heritage,
  the software supports any enthusiast vehicle.
- Luma sits behind `src/lib/rsvp/` so it can be replaced by native RSVP without
  touching the UI.
