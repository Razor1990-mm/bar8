---
name: audit
description: Run full audit on current branch changes
model: sonnet
---

Run a comprehensive audit on **current branch/sprint changes** combining security, CLAUDE.md review, and cost checks.

**Usage:** `/audit`

For full codebase scan, use `/audit-full`.

## Scope

Scans files changed on current branch using merge-base vs `BASE_REF` (default `origin/main`, fallback `main`) plus current working-tree changes:
- `git diff --name-only "$MERGE_BASE"..HEAD` + unstaged/staged/untracked union
- Filters to code files (`.ts`, `.tsx`, `.js`, `.jsx`)

## What It Runs

1. **RLS Scoping** - Supabase queries rely on RLS policies scoped by `auth.uid()`; flag any query path that bypasses RLS via the service-role client without justification (P0 security)
2. **Security** - Auth, injection, secrets, data exposure
3. **Review** - CLAUDE.md compliance (domain boundary, idempotency, tests)
4. **Cost** - Resource limits, timeouts, unbounded operations
5. **Code Hygiene** - Hardcoded values, `as any` usage, edge case coverage
6. **Scope Adherence** - Changed files match the spec's `Files Touched` table; sacred-test mods pre-authorized

### Code Hygiene Checks

**Hardcoded values:**
- Magic numbers > 1 outside const/type definitions
- Raw string literals matching status patterns (`"PENDING"`, `"APPROVED"`)
- Hardcoded timeouts (raw `5000` instead of `TIMEOUT_MS`)
- Hardcoded URLs/paths that should be env vars

**Type safety:**
- `as any` usage without justifying comment
- Type assertions (`as SomeType`) without null check
- Implicit `any` from untyped imports

**Edge case indicators:**
- Functions handling arrays with no empty-array test
- Nullable params with no null-handling test
- Numeric inputs with no boundary test (0, negative, max)

### Scope Adherence Checks

The active spec's `## Files Touched` section lists every authorized file. Any changed file outside that list is a scope violation. Sacred-test modifications outside the spec's `Sacred tests` exception list are P0 — silently editing tests is exactly how spec drift hides.

**What it catches:**
- Out-of-scope new files (e.g., a "natural shared-types companion" added without spec authorization)
- Sacred-test files modified without pre-authorization in spec's `Sacred tests` section
- Cross-spec drift (changes to files belonging to a different sprint slice)

**Severity rules:**
- File not in spec's `Files Touched` table AND is a test file (`__tests__/` or `.test.*`) → **P0 SACRED_TEST_UNAUTHORIZED**
- File not in spec's `Files Touched` table AND is anything else → **P1 OUT_OF_SCOPE**
- The spec file itself is always allowed (DISCOVERY entries, status bumps)
- `package.json` / `package-lock.json` are exempt (routine dep bumps)

**Resolution paths (printed in violation output):**
- (a) Add the file to spec § Files Touched and commit the spec change
- (b) Add a `[DISCOVERY]` entry to spec section 14 with rationale (per `.claude/rules/workflow.md` § Mid-flight discovery)
- (c) For sacred tests: requires founder authorization in spec § Sacred tests

## Process

1. Get changed files on branch using merge-base (`BASE_REF` default `origin/main`, fallback `main`) + unstaged/staged/untracked union
2. Filter to code files (exclude docs, configs, tests)
3. **If `supabase/migrations/*.sql` changed**: confirm RLS policies were added/updated alongside any new table (P0 — a table with no RLS policy is a data leak)
4. Run `/security` checklist on changed files
5. Run `/review` checklist on changed files
6. Run cost checklist on changed files (resource limits, timeouts, unbounded operations)
7. Run Code Hygiene checks on changed files
8. Aggregate and deduplicate findings
9. Sort by severity

## Output Format

```
## Audit Results (Branch: feature/xyz)

### Files Scanned
- src/lib/dashboard.ts
- src/app/api/dashboard/route.ts
- src/components/Dashboard.tsx

### Summary
| Category | Pass | Fail | Warn |
|----------|------|------|------|
| RLS Scoping | 5 | 0 | 0 |
| Security | 12   | 1    | 2    |
| Review   | 8    | 0    | 1    |
| Cost     | 10   | 2    | 0    |
| Code Hygiene | 6 | 1 | 2 |
| Scope Adherence | 22 | 3 | 0 |

### BLOCKING (must fix before merge)

**[Security] Missing auth check** (HIGH)
  File: src/app/api/tools/route.ts:45
  Fix: Add auth check via Supabase server client / middleware

**[Cost] Unbounded loop** (HIGH)
  File: src/lib/sync.ts:89
  Fix: Add iteration limit

**[Scope] Sacred test modified without authorization** (P0)
  File: src/components/__tests__/CommandPalette.test.tsx
  Spec: specs/sprint-35a1.1-notices-ui.md
  Fix: Add to spec § Sacred tests with founder authorization, OR revert the test edit

**[Scope] Out-of-scope file added** (P1)
  File: src/lib/noticeTypes.ts
  Spec: specs/sprint-35a1.1-notices-ui.md
  Fix: Add to spec § Files Touched, OR add [DISCOVERY] entry to spec section 14, OR move the change to a follow-up PR

### WARNINGS (should fix)

**[Review] Missing test coverage**
  File: src/lib/triage.ts
  Fix: Add test for edge case X

**[Security] Consider rate limiting**
  Endpoint: /api/webhooks/inbound

**[Code Hygiene] `as any` without justification**
  File: src/lib/jobs.ts:42
  Fix: Add type annotation or justifying comment

**[Code Hygiene] Hardcoded timeout**
  File: src/lib/sync.ts:15
  Fix: Extract to named constant (e.g., `SYNC_TIMEOUT_MS`)

### PASSED
- [Security] Auth required on all API routes
- [Security] Supabase parameterized queries used (no raw SQL)
- [Review] Domain boundary respected
- [Review] Idempotency patterns correct
- [Cost] Pagination limits enforced
- [Code Hygiene] No magic numbers in domain logic
- [Code Hygiene] Status values use typed enums
- [Cost] Timeouts configured on external calls
```

## When to Run

- Before creating PRs
- End of sprint
- After major refactors

## Important: Audit vs. Proof Gates

**`/audit` is a review checklist, not a replacement for proof gates:**
- ✅ Run `/audit` to catch issues before PR
- ❌ Do NOT skip proof gates (lint, typecheck, test, test:e2e)
- ❌ Do NOT skip TDD proof checkpoint (RED → GREEN output)

**Why both are needed:**
- Proof gates verify code actually works (tests pass, types check)
- `/audit` reviews code quality and identifies risks
- TDD proof checkpoint prevents "complicit tests"

**Workflow:**
1. Write tests first (TDD RED phase)
2. Implement feature (TDD GREEN phase)
3. Run proof gates (lint, typecheck, test)
4. Run `/audit` (review + security + cost)
5. Create PR with proof output + audit results
