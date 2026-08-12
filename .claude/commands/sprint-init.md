---
name: sprint-init
description: Initialize a sprint with a lightweight skeleton (theme, decisions, slice list with scope sketches, wiring map). Sets up the spec→implement→spec loop.
model: sonnet
---

Produce a sprint skeleton at `docs/sprints/sprint-NN-title.md` that locks the theme, slice list, and cross-slice wiring — WITHOUT writing per-slice specs. Per-slice depth comes from `/spec` on a loop, informed by what just shipped.

**Usage:** `/sprint-init <sprint-number-or-name>` (e.g. `/sprint-init 37`, `/sprint-init s39-coordination-kernel`)

**When to run:** At sprint start, before the first `/spec`. Replaces the old "write all specs upfront" pattern.

**When NOT to run:**
- Single-slice sprint (just run `/spec` directly)
- Pure refactor with no cross-slice wiring
- User says "skip sprint-init"

---

## Why this exists

Pure spec-everything-upfront front-loads weeks of ceremony before learning from real code, and specs go stale during implementation (see section 14 `[DISCOVERY]`/`[REPLAN]` machinery in `sprint-spec.md` template). Pure spec→implement loop loses cross-sprint cohesion — orphaned infra and broken consumer chains surface late.

Hybrid: lock the *shape* of the sprint at start (theme, slices, wiring), then run `/spec → implement` per slice. Each new spec is informed by what just shipped. Cohesion still gated by `/sprint-cohesion` mid-sprint (after enough specs land) and `/sprint-closeout` at end.

Pattern is lifted from S36H pre-research + scope-sketch checkpoint.

---

## Process

### Step 0: Parse arguments

Parse `$ARGUMENTS` for sprint number or short slug. Resolve to a canonical filename target: `docs/sprints/sprint-<NN>-<slug>.md`.

If the file already exists, STOP and ask: "Sprint skeleton already exists at <path>. Overwrite, append, or abort?" Default = abort.

### Step 1: Parallel context gathering (4 Explore agents, haiku model)

Spawn 4 Explore agents in ONE message (parallel). Each writes its brief to `.claude/scratch/sprint-init-<NN>/` to avoid bloating main context (filesystem handoff pattern from the Anthropic multi-agent playbook).

**Agent A — Backward throughline.**
Read previous 2 sprint docs in `docs/sprints/`. Output: what infrastructure was built, what's wired vs orphaned (0 callers), what previous sprints expected THIS sprint to consume. Write to `.claude/scratch/sprint-init-<NN>/backward.md`.

**Agent B — Forward throughline.**
Read `docs/sprints/MASTER-PLAN-*.md` (or `docs/sprints/ROADMAP-PRODUCTION-SYSTEM.md` as fallback). Output: what the next 2 sprints depend on, what this sprint must establish. Write to `.claude/scratch/sprint-init-<NN>/forward.md`.

**Agent C — Locked decisions + memory.**
Read `~/.claude/projects/-Users-razarafiq/memory/MEMORY.md` and grep for entries marked 🔒 LOCKED relevant to this sprint's area. Read `docs/BRIEF.md` for any product decisions that read as locked ("No monetization", "no Audi/R8-specific logic in the data model", etc). Output: list of LOCKED constraints this sprint MUST respect. Write to `.claude/scratch/sprint-init-<NN>/locked.md`.

**Agent D — Existing specs + candidate slice areas.**
Grep `specs/` for any spec drafts referencing this sprint area. Output: existing/partial specs that should be resumed or superseded; candidate slice areas based on schema gaps (`supabase/migrations/`) + 0-caller functions in the target `src/lib/` area. Write to `.claude/scratch/sprint-init-<NN>/candidates.md`.

**FAIL-LOUD:** If any agent returns "couldn't find X" without proof (grep command + output), STOP and re-run that agent. The cost of a re-run is seconds; the cost of skeleton based on missing context is hours.

### Step 2: Synthesize context brief

Read all 4 scratch files. Produce a 1-page synthesis at `.claude/scratch/sprint-init-<NN>/synthesis.md`:

```
# Sprint <NN> Context Brief

## Backward Throughline
- Infrastructure built in S<N-1>: <list with file:line>
- Orphans this sprint should consume: <list>

## Forward Throughline
- S<N+1> depends on: <list>
- S<N+2> depends on: <list>

## Locked Constraints (do not violate)
- <constraint> — from <memory file or ADR>

## Existing Specs / Partial Work
- <spec path> — status: <draft/partial/abandoned>
- Resume / supersede / divergence: <which>

## Candidate Slices (raw — to be confirmed in interview)
- <area> — IN: <bullets> | OUT: <bullets> | depends on: <slice or external>
```

### Step 3: Interview (minimum 2 rounds)

**Round 1 — Theme + scope boundary.** Present the synthesis to the founder. Use AskUserQuestion (never a Q1/Q2/Q3 markdown table). Single-select where there's a real choice; multi-select for "which of these are IN."

Required questions:
- **Theme:** "What's the one-sentence theme for this sprint?" (free text via Other)
- **Scope boundary:** Present candidate slice areas as multi-select options. Founder picks which are IN.
- **Top risk:** "What's the #1 thing that could derail this?"

**Round 2 — Decisions + sequencing.** Surface any architecture decisions the synthesis flagged (e.g. "Should slice X use BullMQ or extend existing heartbeat?"). Use AskUserQuestion with recommended option first + "(Recommended)" suffix.

Required questions:
- **Architecture calls:** any open architecture decisions surfaced in Step 2 (typically 1-3)
- **Sequencing:** which slice MUST go first (usually schema)? Any explicit serial bottlenecks?

**Posture check (founder-facing):**
- "Posture for this sprint: DREAM BIG / HOLD SCOPE / STRIP TO ESSENTIALS?" (default: HOLD SCOPE)

Continue beyond 2 rounds if the picture is incomplete. Stop once theme + slice list + sequencing + posture are locked.

### Step 4: Draft slice list with scope sketches

For each confirmed slice, produce a scope sketch block (6-8 lines):

```
**Slice <N.M> — <name>**
- Goal: <1 sentence — what user-visible or system-observable thing changes>
- IN: <2-4 bullets — what's built>
- OUT: <1-3 bullets — explicit defers>
- Produces: <functions, models, routes, events>
- Consumes: <upstream slice outputs or existing code>
- Depends on: <slice IDs or "—">
- Open questions: <bullets to resolve in /spec ceremony, or "none">
- Risk: <1 line>
```

### Step 5: Wiring check (cross-slice cohesion preview)

Build a small integration matrix:

```
| Slice | Produces | Consumed By | Status |
|-------|----------|-------------|--------|
| N.1   | <output> | N.2, existing code at <file> | WIRED |
| N.2   | <output> | <nothing in sprint> | ORPHAN — must justify |
```

Rules:
- Every slice that PRODUCES something must have a consumer (another slice OR existing code OR a named upcoming sprint slice). No orphans without explicit justification.
- Every CONSUMES must have a producer (prior slice in this sprint, prior sprint infra, or external).
- If the founder picked an IN scope option that has no producer/consumer wiring, STOP and surface it. Don't silently drop it.

If you find ≥1 orphan or gap, loop back to Step 3 round 3: surface to founder, get a call (cut slice, add slice, or accept orphan with justification).

### Step 6: Write the sprint skeleton

Write `docs/sprints/sprint-<NN>-<slug>.md` following the **partial** sprint-spec template (`.claude/templates/sprint-spec.md`). Fill ONLY these sections:

- **TL;DR (10 lines)** — full block, including Parallelism + Risk lines
- **1. Problem** — 1-4 rows with evidence
- **2. Not Building** — 3-5 explicit exclusions
- **3. Assumptions** — (skip if no major assumptions; leave header + "TBD per slice")
- **4. Decisions** — only sprint-level architecture calls (max 7). Per-slice decisions defer to `/spec`.
- **5. Defaults** — (skip; leave "TBD per slice")
- **6. Slices** — full slice table + the per-slice scope sketches from Step 4 placed immediately under the table in a new subsection titled "Slice Scope Sketches"
- **Wiring Map** — the integration matrix from Step 5 placed under Slices, titled "Cross-Slice Wiring"

**Defer to per-slice /spec ceremony** (leave a one-line pointer in each section header):
- 7. Acceptance Criteria — "see `specs/<slice>.md`"
- 8. Failure Modes — "see `specs/<slice>.md`"
- 9. Verification Scenarios — "see `specs/<slice>.md`"
- 10. Observability — "see `specs/<slice>.md`"
- 11-13 — skip
- 14. Spec Changelog — initialize with `### YYYY-MM-DD — Sprint skeleton created via /sprint-init`
- 15. References — populate with memory file pointers + linked specs

### Step 7: Confirm and hand off

Output:

```
Sprint <NN> skeleton ready at docs/sprints/sprint-<NN>-<slug>.md

Slices: <N> total | Day-1 parallel: <N> | Serial bottleneck: <slice ID>

Next steps:
1. Run /spec <slice-N.0> (typically schema migration if present)
2. Implement N.0 → commit
3. /clear, then /spec <slice-N.1> (informed by N.0 learnings)
4. Repeat until all slices DONE
5. Run /sprint-cohesion after ~50% of slices have specs to catch early drift
6. /sprint-closeout when all slices DONE

Skeleton is a [PLAN]-layer artifact. If a slice's [SPEC] (Problem, Success, Acceptance) changes mid-sprint, stop and re-skeleton — don't drift the slice list silently.
```

Delete `.claude/scratch/sprint-init-<NN>/` after the skeleton is written (or leave for debugging — orchestrator's call).

---

## Quality checks before saving

- [ ] TL;DR is exactly 10 lines and includes Parallelism + Risk
- [ ] Every slice has a scope sketch with Goal + IN + OUT + Produces + Consumes + Depends-on + Open-questions + Risk
- [ ] Wiring Map covers every slice; every Produces has a Consumed By or explicit ORPHAN justification
- [ ] "Not Building" has 3-5 explicit exclusions
- [ ] Decisions table has rejected alternatives + risk per row
- [ ] Sections 7-10 contain `see specs/<slice>.md` pointers, not real content
- [ ] References section links to MEMORY.md entries, ADRs, and any existing partial specs being resumed/superseded

## Failure modes (recurring)

**Skeleton bloat — writing per-slice specs inside the skeleton.**
The skeleton is a *shape* document, not a spec. If a slice's scope sketch is more than 8 lines, you're doing `/spec` work in the wrong file. Move detail to `specs/<slice>.md` when `/spec` runs for that slice.

**Skipping the parallel Explore agents.**
The 4 agents (backward / forward / locked / candidates) are the whole point — they're how the skeleton avoids being a guess. If you skip an agent because "I think I know," you'll rediscover existing work mid-sprint.

**Locking the slice list without founder posture call.**
Posture (DREAM / HOLD / STRIP) shapes which slices are IN. Don't draft the slice list, THEN ask posture — ask posture FIRST so the slice list reflects it.

**Treating slice scope sketches as binding contracts.**
The sketch is a [PLAN]-layer commitment, not [SPEC]. Each `/spec` ceremony per slice can refine IN/OUT based on what's learned from the prior slice's implementation. If a slice's *Goal* changes (vs IN/OUT details), that's a re-skeleton, not a refinement.

**Running /sprint-cohesion against the skeleton alone.**
The skeleton's Wiring Map is a preview check. The real `/sprint-cohesion` runs against *written specs* (mid-sprint) and *shipped code* (closeout). Don't skip the real cohesion gates because the skeleton looked clean.

---

## Relationship to other skills

| Skill | When | Produces | Layer |
|-------|------|----------|-------|
| `/sprint-init` (this) | Sprint start | `docs/sprints/sprint-NN.md` (skeleton) | [PLAN] — slice list + wiring |
| `/spec` per slice | Loop, after prior slice ships | `specs/<slice>.md` (deep) | [SPEC] + [PLAN] per slice |
| `/sprint-cohesion` | After ~50% of slices have specs, AND before merge | Integration matrix + orphan/gap report | Gate |
| `/codex-cto` + `/staff-review` | Per `/spec` | Validation verdict | Gate |
| `/sprint-closeout` | After all slices DONE | Merge-readiness verdict | Gate |
| `/ship` | After closeout passes | PR + merge | Action |

## Session sizing

- `/sprint-init` target: 30-60 min wall-clock (4 parallel Explore agents + 2 interview rounds + synthesis + write)
- Output: ~3-5KB skeleton file with N slices fully sketched
- If you're spending >90 min: the sprint is too large for one skeleton. Stop and ask the founder to split into 2 sprints.
