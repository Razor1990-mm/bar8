# Needed from Raza

The build is blocked on nothing below for design work, but each unlocks a
phase of real functionality. In priority order:

## 1. Supabase (unlocks auth, applications, admin — the biggest one)

- Personal access token from https://supabase.com/dashboard/account/tokens
  → paste into chat (or `export SUPABASE_ACCESS_TOKEN=sbp_...`).
  I'll create the project, push migrations, and wire the env myself.
- Or if you'd rather click: create a project named `bar8` (US West), then
  paste Project URL + anon key + service-role key, or put them in
  `.env.local` (never commit it).

## 2. Vercel + domain (unlocks the live site)

- `npx vercel login` in a terminal (or `! npx vercel login` in the session).
- Where is bar08.com registered? I need to tell you which DNS records to set.

## 3. Member details (5 minutes, big demo impact)

- **Ken Toy:** city, car(s) — year/make/model/trim, color.
- **Mike Hong:** same.
- Your bio line for the profile page, if you want one.
- Portrait/avatar photos for the three of you (or I leave initials).

## 4. Real event + integrations

- One real Luma event URL (or make one for the next actual drive).
- The WhatsApp group invite link for "Open Club Chat".
- Was there a real past drive? Date, route, miles, anything you remember —
  the three Stories are currently invented sample content in the right
  voice, and even one real one beats all three.

## 5. Photography

- Any real photos from drives — phone shots are fine, the treatment layer
  makes them consistent. Drop them anywhere and tell me.
- Meanwhile I'll source licensed editorial stock as placeholders.

## 6. Decisions (one line each)

- Resend account for email — create one, or defer email entirely until
  after the Ken demo? (Applications can land in the admin queue without
  confirmation email.)
- Application form: OK that only name + email are required? (Currently my
  assumption; everything else optional.)
- Display font: Inter Tight (free, current) or license something with more
  character (Söhne / GT America, ~$200–400)?
