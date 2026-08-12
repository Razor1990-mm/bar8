# Sprint Spec Template

Unified sprint spec replacing PRD + tech spec + sprint doc. One file per sprint: `docs/sprints/sprint-NN-title.md`.

**Policy:** Standalone PRDs are reserved for multi-sprint strategic features only. Sprint-scoped work uses this format — no separate PRD or tech spec.

---

## Hard Caps (Enforced)

| Section | Cap | Rationale |
|---------|-----|-----------|
| TL;DR | 11 lines | If you can't summarize it, you don't understand it |
| Problem | 4 rows | More = too many problems for one sprint |
| Not Building | 3-5 bullets | Explicit exclusions prevent scope creep |
| Assumptions | 8 | More = you haven't validated enough |
| Decisions | 7 rows | More = over-designing |
| Defaults | 15 rows | Table, not prose |
| Slices | 15 | More = split into two sprints |
| Acceptance criteria | 1 PASS + 1 FAIL per slice min | Compact, per-slice |
| Failure modes | 7 | Focus on sprint-killers, not exhaustive catalog |
| Verification scenarios | 3 | 1 happy, 1 failure, 1 edge |
| Observability metrics | 5 | Track what matters, not everything |

## Fast Path

For sprints with <=3 slices and no architecture changes: sections 9-13 may be omitted with a 1-sentence justification each.

---

## Sprint Spec Structure

Each section is tagged **[SPEC — durable]** (intent that should not change once approved) or **[PLAN — revisable]** (approach that may be re-sliced mid-implementation via a `[REPLAN]` changelog entry without re-reviewing the whole spec). Discovering the *plan* is wrong is normal; discovering the *spec* is wrong means stop and re-spec.

### TL;DR (11 lines max)

```
Sprint: <N> — "<Title>"
Branch: sprint-N/short-name
Depends on: <what must be merged first, or "none">
Theme: "<one-sentence theme>"

Problem: <1 sentence — what is broken or missing>
Solution: <1 sentence — what we build>
Success: <1 sentence — ONE observable outcome a human can verify>
Slices: <N> slices across <N> phases
Parallelism: Day-1 slices: <N> | Serial bottleneck: <slice ID(s)> | Max agents: <N>
Risk: <1 sentence — the #1 thing that could derail this>
```

Rules:
- Each line is ONE sentence. No semicolons chaining multiple thoughts.
- "Success" must describe a human-observable outcome, not a technical milestone.
- This block is the only thing guaranteed to be read every time the spec is opened.

### Example TL;DR

```
Sprint: 9 — "The Brain Gets Smarter"
Branch: sprint-9/learning
Depends on: Sprint 7 merged to main (AgentRun + KB schemas)
Theme: "Every call teaches the system something"

Problem: GOOSE auto-approves but never learns from approval patterns or overrides.
Solution: SQL pattern mining + recommendation engine + cross-call memory system.
Success: Owner sees "you approve 95% of drain cleaning — suggest raising threshold?" in Flight Deck.
Slices: 12 slices across 3 phases
Parallelism: Day-1 slices: 4 (9.2-9.5) | Serial bottleneck: 9.0 (schema) | Max agents: 3
Risk: Sprint 7 delays cascade — no AgentRun data means no pattern mining.
```

---

### 1. Problem [SPEC] (max 4 rows)

| # | Problem | Evidence | Impact |
|---|---------|----------|--------|
| 1 | <what's broken> | <data/observation> | <who is hurt and how> |

### 2. Not Building [SPEC] (3-5 bullets)

- NOT building X because Y
- NOT building Z — deferred to Sprint N+1

### 3. Assumptions [SPEC] (max 8)

| # | Assumption | Risk if Wrong | Mitigation |
|---|-----------|--------------|------------|
| 1 | <statement> | <what breaks> | <fallback plan> |

### 4. Decisions [SPEC] (max 7)

| # | Decision | Options Considered | Chosen | Why | Risk |
|---|----------|-------------------|--------|-----|------|
| 1 | <what was decided> | <option A, option B> | <which one> | <1 sentence> | <1 sentence + mitigation> |

### 5. Defaults [PLAN] (max 15 rows)

| Area | Default |
|------|---------|
| <config/convention> | <value> |

### 6. Slices [PLAN] (max 15)

**Smallest Demonstrable Slice (mandatory gate — fill before writing the slice table):**

> Smallest slice producing user-visible value: _<1 sentence>_

If that slice cannot be coded + tested in 1-2 days, **STOP. Split the spec into multiple sprints before writing slices.** Past pattern: S34A → S35A1 → 4 sub-sprints cost ~2 days of re-carving that this gate prevents.

| ID | Slice | Phase | Spec | Type | Agent | Depends On | Entry Point | Files (exclusive) | Size | Status |
|----|-------|-------|------|------|-------|------------|-------------|-------------------|------|--------|
| N.0 | Schema migration | 1 | — | SCHEMA | 1 | — | `schema.prisma` | `schema.prisma`, `testHelpers.ts`, `errors.ts`, `events.ts` | S | NOT_STARTED |
| N.1 | <name> | 1 | spec-a | DOMAIN | 2 | N.0 | `domain/foo.ts:fn` | `foo.ts`, `foo.test.ts` | M | NOT_STARTED |

- **Entry Point:** file + function name where implementation starts
- **Files (exclusive):** files this slice may modify. Only this agent writes to these files. Abbreviated paths.
- **Spec:** related slices share a spec name and one ceremony cycle (e.g., "spec-a", "spec-b")
- **Type:** `SCHEMA` (serial — touches schema/migrations/shared infra), `DOMAIN` (parallelizable), `ROUTE` (parallelizable), `TEST` (parallelizable)
- **Agent:** agent number for parallel execution. SCHEMA slices must be Agent 1. DOMAIN/ROUTE/TEST can be any agent.
- **Status:** NOT_STARTED / IN_PROGRESS / DONE / CUT
- **Depends On:** uses slice IDs (e.g., "N.1, N.2") or "—" for no deps

**Parallel execution rules:**
- At most ONE `SCHEMA` slice in progress at a time
- `DOMAIN`/`ROUTE`/`TEST` slices with disjoint file lists can run in parallel
- Shared bottleneck files (`schema.prisma`, `errors.ts`, `events.ts`, `testHelpers.ts`, `app.ts`) belong to the SCHEMA slice agent exclusively
- If another agent needs a new error/event/route, report as blocker — infrastructure agent adds it

**Cross-spec conflicts:** none / [list any two specs that touch the same model/file/domain concept]

### 7. Acceptance Criteria [SPEC] (per-slice, grouped by phase)

Use **Given/When/Then** structure so criteria map directly to test case names.

```
#### Phase 1 — <Phase Name>

**N.1 <Slice Name>**
- PASS: Given <precondition>, when <action>, then <expected outcome>
- FAIL: Given <precondition>, when <invalid action>, then <expected error/rejection>

**N.2 <Slice Name>**
- PASS: Given <precondition>, when <action>, then <expected outcome>
- FAIL: Given <precondition>, when <invalid action>, then <expected error/rejection>
```

- Each slice gets exactly 1 PASS and 1 FAIL minimum.
- Add up to 3 more criteria per slice only if the slice is M or L complexity.
- **Format is mandatory:** every criterion must use Given/When/Then. This enables `/tdd-workflow` to derive test names mechanically.

### 8. Failure Modes [SPEC] (max 7)

| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| <what goes wrong> | P0/P1/P2 | <how you notice> | <what to do> |

Focus on sprint-killers. Not theoretical risks.

### 9. Verification Scenarios [SPEC] (max 3)

```
#### Scenario 1: <Name> (happy path)
Setup: <1 sentence — prerequisites and data state>
Trigger: <curl command or UI action>
Expect: <observable outcome — DB state, API response, log entry>

#### Scenario 2: <Name> (failure)
Setup: <1 sentence>
Trigger: <curl command or UI action>
Expect: <observable outcome>
```

### 10. Observability [SPEC] (max 5)

| Metric | Target | Alert When | Action |
|--------|--------|------------|--------|
| <what to measure> | <goal> | <threshold> | <response> |

### 11. User Journeys (max 2, skip if N/A)

ASCII diagrams only. Max 15 nodes per journey. Include only if the sprint involves multi-step user-facing flows.

### 12. State Machines (max 1, skip if N/A)

ASCII state diagrams only. Include only if the sprint adds or modifies entity lifecycle states.

### 13. Implementation Notes [PLAN] (optional)

For code snippets, migration SQL, interface contracts, and reference patterns that apply across slices. This is where detailed technical guidance lives (replaces standalone tech spec).

- Keep in this file regardless of length — agents need full context in a single read. Do not extract to a separate impl-notes file.
- Include only patterns that multiple slices need. Per-slice detail goes in work orders.

### 14. Spec Changelog (living)

```
### YYYY-MM-DD — <context>
- Changed: <what + why>
```

Updated during sprint. Initialized empty at planning time.

**Entry types** (use the matching prefix):
- `[DISCOVERY]` — implementation revealed the spec is technically impossible (function doesn't exist, type is wrong). Stop and tell the user; correct the spec; continue.
- `[CORRECTION]` — factual error in the spec (wrong file name, wrong field). No user prompt needed; just fix.
- `[REPLAN]` — the slicing/sequence/approach in section 5/6/13 ([PLAN] sections) turned out wrong, but the [SPEC] sections (problem, success, acceptance criteria) are unchanged. Re-slice without re-reviewing the spec. Required fields: original plan, new plan, why the original failed.

If you find yourself wanting to write something that doesn't fit any of these — the [SPEC] sections probably need to change, which means stop and re-spec, not add a changelog entry.

### 15. References

- Backlog items consumed: <list IDs from docs/start-here/BACKLOG.md>
- Related docs: <links>
- Previous sprint: <link>

---

## Sprint Spec Checklist

Before marking sprint spec "ready":

- [ ] TL;DR is exactly 10 lines
- [ ] Problem table has 1-4 rows with evidence
- [ ] "Not Building" has 3-5 explicit exclusions
- [ ] Every decision has a rejected alternative and a risk
- [ ] Every slice has an entry point (file + function)
- [ ] Commits target 60-140 LOC, one concern, max 5 branches (see `.claude/rules/workflow.md` § Commit Discipline)
- [ ] Every slice has at least 1 PASS and 1 FAIL acceptance criterion (Given/When/Then format)
- [ ] Failure modes table has 3-7 rows with recovery plans
- [ ] At least 2 verification scenarios (1 happy, 1 failure)
- [ ] `/staff-review` returned PROCEED
- [ ] All hard caps respected (no section exceeds its cap)
- [ ] Phase close-out integration tests written for each completed phase

---

## Slice Close-Out (During Sprint)

When completing a slice, update the Sprint Spec:
1. Set slice Status to DONE in section 6
2. Add Spec Changelog entry in section 14
3. If any decision changed, update section 4

## Phase Close-Out (During Sprint)

When all slices in a phase are DONE:
1. Write at least 1 integration test per verification scenario that spans completed slices (location: `domain/__tests__/*.integration.test.ts`)
2. Run full test suite: `npm -w services/backend test`
3. Update Spec Changelog with phase completion note
4. Run `/review` + `/codex-pr-review` to check cross-slice coherence before starting next phase

## Sprint Close-Out Gate

Same requirements as before: full proof gates, black-box rehearsal, invariant audits. See the Sprint Close-Out Gate section in `sprint-document.md` (retained for reference).

---

## When to Update This Spec

- **Before sprint start:** Write full spec with all sections
- **During sprint:** Update slice status + spec changelog after each slice
- **After sprint:** Final changelog entry summarizing what shipped vs planned
