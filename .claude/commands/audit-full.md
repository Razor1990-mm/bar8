---
name: audit-full
description: Run full audit on entire codebase
model: sonnet
---

Run a comprehensive audit on the **entire codebase** combining security, CLAUDE.md review, and cost checks.

**Usage:** `/audit-full`

For branch-only changes, use `/audit`.

## Scope

Scans all code files in the repository:
- `src/lib/**/*.ts`
- `src/app/**/*.{ts,tsx}`
- `src/components/**/*.{ts,tsx}`

**Excludes:**
- `node_modules/`
- `dist/`, `build/`
- `**/__tests__/**`
- `*.test.ts`, `*.spec.ts`

## What It Runs

1. **RLS Scoping** - Supabase queries rely on RLS policies scoped by `auth.uid()`; flag any service-role bypass without justification (P0 security)
2. **Security** - Auth, injection, secrets, data exposure
3. **Review** - CLAUDE.md compliance (domain boundary, idempotency, tests)
4. **Cost** - Resource limits, timeouts, unbounded operations

## Process

1. Glob all code files (excluding tests, build artifacts)
2. Identify active sprint doc from `docs/sprints/`
3. Launch sub-audits **in parallel** using the Task tool:
   - Agent 1: RLS/Supabase scoping check on all `src/lib` and `src/app/api` files (P0)
   - Agent 2: `/security` checklist on all files
   - Agent 3: `/review` checklist on all files
   - Agent 4: Cost checklist on all files (resource limits, timeouts, unbounded operations)
4. Collect results from all agents
5. Aggregate and deduplicate findings
6. Sort by severity (P0 RLS first, then blocking, then warnings)

## Output Format

```
## Full Codebase Audit

### Coverage
- lib: 45 files
- app: 12 files
- components: 23 files
- Total: 80 files

### Summary
| Category | Pass | Fail | Warn |
|----------|------|------|------|
| RLS Scoping | 12 | 0 | 0 |
| Security | 35   | 2    | 5    |
| Review   | 28   | 1    | 3    |
| Cost     | 22   | 3    | 2    |
| Sprint   | 4    | 1    | 2    |

### BLOCKING (must fix)

**[Security] Missing auth check** (HIGH)
  File: src/app/api/admin/route.ts:45
  Fix: Add auth check via Supabase server client

**[Cost] No timeout on external call** (HIGH)
  File: src/lib/resend/client.ts:89
  Fix: Add AbortController with 30s timeout

### WARNINGS (should fix)

**[Review] Supabase client used outside lib layer** (MEDIUM)
  File: src/app/api/reports/utils.ts:12
  Fix: Move to `src/lib` or use a shared lib function

**[Cost] No MAX_LIMIT on pagination** (MEDIUM)
  File: src/app/api/reports/route.ts:34
  Fix: Add MAX_LIMIT constant and enforce

### PASSED (sample)
- [Security] Auth required on all API routes
- [Security] RLS policies enforced on all tables
- [Review] Domain boundary respected in 43/45 files
- [Cost] Database queries bounded in 20/22 files
```

## When to Run

- Before major releases
- After large refactors
- Quarterly health check
- When onboarding to understand codebase state
