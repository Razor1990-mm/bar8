---
name: codex-cto-parallel
description: Run Codex CTO plan reviews in parallel for multiple spec/plan files, then consolidate verdicts
model: sonnet
---

Run `/codex-cto` style plan review across multiple files concurrently and return one consolidated report.

**Usage**
- `/codex-cto-parallel specs/sprint-17.1-*.md specs/sprint-17.2-*.md`
- `/codex-cto-parallel specs/sprint-17.*.md`

## Inputs

1. Resolve arguments as file globs.
2. Keep only existing markdown files.
3. If no files match, return `SKIPPED — no matching plan/spec files`.

## Parallel Execution

For each resolved file, run one independent Codex CTO review in parallel (same rubric as `/codex-cto` plan mode). Codex input is stdin-bundle (doctrine locked 2026-07-08, harness audit T12): Claude reads the plan file and bundles its raw content — Codex does not read from disk.

Use this command template per file (replace `<INSERT_PLAN_PATH>` with the actual path, and `<PLAN_FILE_CONTENT>` is the `cat` of that path — this is a per-file loop, not a single invocation):

```bash
{ cat <<'PROMPT'
You are the CTO advisor reviewing a plan BEFORE implementation begins.
Evaluate feasibility, file boundaries, invariant coverage, and acceptance criteria against the plan bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

PLAN_FILE: <INSERT_PLAN_PATH>

PROJECT INVARIANTS (P0):
- RLS-scoped queries (auth.uid())
- Idempotency on retries/duplicate submissions
- Conditional-update row-count checks
- Append-only audit/event logs (if present)
- Fail-closed auth
- Thin route handlers / fat src/lib
- Existing tests are sacred

Return EXACT format:
VERDICT: PROCEED | SIMPLIFY | RE-PLAN
CONFIDENCE: HIGH | MEDIUM | LOW
FEASIBILITY CONCERNS:
- [P0/P1/P2] ...
FILE BOUNDARY VALIDATION:
- Files plan says to touch: ...
- Files that actually need touching: ...
- Missing files: ...
- Unnecessary files: ...
INVARIANT COVERAGE CHECK:
- [ ] ...
ACCEPTANCE CRITERIA GAPS:
- ...
HIDDEN ASSUMPTIONS:
- ...
ALTERNATIVE APPROACHES:
- ...
=== BUNDLED CONTENT ===
PROMPT
cat "<INSERT_PLAN_PATH>"; } > "$SCRATCH/codex-bundle-$(basename "<INSERT_PLAN_PATH>").txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle-$(basename "<INSERT_PLAN_PATH>").txt" > "$SCRATCH/codex-cto-parallel-$(basename "<INSERT_PLAN_PATH>").txt" 2>&1
```

Replace `<INSERT_PLAN_PATH>` with each file path (run this template once per resolved file, in parallel). Read each verdict from AFTER the final `codex` turn marker at the END of its output file — never grep for verdict template strings from the top. macOS has no `timeout` command — rely on the caller's tool timeout, not a `timeout` wrapper.

## Consolidation Output

After all parallel reviews finish, output:

1. Per-file verdict table:
   - file path
   - verdict
   - confidence
   - P0 count
   - P1 count
2. Blockers summary:
   - all P0s grouped by file
3. Merge recommendation:
   - `ALL CLEAR` if all PROCEED
   - `HOLD` if any SIMPLIFY/RE-PLAN

## Rules

- Do not modify code in this command.
- Do not summarize away raw findings; include each file’s raw reviewer output block.
- If one review fails (timeout/auth), continue others and mark that file `SKIPPED`.
- Default timeout per file: 240s.
