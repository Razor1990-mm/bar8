---
paths:
  - "src/**"
---

# Code Patterns

These patterns apply to all application code under `src/`. Root CLAUDE.md has the principles; this file has the implementation patterns.

## Server Components by Default

Every component under `src/app/` and `src/components/` is a Server Component unless it needs interactivity (event handlers, hooks, browser APIs). Add `"use client"` only at the leaf that actually needs it — don't push it up the tree.

```tsx
// WRONG: whole page opts into client rendering for one button
"use client";
export default function EventPage() { ... }

// CORRECT: page stays a Server Component; only the RSVP button is client
export default function EventPage() {
  return <RsvpButton eventId={event.id} />; // RsvpButton.tsx has "use client"
}
```

Data fetching (Supabase reads) happens in Server Components / Route Handlers / Server Actions, never client-side unless the data is user-interaction-scoped (e.g. live-updating a form).

## Supabase RLS Patterns

**RLS is row-level, not column-level.** A `USING`/`WITH CHECK` policy that lets a member update their own `profiles` row does NOT stop them from setting privileged columns (`is_admin`, `status`, `member_since`) on that same row — Postgres RLS has no concept of "this column is off-limits." The fix is a `BEFORE INSERT OR UPDATE` trigger that pins privileged columns to safe values unless the caller is already an admin. See `supabase/migrations/0004_profile_privilege_guards.sql` (`guard_profile_privileges()`) for the canonical example — it was written specifically to close a privilege-escalation hole left open by the naive owner-writable policy in `0002_rls_policies.sql`.

**Rule for new tables:** any table with an owner-writable policy (`profile_id = auth.uid()` / `id = auth.uid()`) that also has privileged or admin-only columns MUST have a matching guard trigger. Don't assume the policy alone protects the row.

**Two Supabase clients, never cross them:**
- Server-side (Route Handlers, Server Components, Server Actions): create a client scoped to the request's cookies via `@supabase/ssr`, so RLS runs as the authenticated user.
- Browser-side (Client Components): a client using the anon key, also RLS-scoped to the signed-in user via cookies.
- The service-role key bypasses RLS entirely — it must never be imported into any file that can end up in a client bundle. See `.claude/rules/security.md`.

**Query pattern:** trust RLS to filter rows, don't hand-roll `.eq('profile_id', ...)` checks as a substitute for a policy — but DO write the policy defensively (assume RLS is the only enforcement layer, because it is).

## Zod Schemas (Shared Client/Server)

Validation schemas live in `src/lib/schemas/` (see `application.ts`, `car.ts`, `event.ts`, `profile.ts`) and are imported by both the client (React Hook Form via `@hookform/resolvers/zod`) and the server (Route Handler / Server Action parsing `request.json()` or `formData`). One schema, one source of truth for a shape — never redefine the same validation twice.

```typescript
// src/lib/schemas/car.ts
export const carSchema = z.object({ ... });
export type Car = z.infer<typeof carSchema>;

// client: React Hook Form
useForm({ resolver: zodResolver(carSchema) });

// server: Route Handler
const parsed = carSchema.safeParse(await request.json());
if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
```

Server-side validation is mandatory even when the client already validated via the same schema — never trust client input just because a shared schema exists.

## Fixture-Accessor Pattern

`src/lib/fixtures.ts` is placeholder content for pre-database development. Pages never import the fixture arrays directly — they always go through the async accessor functions at the bottom of the file (e.g. `getMembers()`, `getEvents()`). This means swapping fixtures for real Supabase queries later is a matter of reimplementing those accessor functions and deleting the fixture data — zero page-level changes.

**Rule:** when building a new page or component that needs data, write it against an accessor function signature (even if that function currently returns fixture data), never against the raw fixture shape. When wiring up real Supabase queries, replace the accessor body only — keep the same function signature and return shape so callers don't change.

Fixture data may include real member names/cities/cars (founder-approved for this public repo) but must never include phone numbers, emails, or social handles — see `.claude/rules/landmines.md` L3.

## RSVP Provider Abstraction

`src/lib/rsvp/provider.ts` is the single switch point between Luma (V1) and a future native RSVP system. Callers get a provider via `getRsvpProvider(event)` and only ever call `RsvpProvider.getRsvpUrl()` / `.syncAttendance()` — never reach into Luma-specific logic (URLs, API calls) from a page or component directly.

```typescript
// WRONG: page hardcodes Luma URL construction
<a href={`https://lu.ma/event/${event.luma_event_id}`}>RSVP</a>

// CORRECT: page goes through the provider abstraction
const provider = getRsvpProvider(event);
const rsvpUrl = provider.getRsvpUrl(event);
```

When adding new RSVP-related functionality, extend the `RsvpProvider` interface and implement it in both `LumaProvider` and `NativeProvider` (even if `NativeProvider` just throws "not implemented in V1") — never add a Luma-only method that callers branch on.

## Error Handling in Route Handlers / Server Actions

- 400: Zod validation failure (return `parsed.error.flatten()` or similar structured detail)
- 401: not authenticated (missing/invalid session)
- 403: authenticated but RLS/policy would reject the write (prefer letting Supabase's RLS error surface as 403, don't swallow it)
- 404: resource not found (or not visible under RLS — don't distinguish "doesn't exist" from "not visible to you" in the response, that's an enumeration leak)
- 500: unexpected errors — log details server-side, return a generic message to the client

## Immutability

- Treat request payloads and fetched Supabase rows as immutable — don't mutate in place, return new objects.
- No mutable module-level singletons for request state (Next.js runs multiple concurrent requests in the same process).

## Resource & Cost

| Issue | Rule |
|-------|------|
| External API calls (Resend, Luma, Google Maps) | Must have timeouts (AbortController) |
| Supabase queries | No unbounded `select('*')` on large tables without `.limit()` |
| Pagination | Must have a MAX_LIMIT cap, not just a default |
| Loops over external data | Must have max iteration limits |
| Signed URL generation | Short, sane expiry — never a signed URL with no expiry |

## Test Cleanup

See `.claude/rules/test-cleanup.md` for vitest/Supabase test data hygiene.
