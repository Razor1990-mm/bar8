---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
  - "e2e/**"
---

# Testing Rules (Detail)

Root CLAUDE.md has the DoD checklist and TDD principle. This file has testing philosophy and patterns for vitest (unit) + Playwright (mobile e2e).

## Mutation-Resistant Assertions (HARD RULE)

**Ban shape-only assertions.** These patterns look like tests but don't protect logic:

```typescript
// BANNED — survives any mutation
expect(result).toHaveProperty("status");
expect(typeof label).toBe("string");
expect(label.length).toBeGreaterThan(0);
expect(result).toBeDefined();
expect(result).toBeTruthy();

// REQUIRED — pins actual behavior
expect(result.status).toBe("pending");
expect(label).toContain("2017 Audi R8 V10+");
expect(spotsRemaining).toBe(7);
expect(getRsvpProvider(event)).toBeInstanceOf(LumaProvider);
```

**Rules:**
1. Every `expect` on a function's return value must assert a **specific value**, not just existence or type.
2. **Boundary values are mandatory** for threshold logic — capacity at exactly full, RSVP cutoff at exactly the event date, not just clearly-above/below.
3. **String outputs must have content assertions** — display labels, error messages, Zod error text. Use `toContain()` or `toBe()`, never just `typeof === "string"`.
4. **Arithmetic must be pinned** — if code computes `capacity - attending`, assert the exact result.
5. `toHaveProperty` is only acceptable when followed by a value assertion on the same field.

## Circular Validation Warning

Tests prove **internal consistency**, not external correctness. For external integrations (Supabase RLS behavior, Resend delivery, Luma redirect, magic-link flow), a mocked Supabase client passing does not mean the real RLS policy behaves the same way. Where a test asserts "RLS denies this write," prefer testing against a real Supabase project (local `supabase start` or a test project) rather than a mock that just replays your assumption about the policy.

## Existing Tests Are Sacred (HARD RULE)

**NEVER modify existing tests to make new code pass.** If your implementation breaks an existing test, the implementation is wrong — not the test.

- If an existing test fails after your change: **revert your change and fix the implementation.**
- If you believe an existing test is genuinely wrong: **STOP. Report as BLOCKER.** Do not "fix" the test yourself.
- **No exceptions.** Not "just updating the expected value." Not "the test was outdated." BLOCKER.

## TDD Workflow

Always invoke `/tdd-workflow` skill for the RED phase. Do NOT write tests manually without the skill.

**When TDD applies:** Zod schema logic, RSVP provider selection, fixture-accessor functions once they wrap real Supabase queries, any pure business logic (capacity math, attendance counts, date/schedule formatting).
**When TDD doesn't apply:** Pure presentational Server Components with no logic, styling changes, exploratory spikes, trivial one-liners.

## Test Layout

Tests are **colocated**, per `vitest.config.ts`'s include pattern: `src/**/*.test.ts` and `src/**/*.test.tsx`. Put `foo.test.ts` next to `foo.ts`, not in a separate `__tests__/` tree.

- **Unit tests (vitest):** pure functions (`src/lib/schemas/*`, `src/lib/fixtures.ts` accessors, `src/lib/rsvp/provider.ts`), component rendering/interaction (`src/components/*.test.tsx` with React Testing Library conventions if/when added). No real network or Supabase calls — mock the Supabase client where a component or function reads from it.
- **E2E tests (Playwright):** live in `e2e/`, run against `npm run dev` per `playwright.config.ts`, target the `iphone-15` device profile (mobile-first product, per `docs/BRIEF.md`). Use for full flows: membership request submission, magic-link login redirect, RSVP click-through, garage car add.

## MUST-COVER Test Categories (A-H)

Adapted for this app — apply the categories that fit the surface being tested:

| Cat | Name | Given | Expect |
|-----|------|-------|--------|
| A | Happy path | Valid inputs, normal conditions | Correct output |
| B | Input validation | Empty/null/malformed Zod input | Validation error, no side effects |
| C | Idempotency | Duplicate form submit, double-click RSVP | No duplicate rows, safe replay |
| D | RLS / authorization | Anonymous or wrong-owner request | Denied, no data leak (see `.claude/rules/security.md`) |
| E | Failure modes | Supabase/Resend/Luma call fails or times out | Graceful degradation, user-visible error state |
| F | Observability | A path that logs an error | No PII in the log line |
| G | Auth | Missing/expired session hitting a member-only route | Redirect/401, not silent pass-through |

Not every category applies to every function — a pure formatting helper has no D/E/F/G. Apply what's relevant; don't pad tests to hit letters that don't fit.

## Touch-It-Test-It Policy

| File status | Requirement |
|---|---|
| New `src/lib/` function or Zod schema | Full A/B (+ C/D/E/G if applicable) before merge |
| Modified file with no existing tests | Add A-typical + B (one invalid input) before the change ships |
| Unmodified file | No requirement. Note for future coverage if genuinely risky. |

## Test Type Requirements

| Code Type | Required Test Type | Why |
|-----------|-------------------|-----|
| Zod schema | Unit (vitest) | Pure, deterministic |
| `src/lib/rsvp/provider.ts` | Unit (vitest) | Pure switch logic, no I/O |
| Route Handler / Server Action touching Supabase | Unit with mocked Supabase client, at minimum | Real RLS behavior needs a live project — see Circular Validation Warning |
| React Client Component with state/effects | Unit (RTL-style) — cleanup on unmount, no dangling listeners | Prevent memory leaks |
| Full user flow (signup → approval → login → RSVP) | Playwright e2e, iPhone 15 viewport | This is a mobile-first product; desktop-only testing misses real usage |
| Styling changes | No test requirement, but must use CSS custom property tokens (`var(--*)`) per README's design system section | Design system consistency |

## Test Cleanup

See `.claude/rules/test-cleanup.md` for Supabase test-data hygiene rules.
