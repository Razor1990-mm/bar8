---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "e2e/**"
---

# Test Cleanup

This app has no Prisma/ORM and no multi-tenant FK graph — most tests run against mocked Supabase clients and fixture data from `src/lib/fixtures.ts`, so there is usually nothing to clean up. This file covers the cases where cleanup does matter.

## Unit Tests (vitest, mocked Supabase)

If a test mocks `@supabase/supabase-js` / `@supabase/ssr`, reset the mock between tests (`vi.clearAllMocks()` / `vi.restoreAllMocks()` in `afterEach`) so one test's mocked return value doesn't leak into the next. Do not share a mutable mock client instance across `it()` blocks without resetting it.

## Integration Tests Against a Real Supabase Project (local or test project)

If a test writes real rows (e.g. verifying an RLS policy or the `guard_profile_privileges()` trigger), it MUST clean up what it created, in FK-safe order:

```
Depth 2 (leaves):
  car_photos      -> cars
  event_attendance -> events, profiles
  story_photos    -> stories

Depth 1:
  cars            -> profiles
  event_schedule_items -> events

Depth 0 (root-adjacent):
  events
  stories
  membership_applications
  profiles          -> auth.users (delete the auth user last, via admin API)
```

Delete children before parents. `profiles.id` is the same UUID as `auth.users.id` (Supabase auth), so a test-created auth user must be deleted via the admin API (`supabase.auth.admin.deleteUser(id)`) as the final step, after `profiles` and everything hanging off it.

**Never leave test rows in a shared Supabase project.** If you're testing against a real project (not a fully local `supabase start` instance), use clearly-tagged test data (e.g. email addresses under a `+test-` alias) and delete it in a `afterEach`/`afterAll`, not just on success — a failed assertion must not skip cleanup.

## E2E Tests (Playwright)

Playwright tests that submit real forms (membership application, garage car add) against a running dev server hitting a real or local Supabase instance must clean up any rows they create, same ordering as above. Prefer a local `supabase start` instance for e2e over a shared project — never run e2e against production Supabase.

## Rule

**When in doubt, don't write to a real database in a test.** Most of this codebase's logic (Zod validation, the RSVP provider switch, fixture accessors, display formatting) can be fully tested against mocks or fixtures with zero cleanup burden. Reach for a real Supabase connection only when the thing under test IS the RLS policy or trigger behavior itself.
