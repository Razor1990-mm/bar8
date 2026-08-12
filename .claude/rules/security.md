---
paths:
  - "src/app/**"
  - "src/lib/supabase/**"
  - "src/middleware.ts"
---

# Security Rules (Detail)

Root CLAUDE.md has the summary. This file has the _why_ and _how_ for this Supabase-backed Next.js app.

## Service-Role Key Never Client-Side

The Supabase service-role key bypasses RLS entirely. It must:
- Only ever be read via `process.env` inside code that runs on the server (Route Handlers, Server Components, Server Actions, scripts).
- Never be imported into a file reachable from a Client Component bundle. If a file with `"use client"` — or anything it imports — touches `SUPABASE_SERVICE_ROLE_KEY`, that is a P0.
- Never be logged, echoed in error messages, or included in any response body.

Prefer the request-scoped `@supabase/ssr` client (anon key + user's session cookie) for nearly everything — it runs RLS as the authenticated user, which is the safety net. Reach for the service-role client only for genuinely admin/system operations (e.g. an approval action already gated by `is_admin()` at the route level, a scheduled job) and say so in a comment at the call site.

## RLS Is Row-Level, Not Column-Level

See `.claude/rules/code-patterns.md` § "Supabase RLS Patterns" and `.claude/rules/landmines.md` for the full story. The short version: an owner-writable `UPDATE` policy does not stop a member from writing to privileged columns on their own row unless a `BEFORE INSERT/UPDATE` trigger pins them. Before adding any owner-writable policy, check whether the table has privileged columns (`is_admin`, `status`, anything that gates access) and whether a guard trigger exists for them (`supabase/migrations/0004_profile_privilege_guards.sql` is the reference implementation).

## `membership_applications` Holds PII — No Public SELECT

The public membership-request form (`docs/BRIEF.md` § "Request Membership") writes email, phone, city, and Instagram/LinkedIn handles into `public.membership_applications`. Per `supabase/migrations/0002_rls_policies.sql`:
- `anon` and `authenticated` may `INSERT` (submit an application).
- Only `is_admin()` may `SELECT`, `UPDATE`, or `DELETE`.
- There is intentionally **no** member-level read policy of any kind — being an active member does not entitle you to read other people's applications.

Any new feature that surfaces application data (an admin review queue, an approval email) must read through an admin-gated path (RLS via an authenticated admin session, or the service-role key from a server-only admin route) — never expose this table to a public or member-authenticated query.

## Storage: Private Buckets, Signed URLs Only

All Supabase Storage buckets (`avatars`, `cars`, `events`, `stories`, `applications`) are created with `public = false` (`supabase/migrations/0003_storage_buckets.sql`). Access is entirely mediated by `storage.objects` RLS policies matched to the equivalent table policies. This means:
- Never construct a "public" object URL and render it directly — it will 400/403 unless the bucket is actually public.
- Fetch a signed URL (short expiry) server-side for any object a client needs to render, or let the client hit an authenticated Supabase client that already carries the right session for RLS to allow the read.
- Object paths are namespaced by owner (`avatars/{profile_id}/...`, `cars/{profile_id}/{car_id}/...`) so ownership checks can be a prefix match — don't invent a different path convention for new owner-scoped buckets without a matching RLS policy update.

## Auth: Magic Link

Auth is Supabase magic-link (passwordless email). There is no password to leak, but:
- Never log the magic-link token or the full email OTP.
- Session cookies are HttpOnly and managed by `@supabase/ssr` — don't hand-roll cookie reads/writes for auth state.
- A signed-up-but-not-yet-approved member has a Supabase auth account and a `profiles` row with `status = 'pending'` (see `guard_profile_privileges()` — self-service signup always lands `pending`, never `active`). "Has an account" and "is an approved member" are different things; gate member-only UI on `status = 'active'`, not merely on being authenticated.

## Fail-Closed Route Gating in Middleware

`middleware.ts` (or route-level auth checks if middleware isn't used for a given path) must fail closed:

```typescript
// WRONG: silent bypass on missing session
if (!session) return NextResponse.next(); // unauthenticated user reaches a member page

// CORRECT: fail-closed — missing session redirects to login
if (!session) return NextResponse.redirect(new URL("/login", request.url));

// CORRECT: config error is loud, not a silent bypass
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL not configured");
```

Every route under the authenticated member area (`/dashboard`, `/events`, `/members`, `/garage`, `/stories`-when-gated, etc. per `docs/BRIEF.md` navigation) must be denied by default and only allowed once a valid `active` session is confirmed — never allow-by-default with a deny-list of protected paths.

## Severity Classification

| Severity | Definition | Action |
|----------|------------|--------|
| **P0** | Service-role key reachable client-side, RLS column-escalation hole, PII leak (membership_applications, phone/email exposure), auth bypass, secrets in logs | **BLOCK PR** — fix before merge |
| **P1** | Weak validation, missing signed-URL expiry, missing timeouts on external calls (Resend/Luma/Maps), fail-open route gating with low blast radius | **SHOULD FIX** — merge with mitigation plan |
| **P2** | Code smell, minor improvements | **NICE TO HAVE** — defer to backlog if timeline-critical |

## Security Review Manual Checklist

1. **RLS coverage:** Does every new table have RLS enabled and policies for every operation it needs (select/insert/update/delete), including an explicit admin-all policy?
2. **Privilege columns:** Does any owner-writable policy sit on a table with privileged columns lacking a guard trigger?
3. **Service-role isolation:** Grep the diff for `SUPABASE_SERVICE_ROLE_KEY` — is every usage server-only?
4. **PII:** Any new field that's an email/phone/address — does it land in a table/bucket with a public or member-wide read policy it shouldn't have?
5. **Auth:** Fail-closed on missing/invalid session, no silent bypass?
6. **Storage:** New bucket created — is it `public = false` with matching RLS policies, not left at Supabase's public default?
7. **Error responses:** No stack traces, no raw Postgres/RLS error text, to the client?

## Debugging Patterns

- **RLS denies a write unexpectedly:** check policy `USING`/`WITH CHECK` clauses match the actual session's `auth.uid()`, and check for a guard trigger silently rewriting a column you expected to persist.
- **"It works with the service role but not for the user":** that's RLS doing its job — verify the policy intentionally excludes that case, don't reach for the service-role key as the fix.
