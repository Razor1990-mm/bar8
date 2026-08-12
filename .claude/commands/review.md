---
name: review
description: Consolidated PR review — completeness, compliance, adversarial, AI-smell detection
model: sonnet
---

Run a comprehensive review on current branch changes. Combines completeness checks, CLAUDE.md compliance, adversarial code review, and AI-smell detection into one pass.

**Usage:** `/review` or `/review path/to/file.ts`

## Process

1. **Identify changes**: Build changed-file set using merge-base against `BASE_REF` (default `origin/main`, fallback `main`) including branch commits + unstaged/staged + untracked files. If a specific file is provided, review that file only.
2. **Read every changed file fully** (not just diffs) — understand full context
3. **Run all checks below** against each file
4. **Produce findings + verdict**

---

## Checklist 0: Spec Adherence

If a spec file exists in `specs/` for this work:
1. Read the spec file
2. For each requirement/acceptance criterion in the spec:
   - [ ] Is there code that implements it? (cite file:function)
   - [ ] Is there a test that verifies it? (cite file:test-name)
3. For each constraint listed in the spec (tenancy, idempotency, CAS, security):
   - [ ] Is the constraint actually enforced in the implementation?
4. Check for drift:
   - [ ] No requirements silently dropped
   - [ ] No out-of-scope work added that isn't in the spec
   - [ ] "Out of scope" items from the spec are NOT implemented (scope discipline)

**Output a traceability table:**
```
| # | Spec Requirement | Implemented (file:fn) | Tested (file:case) | Status |
```

If no spec file exists, note "No spec found — skipping adherence check" and proceed.

## Checklist 1: Completeness

- [ ] Every new/modified `src/lib/**` file has a corresponding colocated test file (`*.test.ts`)
- [ ] New behavior has tests (happy path + at least 1 error/edge case)
- [ ] Manual verification steps documented (which route/page, expected behavior, expected failure)
- [ ] If a `supabase/migrations/*.sql` file was added: RLS policies added for any new table, migration applies cleanly
- [ ] TDD ordering followed (tests written before implementation — check commit history if available)

## Checklist 2: CLAUDE.md Compliance

### Domain Boundary
- [ ] Supabase client usage lives in `src/lib/**` (or route handlers under `src/app/api/**`), not scattered into UI components
- [ ] Route handlers are thin — no business logic, no direct DB writes bypassing `src/lib`
- [ ] New capabilities expressed as `src/lib` functions first

### RLS / Data Access
- [ ] Every query relies on RLS scoped by `auth.uid()` (never fetch another user's row by ID alone without an RLS-equivalent check)
- [ ] Any use of the Supabase service-role client (which bypasses RLS) is explicitly justified

### Idempotency
- [ ] Unique constraints on natural keys where needed
- [ ] Unique-constraint violations caught and handled (re-fetch existing instead of crash)
- [ ] Safe under webhook/form-submission retries

### Concurrency
- [ ] Conditional updates check the affected row count before assuming success
- [ ] Any audit/event writes ordered AFTER the operation they describe

### Authentication
- [ ] Correct auth method per endpoint type (bearer/twilio-sig/cloudflare-jwt)
- [ ] Missing auth returns 401/403, not silent bypass
- [ ] Middleware order matches the table in CLAUDE.md

### Logging & PII
- [ ] No secrets logged (auth headers, tokens, full phone numbers)
- [ ] Correlation IDs included (callSid, jobId)
- [ ] Failures have enough context to debug

## Checklist 3: Adversarial (Grill Posture)

For each changed file, ask:
- **Correctness:** What if X is null? What if Y times out? What if Z is called twice?
- **Design:** Why this pattern? What's the simpler alternative?
- **Completeness:** What edge cases are missing? What errors aren't handled?
- **Concurrency:** What if two requests hit this simultaneously?
- **Crash recovery:** What state is left if this fails mid-operation?
- **Network failure:** What if the external API is down?

**Demand proof.** "It works" isn't enough — show the test. If a claim can't be backed by a test, flag it.

## Checklist 4: AI-Smell Detection

### Circular validation (P0)
- Tests that call the same helper functions used in implementation
- Test assertions that mirror implementation logic rather than testing behavior
- Mock setups that encode implementation assumptions
- All tests pass but no negative/failure cases exist

### Silent error swallowing (P0)
- Empty catch blocks
- `catch (e) { return null }` without logging
- Errors caught and converted to success responses
- Missing error propagation in async chains

### Missing negative tests (P1)
- Happy path tested but no error/rejection paths
- No tests for invalid input, missing auth, wrong tenant
- No tests for duplicate/retry scenarios on webhook handlers

### CAS pattern compliance (P1)
- `updateMany` calls without count checks
- State transitions without optimistic concurrency

### Inline cleanup anti-pattern (P1)
- Test files with inline `deleteMany` chains instead of `cleanupTenantData()`
- Inline cleanup with wrong FK ordering

### Over-engineering (P2)
- Abstractions wrapping single-use functions
- Factory/strategy patterns for 1-2 variants
- Generic type parameters used in only one place

### Code hygiene (P2)
- Unused imports, unused variables
- Dead code, commented-out code
- Console.log in production code

---

## Output Format

```
## Review Results (Branch: <branch>)

### Files Reviewed
- <file list with line counts>

### Findings

**P0 — BLOCKING (must fix before merge)**
- [P0] [Category] Description
  File: path/to/file.ts:line
  Fix: Concrete, specific action (MANDATORY on every P0)

**P1 — WARNING (should fix)**
- [P1] [Category] Description
  File: path/to/file.ts:line
  Fix: Concrete, specific action (MANDATORY on every P1)

**P2 — SUGGESTION (nice to have)**
- [P2] [Category] Description
  File: path/to/file.ts:line (if applicable)

### Adversarial Challenges (prove these work)
- [C1] `file.ts:42` — How does this handle concurrent calls?
- [C2] `file.ts:87` — What if the API returns 500?

### VERDICT: SHIP / FIX FIRST / RETHINK

**SHIP** — No P0s, no P1s, adversarial challenges answered by tests.
**FIX FIRST** — P0s or P1s found. Fix and re-run.
**RETHINK** — Fundamental design issues. Step back.

P0: N | P1: N | P2: N | Challenges: N
```

## Failure Modes (recurring mistakes — check yourself during every review)

**Overconfidence in "tests pass":**
"Tests pass" is not the same as "this works." The pipeline has real blind spots: tests can pass without verifying behavior (coverage != correctness), runtime data shapes are unvalidated (TypeScript types vanish at runtime), and there are no integration/smoke tests. When reviewing, be skeptical of claims backed only by passing tests — look at what the tests actually assert.

**Rubber-stamping AI-generated code:**
AI-written code systematically misses boundary conditions, off-by-one errors, and edge cases in threshold logic. The mutation testing data proves this: ~45% of mutations in domain business logic survive Claude's TDD tests. Review with the assumption that boundary logic is probably wrong until proven otherwise.

---

## Verdict Criteria

- **SHIP**: Zero P0, zero P1, all adversarial challenges have test coverage
- **FIX FIRST**: Any P0, or 2+ P1s, or adversarial challenge with no test
- **RETHINK**: 3+ P0s, or fundamental design violation (wrong auth, missing RLS coverage, no tests)

## Fix Line Requirement

**Every P0 and P1 finding MUST include a `Fix:` line** with a concrete, specific action. This enables the `/pr` automated review-fix loop to classify findings for auto-fix vs user intervention.

- Good: `Fix: Add RLS-scoped filter — query via the user's session client instead of the service-role client`
- Good: `Fix: Check the affected row count before assuming the update succeeded, throw NotFoundError otherwise`
- Bad: `Fix: Handle this properly` (too vague — /pr will classify as ASK_USER)
- Bad: (no Fix: line at all — /pr will classify as ASK_USER)

Findings without a concrete `Fix:` line are treated as ambiguous by `/pr` and routed to the user for manual resolution.
