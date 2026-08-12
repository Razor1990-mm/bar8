---
name: tdd-workflow
description: TDD workflow - write failing tests (RED phase only)
model: opus
---

Enforce RED-first TDD by writing failing tests before any production code is touched. This skill handles the RED phase only — it does NOT write production code.

## Usage

```
/tdd-workflow src/lib/knowledge.ts
/tdd-workflow "document chunking"
/tdd-workflow src/lib/knowledge.ts::processDocument
```

- Accepts a file path, a description, or a `file::function` target.
- RED phase only. Does NOT write production code.
- Does NOT modify existing tests. Existing `it()` blocks are sacred.

---

## 1. Pre-flight Checks (BLOCKING)

Before writing any tests, check whether production code for the target feature already exists.

### If input is a description (not a file path):
- Resolve to a concrete file path by searching the codebase. If ambiguous, ask the user.

### If production code already exists:
Check whether the specific functions/behavior being tested are already implemented (not just whether the file exists — new functions in an existing file are fine).

**If the target behavior is already implemented**, STOP and present:

```
BLOCKER: Production code already exists for this target.

Options:
1. PROCEED — I'm testing NEW behavior (delta) in this file, not the existing code
2. REVERT — I wrote code first by mistake. I'll revert, then re-run /tdd-workflow
3. USE /test-gen — I need retroactive tests for existing code (not TDD)
```

Wait for the user to choose before continuing.

### If production code does NOT exist (or user chose PROCEED):
Continue to Section 2.

---

## 2. Test Plan (invoke /test-gen)

Invoke `/test-gen <target>` via the Skill tool to get:
- Type detection (LIB_UNIT_TEST, ROUTE_HANDLER_TEST, etc.)
- Test file location
- Run command
- MUST-COVER test plan

Then apply the **Test Depth Checklist** (see Section 7 below) to filter applicable categories. Output a checklist:

```
Test Depth Checklist:
[x] A-MIN  — Minimal valid input
[x] A-TYP  — Typical input
[x] A-SIDE — Side-effect verification (any DB writes, events)
[x] A-RETURN — Return shape contract
[x] B      — Invalid input (missing required fields, malformed input)
[ ] A-MAX  — N/A (no numeric/array params)
[x] C-DUP  — Idempotency (unique-constraint handling present)
[ ] D-PARALLEL — N/A (no conditional-update guard)
[x] E-DOWNSTREAM — External API call present
[ ] G-AUTH — N/A (lib function, not route)
[x] G-RLS  — RLS scoping (auth.uid()-scoped queries)
```

Each `[ ]` must have a justification for why it's N/A.

---

## 3. Write Test File

Write complete test bodies with real assertions. Follow these rules:

### Structure
- Use `[CAT-ID]` label convention in `it()` descriptions: `it("[A-MIN] creates with minimal input", ...)`
- Import from the production file path even if it doesn't exist yet (this is intentional — causes RED)
- Group tests in a `describe` block named after the target function or feature

### Patterns
- Follow existing patterns from reference files listed in `/test-gen` output
- For tests that touch a real Supabase project, use the cleanup helpers documented in `.claude/rules/testing.md`, never ad-hoc row deletes
- Use existing test helpers/fixtures under `src/lib` where applicable

### Existing test files
- If a test file already exists with existing tests: **append** a new `describe` block
- NEVER modify existing `it()` blocks — they are sacred

### What NOT to write
- No `it.todo()` stubs — write complete test bodies with real assertions
- No placeholder assertions — assert exact values (see Failure Modes below)
- No production code — only test code

### Failure Modes (recurring mistakes — check every test you write)

**Shape-only assertions (P0 — 42% of mutations survive these):**
NEVER use `toBeDefined()`, `toBeTruthy()`, `toHaveProperty("key")`, or `typeof x === "string"` as the final assertion. These pass for ANY value and catch zero logic bugs.

```typescript
// BAD — passes even if status is "REJECTED" instead of "APPROVED"
expect(result.status).toBeDefined();
expect(result).toHaveProperty("status");

// GOOD — catches the actual bug
expect(result.status).toBe("APPROVED");
expect(result.lineItems).toHaveLength(3);
expect(result.total).toBe(1500);
```

**Rule:** Every `expect()` must assert a specific value, length, or error type. If you can't name the expected value, you don't understand the requirement well enough to write the test.

**Tests that mirror implementation (circular validation):**
If your test setup constructs the expected output the same way the production code does, the test proves nothing. Tests must assert against independently-derived expected values (from the spec, from business rules, from manual calculation).

**Missing side-effect assertions:**
Testing only the return value and ignoring DB writes, audit/event records, or related record updates. A function can return the right thing while writing the wrong side effects. Always check both.

---

## 4. Run Tests — Capture RED Proof

Run the tests using the appropriate command:

```bash
# Unit / component tests
npx vitest run --reporter=verbose <test-file>

# Full suite
npm test

# E2e tests (Playwright)
npm run test:e2e
```

### Valid RED (expected — proceed to output):
- Module not found (production file doesn't exist yet)
- Function not exported / not a function
- Assertion failures (function exists but returns wrong values)

### Invalid RED (fix and re-run):
- Syntax errors in the test file itself
- Import typos (wrong path for test helpers, etc.)
- All tests pass (means production code already implements this — go back to pre-flight)

Fix any invalid RED issues and re-run until you get a valid RED result.

---

## 5. Write Marker + Output

### Write `.tdd-red-phase` marker file in project root:

```
tdd-red-phase
timestamp: <ISO 8601>
target: <production file path>
test-file: <test file path>
test-count: <number of test cases written>
categories: A-MIN,A-TYP,A-SIDE,...
```

### Output RED PROOF block:

Paste the full test output showing failures. Do not summarize.

```
RED PROOF:
──────────
<full test runner output with failures>
──────────
```

### Output GREEN PHASE handoff:

```
GREEN PHASE — Handoff Instructions
───────────────────────────────────
Target file: <production file path>
Test file:   <test file path>
Run command: <exact command to run tests>

Rules:
- Do NOT modify the test file
- Do NOT add new tests
- Write minimal code to make all <N> tests green
- Run the test command above to verify GREEN
```

---

## 6. Pipeline Integration

This skill fits into the TDD pipeline as follows:

```
/tdd-workflow (RED) → writes tests + .tdd-red-phase marker
      |
      v
write production code (GREEN) — make tests pass
      |
      v
/commit → git hook runs lint + typecheck + affected tests
      |
      v
/pr → automated review-fix loop (when ready for PR)
```

The `.tdd-red-phase` marker records that TDD was followed for the current feature.

---

## 7. Test Sub-Pattern Reference

### A: Happy Path Sub-Patterns

Every lib function must cover at least A-MIN + A-TYP + A-SIDE + A-RETURN:

| ID | Sub-Pattern | Description |
|----|-------------|-------------|
| A-MIN | Minimal valid input | Smallest payload that should succeed (1 item, zero amount, shortest string). For 1-2 param functions, A-MIN and A-TYP may be the same test. |
| A-TYP | Typical input | Representative real-world payload |
| A-MAX | Maximal valid input | Largest valid payload (max items, large amounts). Required when function accepts numeric or array inputs. |
| A-SIDE | Side-effect verification | Verify ALL side effects: DB writes, audit/event records, related records updated. Not just the return value. |
| A-RETURN | Return shape contract | Assert exact return shape (`result.status === "APPROVED"`), never just `toBeDefined()` |

### B: Input Validation Sub-Patterns

| ID | Sub-Pattern | When Required |
|----|-------------|---------------|
| B-ENUM | Enum coverage | Function accepts enum param -> test at least 2 valid values + 1 invalid string |
| B-BOUNDS | Numeric boundaries | Function accepts number -> test 0, boundary value, boundary+1. Full set (also -1, MAX_SAFE_INTEGER) for pricing/scheduling logic. |
| B-STRING | String edge cases | Function accepts string -> test empty, whitespace-only, max-length if defined |

### D: Concurrency Sub-Patterns

| ID | Pattern | Test Shape | When Required |
|----|---------|------------|---------------|
| D-PARALLEL | Two identical calls | `Promise.all([fn(args), fn(args)])` -> both resolve, same ID, exactly 1 write | Function has unique-constraint (upsert-on-conflict) handling |
| D-TXISO | Multi-step rollback | Make step N fail inside a multi-step write -> verify steps 1..N-1 NOT persisted (Supabase RPC transactions, or manual compensating rollback if using sequential `.insert()`/`.update()` calls) | Function does multi-step DB writes |
| D-CAS | Compare-and-swap | Call fn, then call again with stale state -> expect a typed conflict error | Function uses a conditional `update` with a state guard in `.match()`/`.eq()` |

**D-PARALLEL template:**
```typescript
it("[D-PARALLEL] concurrent calls produce exactly one record", async () => {
  const [r1, r2] = await Promise.all([
    createOrFetch({ userId, key }),
    createOrFetch({ userId, key }),
  ]);
  expect(r1.id).toBe(r2.id); // Same record
  const { count } = await supabase.from("events").select("*", { count: "exact", head: true }).eq("entity_id", r1.id);
  expect(count).toBe(1); // No duplicate side effects
});
```

**D-TXISO template:**
```typescript
it("[D-TXISO] rolls back all writes when step fails mid-transaction", async () => {
  await expect(fnWithMultiStepWrite(inputThatFailsAtStep2)).rejects.toThrow();
  const { count } = await supabase.from("entities").select("*", { count: "exact", head: true }).match({ ... });
  expect(count).toBe(0); // Step 1 writes rolled back
});
```

### E: Failure Mode Sub-Patterns

**"Safe state" defined by code type:**

| Code Type | Error Type | Safe State | Test Assertion |
|-----------|-----------|-----------|----------------|
| Webhook/API route handler | Known-bad input | Returns 4xx + logs warning + no state mutation | `expect(res.status).toBe(4xx)` + body contains error message |
| Webhook/API route handler | Unexpected error | Returns 500 + generic message (safe to retry) | `expect(res.status).toBe(500)` + body contains no internals |
| Lib function | Any error | Throws a typed error (never generic Error) | `rejects.toThrow(SpecificError)` |
| Lib function with DB | Any error | Throws typed error + no partial writes | Same + verify zero new records |
| External API caller | Downstream failure | Throws typed error or returns failure result + no runaway retries | `result.success === false` + retry count capped |
| State machine transition | Invalid transition | Stays at current state | Entity state unchanged after failure |

| ID | Sub-Pattern | When Required |
|----|-------------|---------------|
| E-DOWNSTREAM | Mock external dependency to throw/timeout, verify safe state | Function calls another service or external API |
| E-TIMEOUT | Abort AbortController mid-execution, verify clean exit | Function uses AbortController or `callWithRetry` |
| E-EXHAUSTED | Max retries exceeded, verify clear error (not hang) | Function has retry logic |
| E-LEAK | Error response contains no internals | Function returns error responses to external callers |

### F: Observability Sub-Patterns

| ID | Sub-Pattern | Assertion |
|----|-------------|-----------|
| F-EVENT | Event/audit record written with required fields, if the domain has one | `expect.objectContaining({ userId, entityType, entityId, eventType })` |
| F-NO-PII | No PII in payloads or logs | Include canary values in input (phone: "+15550001234", address: "123 Test St", name: "Jane Canary"). Verify none appear in any persisted payload OR console output (spy on console). |
| F-CORR | Correlation ID propagated | If function accepts a correlation/idempotency key, verify it reaches the persisted record |

### G-AUTH: Fail-Closed Auth Sub-Patterns

| ID | Pattern | Expected |
|----|---------|----------|
| G-AUTH-1 | Missing credentials entirely | 401 (not 500, not silent bypass) |
| G-AUTH-2 | Invalid/malformed credentials | 401 or 403 |
| G-AUTH-3 | Missing config env var | 500 (config error, fail-closed) |
| G-AUTH-4 | Expired credentials | 401 |

### G-RLS: RLS Scoping Sub-Patterns

For endpoints/functions touching user-scoped tables, **at least 2 required** from:

| ID | Pattern | Expected |
|----|---------|----------|
| G-RLS-1 | Cross-user READ | 404/empty, no existence leak (RLS denies the row) |
| G-RLS-2 | Cross-user LIST | Returns only the requesting user's own records |
| G-RLS-3 | Cross-user MUTATION | 404/denied, no state change |
| G-RLS-4 | Response verification | response's owner field matches the authenticated user |

Per `.claude/rules/testing.md` § Circular Validation Warning: a mocked Supabase client passing these does not prove the real RLS policy enforces it — prefer a real Supabase project for RLS-critical cases.

### Test Depth Checklist (RED Phase Gate)

Before handing off to GREEN, verify applicable items are covered:

**Mandatory (every domain function):**
- [ ] A-MIN: Minimal valid input tested
- [ ] A-TYP: Typical input tested
- [ ] A-SIDE: All side effects verified (Events, AuditLogs, related records)
- [ ] A-RETURN: Exact return shape asserted (no `toBeDefined()`)
- [ ] B: At least one invalid input per required parameter

**Conditional (check if applicable):**
- [ ] A-MAX: Maximal valid input (if numeric/array params exist)
- [ ] B-ENUM: 2 valid + 1 invalid (if enum params exist)
- [ ] B-BOUNDS: 0, boundary, boundary+1 (if numeric params with thresholds)
- [ ] C-DUP: Duplicate call idempotency (if unique-constraint handling exists)
- [ ] D-PARALLEL: Promise.all race (if unique-constraint or conditional-update guard exists)
- [ ] D-TXISO: Multi-step rollback (if the function does multi-step DB writes)
- [ ] E-DOWNSTREAM: External dependency failure (if external calls made)
- [ ] E-TIMEOUT: AbortController abort (if AbortController used)
- [ ] E-LEAK: Error response sanitized (if function returns errors to external callers)
- [ ] F-NO-PII: Canary string PII check (if function writes to a DB table or logs)
- [ ] G-RLS: At least 2 of G-RLS-1/2/3/4 (if function queries a user-scoped table)
- [ ] G-AUTH: Fail-closed auth (if function is behind route auth)

**Label convention:** Use `[CAT-ID]` prefix in `it()` descriptions for grepability.
