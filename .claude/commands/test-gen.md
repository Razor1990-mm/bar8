---
name: test-gen
description: Generate tests for a function or module
model: sonnet
---

Generate tests that match existing project patterns (vitest unit + Playwright e2e) and support strict TDD (RED → GREEN proof). Canonical testing rules — mutation-resistant assertions, RLS circular-validation warning, cleanup patterns — live in `.claude/rules/testing.md`; this skill applies them, it does not restate them.

## Usage (only supported modes)

- Single file:
  - `/test-gen src/lib/jobs.ts`
  - `/test-gen src/components/Dashboard.tsx`
- Explicit multi-file list (recommended for multi-file slices):
  - `/test-gen --files src/lib/jobs.ts,src/lib/executor.ts` (comma-separated, no spaces)

**Non-goals (intentionally removed):**
- No sprint doc parsing (deliverable/slice IDs)
- No "auto-find the active sprint doc"
- No huge multi-page example outputs

## Output requirements (what the skill should produce)

For each input file (or each file in `--files`):
- **Detected type**: one of the types below (lib/route/component)
- **Suggested test location**: repo-relative path (colocated `*.test.ts` next to the source, per vitest convention)
- **Run command**: `npm test` (vitest) or `npm run test:e2e` (Playwright) as appropriate
- **Test plan**: MUST-COVER + any key COMPREHENSIVE cases
- **Starter scaffold**: minimal (keep it small; outline more cases instead of dumping 500+ LOC)

### Guardrails (to prevent overbake)

- Prefer **test-plan bullets** over large generated code.
- If the scaffold would be long, emit a **short stub** + a checklist of additional tests.
- Multi-file mode should output:
  - A **unified test plan** first
  - Then **per-file** sections
- Do not invent new dependencies; use existing Vitest/RTL/Playwright patterns already in the repo.
- Follow `.claude/rules/testing.md` for assertion style — do not generate shape-only assertions (`toBeDefined()`, `toBeTruthy()`, bare `toHaveProperty`).

## Type detection (path-based)

- `src/lib/**` → **LIB_UNIT_TEST** (vitest)
- `src/app/api/**` → **ROUTE_HANDLER_TEST** (vitest, mock the Supabase client; check auth requirements per the route)
- `src/components/**` → **COMPONENT_TEST** (vitest + React Testing Library)
- `src/app/**/page.tsx` or user-facing flows → also consider a **Playwright e2e spec** under `e2e/`

## Test placement matrix (canonical)

- Lib unit tests: `src/lib/[module].test.ts` (colocated)
- Route handler tests: `src/app/api/[route]/route.test.ts` (colocated)
- Component tests: `src/components/[Component].test.tsx` (colocated)
- E2e specs: `e2e/[flow].spec.ts` (Playwright, requires `npm run test:e2e`)

## MUST-COVER checklist (default)

Every `/test-gen` output should include these categories unless explicitly N/A:

- **Happy path**: core behavior works
- **Input validation**: missing/invalid inputs are rejected safely (Zod schema errors asserted with content, not just "throws")
- **Failure modes**: downstream errors/timeouts handled safely (no crashes)
- **Idempotency/retry safety**: when relevant (webhooks, form resubmission, unique-constraint conflicts)
- **RLS / access control**: when relevant, note that mocked-client tests only prove internal consistency — see `.claude/rules/testing.md` § Circular Validation Warning for when a real Supabase project is needed instead
- **Security/PII**: no secrets/PII leaked (esp. logs)

## Failure Modes (recurring mistakes — check every generated test)

**Shape-only assertions (P0):**
NEVER generate `toBeDefined()`, `toBeTruthy()`, `toHaveProperty("key")`, or `typeof x === "string"` as the final assertion. These pass for ANY value and catch zero logic bugs. Full rule + examples: `.claude/rules/testing.md` § Mutation-Resistant Assertions.

**Missing negative/failure tests:**
Happy path only = false confidence. Every test plan must include at least 1 invalid input case and 1 downstream failure case per function.

---

## References (copy existing project patterns)

Use these as canonical examples (don't make up new styles) — locate the nearest existing test file of the same type via `find src -name "*.test.ts*"` and match its structure, mocking approach, and assertion style.
