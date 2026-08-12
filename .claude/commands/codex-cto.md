---
name: codex-cto
description: Codex CTO advisor — plan review + implementation review (plan adherence, test quality)
model: sonnet
---

Codex CTO advisor with two modes. Codex input is stdin-bundle: Claude reads the plan and the code it references, then bundles the raw file contents into Codex's prompt via stdin (doctrine locked 2026-07-08, harness audit T12).

**Usage:**
- `/codex-cto` or `/codex-cto <plan-path>` — **Plan review** (before implementation)
- `/codex-cto review` — **Implementation review** (after implementation, before pre-commit)

## Distinct Lenses (No Overlap)

| Checkpoint | Skill | Question |
|---|---|---|
| Plan phase | `/codex-cto` | Will this plan work given the real code? |
| Post-implementation | `/codex-cto review` | Did the implementation match the plan? Are tests thorough? |
| Pre-commit | `/codex-code-review` | Is this production-ready? (3am incident survival) |
| Pre-PR | `/codex-pr-review` | Is this strategically coherent? (7 dimensions) |

## Trust Model

**Doctrine (2026-07-08, harness audit T12):** codex input is stdin-bundle everywhere. Codex does not navigate the codebase or read from disk itself — `--json` hangs, and letting Codex wander the filesystem risks worktree contamination. Claude reads the plan file plus every file it references (and 1-level-deep imports/callers for integration context), and bundles the **raw, verbatim** file contents into the stdin payload under a `=== BUNDLED CONTENT ===` marker.

**Why this still preserves independence:** the risk this trust model guards against is Claude *editorializing* — summarizing, omitting, or reframing code so an independent reviewer never sees the real thing. Bundling raw file contents (not Claude's description or paraphrase of them) preserves that guarantee. Only the *transport* changed (stdin bundle vs. filesystem navigation) — not what bytes Codex ends up reviewing. Claude MUST bundle full file contents verbatim, never a summary.

---

## Mode 1: Plan Review (`/codex-cto` or `/codex-cto <path>`)

Runs alongside `/staff-review` before ExitPlanMode for non-trivial plans.

### Step 1: Find and Read the Plan

Look for the plan in:
1. Provided argument path
2. The plan file path from system-reminder (e.g., `/Users/.../.claude/plans/*.md`)
3. Most recent plan discussed in conversation

**Read the plan file.** Extract every file path it references (files to modify, files to create, test files), then read each of those files, plus key imports/callers (1 level deep) for integration context. If the plan touches the data model, also read the relevant `supabase/migrations/*.sql` files. Also read `.claude/templates/work-order.md` to check plan completeness against the work-order template. Skip `.env` files, `node_modules/`, and credential files. All of this becomes the bundle in Step 2 — Codex does not read from disk itself.

### Step 2: Bundle and Run Codex

```bash
{ cat <<'PROMPT'
You are the CTO advisor reviewing a plan BEFORE implementation begins. Your job is to validate feasibility, check file boundaries, verify invariant coverage, and find gaps. Everything you need is bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

PROJECT INVARIANTS (violations are P0):
- All database access MUST rely on Supabase RLS scoped by auth.uid(). Any use of the service-role client (which bypasses RLS) needs explicit justification.
- Idempotency: handle duplicate submissions/retries safely (e.g. upsert-on-conflict or existence checks before insert).
- Audit/event tables, if present, are append-only. Never UPDATE or DELETE.
- Auth is fail-closed. Missing credentials = 401/500, not silent bypass.
- Thin route handlers, fat lib — all business logic in src/lib/, route handlers in src/app/api/ stay thin.
- Lib functions accept an optional Supabase client parameter where transactional/test-injection matters.
- TDD required: RED phase (failing test) before GREEN phase (passing implementation).
- Existing tests are sacred — never modify to make code pass.

The bundle below contains: the plan file, every file it references, 1-level-deep imports/callers, and (if applicable) the relevant Supabase migration SQL and work-order template.

REVIEW FOCUS:
1. FEASIBILITY — Will this plan work given the actual code? Check assumptions against reality.
2. FILE BOUNDARIES — Does the plan list ALL files that need changing? Check callers, imports, tests. Flag missing or unnecessary files.
3. INVARIANT COVERAGE — For each invariant above, does the plan address it if applicable?
4. ACCEPTANCE CRITERIA — Are there testable invariant-style criteria (given/when/then)?
5. WORK ORDER COMPLETENESS — Does the plan cover required work-order sections?
6. HIDDEN ASSUMPTIONS — What does this plan take for granted that might not be true?
7. INTEGRATION RISKS — Does this play well with existing code? Check actual imports, types, and callers.
8. ALTERNATIVE APPROACHES — Is there a simpler way using what already exists in the code?

Respond in this EXACT format:

VERDICT: PROCEED | SIMPLIFY | RE-PLAN
CONFIDENCE: HIGH | MEDIUM | LOW

FEASIBILITY CONCERNS:
- [P0] <plan will fail because of X — cite specific file:line in existing code>
- [P1] <plan has risk Y — cite specific file:line>
- [P2] <plan could be simpler — cite existing code that already does Z>

FILE BOUNDARY VALIDATION:
- Files plan says to touch: <list from plan>
- Files that actually need touching (based on code reading): <list from analysis>
- Missing files: <any the plan forgot — cite callers/imports that reference planned changes>
- Unnecessary files: <any the plan lists but doesn't need>

INVARIANT COVERAGE CHECK:
- [ ] Multi-tenancy (org-scoping) — applicable? addressed in plan? Y/N
- [ ] Idempotency (P2002 pattern) — applicable? addressed? Y/N
- [ ] CAS pattern (updateMany count check) — applicable? addressed? Y/N
- [ ] Composite tenant FKs — new parent-child? addressed? Y/N
- [ ] Append-only audit trail — events/audit logs needed? addressed? Y/N
- [ ] Fail-closed auth — new endpoints? addressed? Y/N
- [ ] DbClient parameter — new domain functions? addressed? Y/N
- [ ] TDD — test plan included? RED/GREEN approach? Y/N

ACCEPTANCE CRITERIA GAPS:
- <invariant-style criteria the plan should include but doesn't>
- Format: "given X, when Y, then Z"

WORK ORDER COMPLETENESS:
- [ ] Context gathered (files explored, patterns found)
- [ ] Requirements numbered
- [ ] Must-cover invariants with test mappings
- [ ] Must-cover tests (categories A-H or justified N/A)
- [ ] Proof commands
- [ ] Files-you-may-touch matches actual needs
- Missing: <list any gaps>

HIDDEN ASSUMPTIONS:
- <assumption — and whether it's true based on the actual code>

ALTERNATIVE APPROACHES:
- <simpler alternative, if any, citing existing code>

For every finding, cite the specific file and line from the bundled content. Be concrete.
=== BUNDLED CONTENT ===
PROMPT
cat "<INSERT_PLAN_PATH>" <INSERT_REFERENCED_FILE_PATHS>; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-cto-output.txt" 2>&1
```

**Important:** Replace `<INSERT_PLAN_PATH>` and `<INSERT_REFERENCED_FILE_PATHS>` with the actual plan path and the space-separated list of files read in Step 1 before running. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — NEVER grep for verdict template strings from the top (false-fires on the prompt echo). macOS has no `timeout` command — do not wrap with `timeout`; rely on the caller's tool timeout.

Use a **240-second timeout** (longer than review skills — CTO analysis needs more time).

### Re-runs after SIMPLIFY/RE-PLAN

`--json` (and the session-resume flow it enabled) is banned under the stdin-bundle doctrine — `--json` hangs. There is no session resume anymore: when Codex returns SIMPLIFY or RE-PLAN and Claude revises the plan, re-run Step 2 fresh with the updated bundle (updated plan + updated/added referenced files). Bundles are cheap and self-contained, so a fresh run per revision is the norm, not a fallback.

### Step 3: Present Results

1. Show the **raw Codex output** unmodified
2. Add Claude's assessment: agree or disagree with each concern
3. If this is running alongside `/staff-review` and verdicts conflict, flag:
   ```
   DISAGREEMENT: /staff-review says <X>, /codex-cto says <Y>. Review both before proceeding.
   ```

## Output Format

```
### /codex-cto Result (Advisory)

**Plan Reviewed:** <plan file path>

**Raw Codex Output:**
<unmodified Codex response>

**Verdict:** PROCEED / SIMPLIFY / RE-PLAN / SKIPPED
**Confidence:** HIGH / MEDIUM / LOW

**Claude Assessment:**
- [Concern 1]: AGREE / DISAGREE — <1 sentence>
- [Concern 2]: AGREE / DISAGREE — <1 sentence>
...

**File Boundary Check:** PASS / GAPS FOUND
**Invariant Coverage:** COMPLETE / GAPS FOUND

Claude agrees with verdict: YES / NO — <1 sentence if disagreement>
```

## Failure Handling

| Failure | Output | Action |
|---------|--------|--------|
| Codex CLI not installed | "SKIPPED — Codex CLI not installed (npm install -g @openai/codex)" | Continue |
| Codex auth unavailable | "SKIPPED — Codex authentication unavailable (run `codex login`)" | Continue |
| Timeout (240s) | "SKIPPED — Codex API timeout (240s)" | Continue |
| No plan found | "SKIPPED — No plan file or text found" | Continue |
| Unexpected error | "SKIPPED — <error message>" | Continue |

**If Codex CLI unavailable:** `/codex-cto` is SKIPPED (not counted). `/staff-review` alone gates ExitPlanMode. Planning is never blocked by infrastructure issues.

**When Codex runs successfully:** Verdict is **blocking** — SIMPLIFY/RE-PLAN blocks ExitPlanMode until plan is revised. User can override with "proceed anyway".

`/codex-cto` does NOT replace the `/pr` review-fix loop — that still runs independently.

## When to Run

- **Auto-triggered** alongside `/staff-review` before ExitPlanMode (for non-trivial plans)
- Manual invocation: `/codex-cto` or `/codex-cto <path>`
- Skip conditions: same as `/staff-review` (trivial plans, research-only, user says "skip review")

## What NOT to Do

- Do NOT summarize or paraphrase code into the bundle — bundle raw, verbatim file contents
- Do NOT pass file paths for Codex to read from disk — Codex has no filesystem access; bundle everything via stdin
- Do NOT use `--json`, `-o`/`--output-last-message`, or `--full-auto` — use the canonical plugin-companion form (bundle to a file first — piping a live multi-command stream into the companion EAGAINs on stdin)
- Do NOT read .env files, credentials, or secrets — skip them explicitly, do not bundle them
- Do NOT block plan mode on Codex failure — always continue
- Do NOT summarize Codex output — show it raw, then add your assessment separately
- Do NOT duplicate `/staff-review` work — focus on feasibility against real code, not scope/complexity

---

## Mode 2: Implementation Review (`/codex-cto review`)

Runs after implementation, before `/pr`. Compares what was built against what was planned. Verifies test quality.

### Step 1: Find the Plan, Build the Changed-File Set, Read Both

Look for the plan in:
1. The plan file path from system-reminder (e.g., `/Users/.../.claude/plans/*.md`)
2. Most recent plan discussed in conversation
3. If no plan file found → **SKIP** with "SKIPPED — No plan file found for implementation review"

**Read the plan file.** Build the changed-file set using merge-base against `BASE_REF` (default `origin/main`, fallback `main`) — branch commits + unstaged/staged + untracked files — and **read every changed file, including all test files in the set.** This becomes the bundle in Step 2 — Codex does not read from disk itself.

### Step 2: Bundle and Run Codex

```bash
{ cat <<'PROMPT'
You are the CTO reviewing an implementation AFTER coding is complete. Your job is to verify the implementation matches the plan, check test quality, and catch plan drift. Everything you need is bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

PROJECT INVARIANTS (violations are P0):
- All database access MUST rely on Supabase RLS scoped by auth.uid(). Any use of the service-role client (which bypasses RLS) needs explicit justification.
- Idempotency: handle duplicate submissions/retries safely (e.g. upsert-on-conflict or existence checks before insert).
- Audit/event tables, if present, are append-only. Never UPDATE or DELETE.
- Auth is fail-closed. Missing credentials = 401/500, not silent bypass.
- Thin route handlers, fat lib — all business logic in src/lib/, route handlers in src/app/api/ stay thin.
- Lib functions accept an optional Supabase client parameter where transactional/test-injection matters.
- TDD required: RED phase (failing test) before GREEN phase (passing implementation).
- Existing tests are sacred — never modify to make code pass.

The bundle below contains: the plan file and every file in the changed-file set (including tests).

REVIEW FOCUS:
1. PLAN ADHERENCE — Did the implementation match the plan's file boundaries, requirements, and approach?
2. ACCEPTANCE CRITERIA — Are all planned criteria met in the actual code? Cite file:line.
3. INVARIANT COMPLIANCE — For each applicable invariant, is it correctly implemented?
4. PLAN DRIFT — Any unplanned changes, scope creep, or shortcuts?
5. TDD & TEST QUALITY — Are tests thorough, covering edge cases and negative paths?

Respond in this EXACT format:

VERDICT: APPROVE | REVISE | ESCALATE
CONFIDENCE: HIGH | MEDIUM | LOW

PLAN ADHERENCE:
- Files planned: <list from plan>
- Files changed: <list from diff>
- Unplanned files: <any changed but not in plan — cite file>
- Missing files: <any planned but not changed — cite file>

ACCEPTANCE CRITERIA CHECK:
- [x] <criterion from plan — met in file:line>
- [ ] <criterion from plan — NOT met, explain what's missing>

INVARIANT CHECK:
- [x] or [ ] per applicable invariant with file:line citation

PLAN DRIFT:
- <any deviation from plan with file:line citation>

TDD & TEST QUALITY:
- Test files found: <list>
- Coverage of acceptance criteria:
  - [x] <criterion> — tested in <test-file:line>
  - [ ] <criterion> — NO TEST FOUND
- Edge cases:
  - [x] <edge case tested — test-file:line>
  - [ ] <edge case missing — describe what's not covered>
- Negative tests (error paths, invalid input, boundary conditions):
  - [x] <negative test — test-file:line>
  - [ ] <missing negative test — describe>
- Test anti-patterns found:
  - <circular validation: test mirrors implementation instead of asserting behavior>
  - <missing idempotency test: function called twice, no duplicate check>
  - <missing org-scoping test: no cross-tenant rejection test>
  - <overly broad assertions: test passes on any truthy value>
- Test quality verdict: THOROUGH / GAPS / INSUFFICIENT

For every finding, cite the specific file and line from the bundled content. Be concrete.
=== BUNDLED CONTENT ===
PROMPT
cat "<INSERT_PLAN_PATH>" <INSERT_CHANGED_FILE_PATHS>; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-cto-review-output.txt" 2>&1
```

**Important:** Replace `<INSERT_PLAN_PATH>` and `<INSERT_CHANGED_FILE_PATHS>` with the actual plan path and the space-separated list of changed files read in Step 1 before running. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict strings from the top.

Use a **180-second timeout**.

### Step 3: Present Results

1. Show the **raw Codex output** unmodified
2. Add Claude's assessment: agree or disagree with each finding
3. If verdict is REVISE: list specific items to fix before proceeding to `/pr`

### Review Mode Output Format

```
### /codex-cto Review Result (Advisory)

**Plan:** <plan file path>
**Changed files:** <count> files

**Raw Codex Output:**
<unmodified Codex response>

**Verdict:** APPROVE / REVISE / ESCALATE / SKIPPED
**Confidence:** HIGH / MEDIUM / LOW

**Claude Assessment:**
- [Finding 1]: AGREE / DISAGREE — <1 sentence>
...

**Plan Adherence:** MATCH / DRIFT FOUND
**Test Quality:** THOROUGH / GAPS / INSUFFICIENT

Claude agrees with verdict: YES / NO — <1 sentence if disagreement>
```

### Review Mode Failure Handling

Same as plan mode — all failures result in SKIPPED, advisory only. Implementation review never blocks.

### When to Run Review Mode

- **After implementation completes**, before running `/pr`
- Only if a plan file exists for the current work
- Skipped automatically if no plan file found
- Manual invocation: `/codex-cto review`
- On REVISE: Claude fixes issues, re-runs `/codex-cto review` (max 3 iterations)
- On ESCALATE: surface to user immediately
