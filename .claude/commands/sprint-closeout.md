---
name: sprint-closeout
description: Sprint closeout gate — cohesion, drift, dead ends, merge readiness
model: sonnet
---

Final quality gate before merging a sprint branch to main. Validates that all slices compose into a coherent product increment with no drift, dead ends, or integration gaps.

**Usage:** `/sprint-closeout` or `/sprint-closeout <sprint-spec-path>`

**When to run:** After all slices are DONE on the branch, before merging to main.

### Expected Runtime & Cost

| Scenario | Wall Time | Token Cost |
|----------|-----------|------------|
| Small sprint (3-5 slices) | ~5-8 min | ~80-120K tokens |
| Medium sprint (6-10 slices) | ~8-12 min | ~120-200K tokens |
| Large sprint (11-15 slices) | ~12-18 min | ~200-300K tokens |

---

## Process

### Phase 1: GATHER CONTEXT

1. **Find sprint spec:** Use latest file in `docs/sprints/` matching the current branch name, or user-specified path.
2. **Parse spec sections:**
   - TL;DR (theme, success criterion)
   - Slices table (section 6): ID, name, status, files, dependencies
   - "Not Building" list (section 2)
   - Acceptance criteria (section 7)
   - Decisions (section 4)
3. **Build branch diff:** Run merge-base changed-file set against `origin/main` (fallback `main`). Get full list of files added, modified, deleted on this branch.
4. **Read spec changelog** (section 14) for mid-sprint decisions and scope changes.

### Phase 2: SPEC FIDELITY (Did we build what we said?)

For each slice in the spec:

1. **DONE slices:** Verify code exists for the slice's declared files. Cross-reference acceptance criteria (PASS + FAIL) against actual test files.
   - Slice marked DONE but no matching code changes → **GHOST** (doc says done, code says otherwise)
   - Slice marked DONE and code exists but no test coverage → **UNTESTED**

2. **CUT slices:** Verify NO code exists for cut slices. Partially-built code for a CUT slice is a dead end.
   - CUT but code exists → **DEAD END** (half-built feature left in tree)

3. **NOT_STARTED slices:** Same as CUT — verify no partial code.

4. **Scope drift detection:**
   - Files changed on branch that don't appear in ANY slice's file list → **UNPLANNED** (scope creep or infra work not in spec)
   - Items from "Not Building" list that have code → **SCOPE VIOLATION**

**Output: Spec Fidelity Table**
```
| Slice ID | Slice Name | Spec Status | Code Status | Tests | Verdict |
|----------|------------|-------------|-------------|-------|---------|
| 8.0 | Schema migration | DONE | 3 files changed | 2 test files | OK |
| 8.1 | Intake domain | DONE | 4 files changed | 3 test files | OK |
| 8.2 | SMS threading | CUT | 1 file changed | — | DEAD END |
```

### Phase 3: CROSS-SLICE COHESION (Do the slices work together?)

Read ALL changed domain files on the branch. Scan for:

1. **Naming consistency** — Same concept named differently across slices (e.g., `createWorkOrder` in slice 1 vs `buildWorkOrder` in slice 3). Check function names, variable names, error names.

2. **Interface contracts** — Slice A exports a function/type that slice B imports. Verify:
   - Types match (no `any` bridges or casting)
   - Return shapes are consistent (all domain functions follow the same pattern)
   - Error types are consistent (all throw typed errors, not mixed with null returns)

3. **Data flow completeness** — Follow the sprint's "theme" through the codebase:
   - Does data created in slice 1 flow correctly to slice 2's consumer?
   - Are there broken links where slice A writes to a table but slice B never reads it?
   - Are there orphaned event types or error classes that nothing handles?

4. **Import graph health** — Check for:
   - Circular imports between slice files
   - Imports from files that were CUT or NOT_STARTED
   - Dead exports (functions exported but imported by nothing on the branch or in main)

**Output: Cohesion Report**
```
### Cross-Slice Cohesion: CLEAN / DRIFT DETECTED / BROKEN LINK

| Category | Files | Issue | Severity | Fix |
|----------|-------|-------|----------|-----|
| Naming drift | foo.ts, bar.ts | createX vs ensureX | P1 | Align to ensureX |
| Dead export | baz.ts:42 | exportFn unused anywhere | P2 | Remove or wire up |
| Broken link | qux.ts -> cut.ts | Import from CUT slice | P0 | Remove import |
```

### Phase 3b: CROSS-SLICE INTEGRATION (Do the slices actually work as one system?)

Phase 3 checks static cohesion (naming, types, imports). Phase 3b checks **runtime integration** — do the slices compose into a working system?

#### 3b.1: Registration / Wiring Verification

If the sprint adds components to a registry, barrel, or router:
- **Import the barrel** and verify all expected components are present (count + names)
- Check for duplicate registrations (same name registered twice)
- Check for InsightType / route path / event type collisions between slices

```bash
# Example: verify reasoning type registration count
npm test -- registration.test.ts
```

#### 3b.2: End-to-End Data Flow Test

Trace the sprint's "theme" as a data flow from entry point to final output:
1. Identify the sprint's primary entry point (e.g., a route handler or `src/lib` function)
2. Verify every registered component can be invoked by the orchestrator/router without import errors
3. Check that the return types from each component are compatible with the consumer (orchestrator, route, etc.)
4. If a route was added: verify the route → domain → component chain compiles and the route test exercises it

#### 3b.3: Overlap / Collision Detection

When multiple slices operate on similar data:
- **InsightType collisions** — two types producing the same `insightType` value with different semantics
- **PatternKey collisions** — two types that could produce the same `patternKey` for different patterns (would cause P2002 dedup to silently merge unrelated insights)
- **Semantic overlap** — two types detecting the same signal (e.g., Cost Intel accuracy drift vs Quality Intel accuracy trend). Document as OVERLAP (not a bug, but needs awareness)

#### 3b.4: Spec-to-Spec Consistency

Read ALL individual slice specs (not just the sprint doc). Check:
- **Dependency chain** — if spec B says "depends on A", verify A's output matches B's expected input
- **Shared file predictions** — if 2+ specs list the same file in "Files Touched", verify the merge order was correct and no changes were lost
- **Acceptance criteria cross-check** — if the sprint doc says "5 types registered" but individual specs add up to 16, flag the discrepancy (even if the code is correct)

**Output: Integration Report**
```
### Cross-Slice Integration: VERIFIED / GAPS FOUND

| Check | Result | Detail |
|-------|--------|--------|
| Registration count | PASS/FAIL | Expected N, found M |
| Import chain | PASS/FAIL | All types importable without error |
| InsightType collisions | PASS/FAIL | List any collisions |
| PatternKey collisions | PASS/FAIL | List any collision risk |
| Semantic overlaps | N found | List overlapping detections |
| Spec-to-spec consistency | PASS/FAIL | List discrepancies |
```

---

### Phase 3c: CODEX INDEPENDENT INTEGRATION AUDIT

**Why:** Claude writes the code AND runs the closeout — same model, same blind spots. Codex reviews the composed codebase independently and checks what Claude cannot see about its own work.

**Trust model (doctrine 2026-07-08, harness audit T12):** codex input is stdin-bundle everywhere. Codex does not navigate the filesystem — Claude reads the diff, the changed files, and the specs, then bundles their **raw, verbatim** content into the stdin payload. This trades filesystem independence for reliability (no hangs, no worktree contamination) while keeping the "sees reality" property: Claude pipes raw file contents, never a summary or paraphrase.

**When to run:** After Phases 1-3b (Claude's mechanical checks), before Phase 4 (dead ends). Codex findings feed into the final verdict.

**How to run:**

1. Run `git diff --name-only $(git merge-base HEAD main)..HEAD` and read ALL changed `.ts` files (production AND test), the sprint spec, and each individual slice spec in `specs/sprint-NN.*.md`.
2. Bundle everything below `=== BUNDLED CONTENT ===` and pipe via stdin:

```bash
{ cat <<'PROMPT'
You are a senior engineer doing a final integration audit before a sprint branch merges to main. You did NOT write this code. Your job is to find what the author missed. Everything you need is bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

The bundle below contains: the sprint spec, every individual slice spec, and every file changed on this branch since it diverged from main (production AND test).

INTEGRATION CHECKS (the author's blind spots):
1. DATA FLOW SEAMS — Where slice A's output becomes slice B's input, verify types match at runtime (not just compile time). Check: are there any `as unknown as` or `as any` bridges hiding type mismatches?
2. ERROR PROPAGATION — If slice A throws, does slice B handle it? Or does it silently swallow/crash? Follow every try/catch in changed files.
3. REGISTRATION COMPLETENESS — If components self-register (barrel imports, routers, etc.), verify every new component is actually reachable from the top-level entry point. Not just exported — actually called.
4. SHARED STATE — Do any slices mutate shared singletons, module-level variables, or in-memory caches? Check for race conditions or ordering dependencies between slices.
5. CONTRADICTORY LOGIC — Do two slices detect the same signal with different thresholds or conflicting recommendations? This is semantic, not syntactic — you need to understand what the code DOES.
6. MISSING INTEGRATION TESTS — Are there tests that exercise the full compose path (entry point → all slices → output)? Or only per-slice unit tests with mocks?
7. CONFIGURATION DRIFT — If multiple slices read env vars or config, are they consistent? Same defaults? Same validation?

RESPOND IN THIS EXACT FORMAT:

VERDICT: CLEAN | ISSUES FOUND | CRITICAL
CONFIDENCE: HIGH | MEDIUM | LOW

INTEGRATION FINDINGS:
- [P0] <critical integration gap — cite file:line on both sides of the seam>
- [P1] <should fix before merge — cite file:line>
- [P2] <awareness item — not blocking but worth knowing>

DATA FLOW VERIFICATION:
- <entry point> → <component 1> → <component 2> → <output>: VERIFIED / BROKEN at <seam>

MISSING INTEGRATION TESTS:
- <describe what's not tested at the integration level>

For every finding, cite specific file and line from the bundled content. Be concrete, not generic.
=== BUNDLED CONTENT ===
PROMPT
cat "<INSERT_SPRINT_DOC_PATH>" specs/sprint-NN.*.md <INSERT_CHANGED_FILE_PATHS>; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-closeout-output.txt" 2>&1
```

**Important:** Replace `<INSERT_SPRINT_DOC_PATH>` and `<INSERT_CHANGED_FILE_PATHS>` with the actual sprint doc path and the space-separated list of changed files from step 1. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top. Use a **240-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

**Failure handling:** If Codex CLI unavailable or times out → SKIPPED. Phase 3c is advisory but high-value. Never blocks closeout on infrastructure failure.

**Output format:**

```
### 3c. Codex Independent Integration Audit

**Verdict:** CLEAN / ISSUES FOUND / CRITICAL / SKIPPED

**Raw Codex Output:**
<unmodified Codex response>

**Claude Assessment:**
- [Finding 1]: AGREE / DISAGREE — <1 sentence>
...
```

**Verdict integration:** Codex P0 findings are BLOCKING (same as any other P0). P1s go into "Required Actions" if Claude agrees. P2s are informational.

---

### Phase 4: DEAD-END DETECTION (Is anything half-built?)

Specifically hunt for code that was started but never finished:

1. **TODO/FIXME/HACK in branch diff** — Any new TODO/FIXME/HACK comments added on this branch. These are deferred work disguised as done.

2. **Stub functions** — Functions that throw `NotImplementedError`, return hardcoded values, or have empty bodies.

3. **Unused new code** — New functions/classes/types added on this branch that are:
   - Not called by any other file
   - Not tested
   - Not exported as a public API

4. **Partial feature flags** — Feature checks added without both branches implemented.

5. **Console.log / debug artifacts** — Left-behind debugging code.

6. **Cross-sprint orphan scan (NEW — 2026-04-05)** — Scan exported functions/types from the PREVIOUS 2 sprints that this sprint was supposed to wire up. For each:
   - Check: does this sprint's code import or call it?
   - Check: did the sprint spec's Consumer Chain section list it as consumed?
   - Flag as ORPHAN if: (a) the function was built in a previous sprint, (b) it's relevant to this sprint's domain, and (c) this sprint neither consumes it nor explicitly defers it to "Not Building"
   - **This catches the pattern where infrastructure is built speculatively and never wired.** Examples: `state.knowledgeChunks` unused by triage for 4 sprints, Insight embeddings with no agent consuming them for 2 sprints, `correctionRetrieval.ts` only called by quote for 6+ sprints.
   - Report as: `ORPHAN: <function> in <file> — built Sprint N, still no consumer in Sprint N+M. Action: wire it or cut it.`

**Output: Dead-End Report**
```
### Dead Ends: CLEAN / N FOUND

| # | Type | File:Line | Description | Action |
|---|------|-----------|-------------|--------|
| 1 | TODO | foo.ts:42 | "TODO: handle edge case" | Implement or cut |
| 2 | Stub | bar.ts:87 | Function body is empty | Implement or remove |
| 3 | Unused | baz.ts:12 | newHelper() called by nothing | Remove dead code |
```

### Phase 5: MAIN COMPATIBILITY (Will it merge clean?)

1. **Merge conflict check:** Run `git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main` to detect conflicts without actually merging. Report conflicting files.

2. **Breaking change scan:** If main has moved since the branch was created:
   - Check if any files modified on BOTH the branch and main since merge-base
   - For shared files: are the changes compatible or conflicting?
   - Flag high-risk overlaps (`supabase/migrations/*.sql`, shared test helpers, `src/lib` shared utility files)

3. **Rebase status:** How many commits behind main? If >20 commits behind, recommend rebasing before merge.

**Output: Merge Readiness**
```
### Merge Readiness: CLEAN / CONFLICTS / NEEDS REBASE

Commits behind main: N
Conflicting files: [list or "none"]
Shared-file overlaps: [list or "none"]
```

### Phase 6: PROOF GATES (Does it actually work?)

Run and capture full output:

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test`
4. `npm run build` (always run at closeout — this is the final gate)
5. `npm run test:e2e` (if the sprint touched user-facing flows covered by Playwright specs)

**All four must pass.** Any failure is BLOCKING.

### Phase 7: CLOSEOUT REPORT

Compile everything into a single report.

---

## Output Format

```
## Sprint Closeout: Sprint N — "Title"

**Branch:** <branch-name>
**Spec:** <spec-path>
**Theme:** <from TL;DR>
**Success criterion:** <from TL;DR>

---

### 1. Spec Fidelity

| Slice ID | Slice Name | Spec Status | Code Status | Tests | Verdict |
|----------|------------|-------------|-------------|-------|---------|

**Shipped:** N/M slices
**Cut:** N slices (list)
**Unplanned files:** N (list if >0)
**Scope violations:** N

### 2. Cross-Slice Cohesion

**Verdict:** CLEAN / DRIFT DETECTED / BROKEN LINK

[Cohesion table if issues found]

### 2b. Cross-Slice Integration

**Verdict:** VERIFIED / GAPS FOUND

| Check | Result | Detail |
|-------|--------|--------|

[Overlap table if any found]

### 3. Dead Ends

**Verdict:** CLEAN / N FOUND

[Dead-end table if issues found]

### 4. Merge Readiness

**Verdict:** CLEAN / CONFLICTS / NEEDS REBASE

- Commits behind main: N
- Conflicting files: [list or "none"]
- Shared-file overlaps: [list or "none"]

### 5. Proof Gates

| Gate | Result |
|------|--------|
| Lint | PASS / FAIL |
| Typecheck | PASS / FAIL |
| Tests | PASS / FAIL (N passed, N failed) |
| DB Tests | PASS / FAIL (N passed, N failed) |

### 6. Sprint Changelog Entry (for spec section 14)

```
### YYYY-MM-DD — Sprint Closeout
- Shipped: [list of DONE slices]
- Cut: [list of CUT slices with reason]
- Drift: [any spec changes made during sprint]
- Dead ends resolved: [any cleanup done]
```

---

### VERDICT: MERGE / FIX FIRST / RETHINK

**MERGE** — All proof gates pass, no dead ends, no broken links, merge is clean.
**FIX FIRST** — Issues found but fixable. List of required actions before merge.
**RETHINK** — Fundamental cohesion problems. Slices don't compose. Step back.

### Required Actions (if FIX FIRST)
1. [Concrete action with file:line]
2. [Concrete action with file:line]
```

---

## Verdict Criteria

- **MERGE**: All proof gates pass AND spec fidelity has zero GHOST/DEAD END AND cohesion is CLEAN or only P2 drift AND dead ends is CLEAN AND merge readiness is CLEAN or NEEDS REBASE (rebase is mechanical, not blocking)
- **FIX FIRST**: Any proof gate fails OR any DEAD END found OR any P0/P1 cohesion issue OR merge conflicts exist
- **RETHINK**: 2+ GHOST slices (claimed done but no code) OR 2+ BROKEN LINK cohesion issues OR >50% of slices CUT (sprint failed to deliver)

---

## What This Skill Does NOT Do

- **Does not review code quality** — that's `/review` and `/pr`
- **Does not run the review-fix loop** — that's `/pr`
- **Does not check mid-sprint status** — that's `/sprint-review`
- **Does not audit security/tenancy** — that's `/audit` and `/check-tenancy`

This skill answers ONE question: **"Do all the pieces fit together, and is this branch ready to become main?"**

---

## Post-Closeout Actions (Manual)

After MERGE verdict:
1. Copy the Sprint Changelog Entry into the spec (section 14)
2. Mark sprint spec with final status
3. User merges branch to main (Claude does NOT merge — user decision)
4. If any items were flagged as UNPLANNED or CUT, ask user: "Add to BACKLOG.md?"
