---
name: sprint-cohesion
description: Cross-spec coherence review after all specs in a sprint are written. Catches orphaned infrastructure and broken wiring between specs.
model: sonnet
---

Validates that all specs in a sprint form a working system together. Catches the #1 cause of integration failures: specs that pass individual review but don't connect.

**Usage:** `/sprint-cohesion` or `/sprint-cohesion <sprint-doc-path>`

**When to run:** After ALL specs for a sprint are written and individually validated, BEFORE starting implementation. This is the gate between "specs done" and "implementation starts."

**Why this exists:** Simulation needed 3 iterations (S28, S29d, S29E) because specs were validated individually but nobody checked cross-spec wiring. Departments were built but simulation never called them. Infrastructure was created with 0 callers.

---

## Process

### Step 1: Gather All Specs

1. Find the sprint doc in `docs/sprints/` matching the current branch or user-specified path
2. Read the sprint doc's slice table — extract all slice titles
3. Find all spec files in `specs/` that belong to this sprint (match by sprint number or name)
4. Read each spec file completely

### Step 2: Build the Integration Map

For each spec, extract:
- **PRODUCES:** What does this spec create? (new domain functions, new models, new routes, new events, new data)
- **CONSUMES:** What does this spec need from other specs or existing code? (functions it calls, data it reads, events it listens for)
- **FILES TOUCHED:** Full file list from each spec

Build an integration matrix:

```
| Spec | Produces | Consumed By |
|------|----------|-------------|
| 29E.1 | WorkOrderOutcome, Call, Correction, KnowledgeDoc seed data | 29E.4 (day loop needs seeded data), 29E.5 (correction generator reads outcomes) |
| 29E.2 | BullMQ event scanning | 29E.5 (corrections trigger event scanning) |
```

### Step 2b: Systems Check

Read `docs/architecture/INFRASTRUCTURE.md` § "Systems Already Wired." For each spec, verify:
- If the spec builds a queue → is it using the existing BullMQ pattern (`infra/queue.ts` + `infra/workers/`)?
- If the spec builds an agent → is it using the department framework (`registerDepartment`)?
- If the spec adds analysis → is it a reasoning type (`registerReasoningType`)?
- If the spec adds learning → is it wiring correction retrieval (`correctionRetrieval.ts`)?
- If the spec emits events → is it using the event system (`writeEvent` + `EVENT_*` constants)?
- If the spec does LLM calls → is it using Langfuse/LangSmith tracing?

**Red flags:**
- Spec builds a new in-memory queue when BullMQ exists
- Spec builds a custom agent loop when `createReactAgent` exists
- Spec builds custom scheduling when heartbeat worker exists
- Spec builds parallel event dispatch when `dispatchEventToReasoningTypes` exists

### Step 3: Look BACKWARD (Previous Sprints)

Read the previous 2 sprint docs (`docs/sprints/`). For each:
- What infrastructure was built?
- Is the current sprint USING it?
- If not — WHY NOT? Is it intentional (out of scope) or an oversight?

**Red flags:**
- Previous sprint built a function with 0 callers that THIS sprint should be calling
- Previous sprint's success criteria included something this sprint was supposed to consume
- Functions exist in `domain/` that match this sprint's problem but aren't referenced in any spec

### Step 4: Look FORWARD (Roadmap)

Read `docs/roadmap/README.md`. For the NEXT sprint after this one:
- What does it expect to exist?
- Is this sprint setting it up correctly?
- Are there assumptions about data models, APIs, or infrastructure that this sprint should establish?

### Step 5: Check for Orphans and Gaps

**Orphan check (within sprint):** For every PRODUCES entry, verify at least one spec (or existing code) CONSUMES it. Infrastructure with 0 consumers is an orphan — either the sprint is missing a spec or the infrastructure shouldn't be built.

**Cross-sprint orphan check (previous 2 sprints):** For each spec in the current sprint, check: does this spec's output have a consumer OUTSIDE its own files? Specifically:
- Read `domain/` exports from the previous 2 sprints (check git blame or sprint doc file lists)
- For each exported function/type: grep for imports across the codebase (excluding the file's own test)
- Flag any export that has fewer consumers than expected — e.g., a search function only called by its test, a graph state field only populated but never read downstream, a reasoning type that produces Insights no agent consumes
- This is NOT "zero callers" — it's "does the output reach its intended consumer?" A function with 1 caller (its tool wrapper) but no agent using that tool is still an orphan.
- **Examples this would have caught:** `state.knowledgeChunks` unused by triage (4 sprints), `searchKnowledge()` as tool but no mandatory pre-retrieval (2 sprints), 16 reasoning types producing Insights no agent reads

**Gap check:** For every CONSUMES entry, verify the producer exists — either in another spec or in the current codebase. If neither, the spec has an unmet dependency.

**File conflict check:** Do any specs touch the same file? If yes, are they aware of each other? Concurrent modifications to `runner.ts` from two specs = merge conflict.

**Event chain check:** Trace event flows across specs. If spec A emits `EVENT_CORRECTION_CREATED` and spec B subscribes to it — are the event payloads compatible? Is the dispatch mechanism wired?

### Step 5b: Scope-by-Name vs Scope-by-Enumeration Coverage Check (HARD GATE)

**Why this exists:** a "table retirement" or "cutover" slice can ship a destructive migration (e.g. `DROP TABLE`/`ALTER TABLE ... DROP COLUMN`) while other files still read the old shape (`rg 'from\("<table>"\)' src`). Every individual slice can pass its own spec review while the sprint *name* ("Retirement") and a slice *name* ("cutover") imply total coverage of the surface, but the union of all slices' Files-Touched lists may only cover a fraction of the real sites. The only completeness-grep should not live in the final teardown slice — this gate converts scope-by-NAME into scope-by-ENUMERATION *before* any build starts.

**When it fires:** any slice OR sprint whose name (or stated goal) contains a completeness verb:
`retire | retirement | cutover | migrate all | drop | remove all | deprecate | repoint all | re-home | re-source | sunset | kill | delete table | replace all | fully migrate`.
A slice that merely *touches* a surface does not trigger this; a slice that *claims to finish* one does.

**The check (every step mandatory — no claim without a pasted grep):**
1. **Name the surface symbol as an access pattern, not a type proxy.** For a table use the actual query call shape, e.g. `.from("work_orders")` or `supabase.from(...)` — NOT an enum/status literal alone. A table-read call does not appear in a status-value grep; substituting one for the other is how coverage checks miss the real read surface.
2. **Count the real surface.** Paste `rg -n "<symbol>" src` with the full file/site totals (N_files / S_sites).
3. **Build the coverage union.** Concatenate every predecessor + sibling slice's Files-Touched list. Mark each surface file `COVERED` (in the union), `CARVED-OUT` (an explicit written out-of-scope/defer line — cite it + its owner), or `UNCOVERED` (in neither).
4. **UNCOVERED > 0 = P0 BLOCKER.** Output the uncovered `file:line` list. No teardown / drop / "finish-the-migration" slice may be sequenced until UNCOVERED = 0 or every uncovered site has a written carve-out with an owner.
5. **Supersession rule.** If the sprint's named scope was SUPERSEDED mid-sprint, the old name's completeness guarantee does NOT transfer. Re-run this check against the *successor* plan's Files-Touched union — a renamed goal does not inherit coverage.

Pairs with `/spec` § "Teardown / Drop / Cutover Precondition" (the same proof demanded one layer earlier, at spec authoring) and the sprint doc's own premise-tracking section (the cross-slice tracking table).

### Step 6: Verify Sprint Success Criteria

Read the sprint doc's TL;DR "Success" line. Can this outcome be achieved by the sum of all specs? Walk through the end-to-end flow that would demonstrate success, citing which spec handles each step.

If any step in the success flow has no spec covering it — that's a P0 gap.

### Step 7: Check Learning Loop (if applicable)

For sprints that involve LLM agents or simulation:
- What does the system LEARN from this sprint's work?
- Are corrections/outcomes/insights vectorized or fed back?
- If an agent runs 100 times, is run 100 better than run 1? Which spec ensures this?

---

## Output Format

```
## /sprint-cohesion Result

**Sprint:** <sprint name>
**Specs reviewed:** <count>

### Integration Matrix

| Spec | Produces | Consumed By | Status |
|------|----------|-------------|--------|
| <spec> | <outputs> | <consumers> | WIRED / ORPHANED / PARTIAL |

### Backward Check (Previous Sprints)

| Previous Sprint | Infrastructure Built | Used by This Sprint? | Status |
|-----------------|---------------------|---------------------|--------|
| <sprint> | <what was built> | YES / NO — <which spec uses it or why not> | OK / GAP |

### Forward Check (Roadmap)

| Next Sprint | Expects | This Sprint Provides? | Status |
|-------------|---------|----------------------|--------|
| <sprint> | <dependency> | YES / NO — <which spec or why not> | OK / GAP |

### Orphans Found
- <spec.slice> produces <X> — 0 consumers found. **Action:** <add consumer or cut the work>

### Gaps Found
- <spec.slice> consumes <X> — no producer exists. **Action:** <add spec or wire existing code>

### File Conflicts
- <file> touched by <spec A> and <spec B>. **Risk:** <merge conflict / ordering dependency>

### Event Chain Verification
- <event> emitted by <spec A>, consumed by <spec B>. **Status:** WIRED / BROKEN — <why>

### Scope-by-Name Coverage (only if a slice/sprint name implies completeness — see Step 5b)
- Surface: `<symbol>` — N_files / S_sites (paste the grep)
- COVERED: <count> · CARVED-OUT: <count> · **UNCOVERED: <count>**
- Uncovered sites (each is a P0 BLOCKER — MUST be empty to pass): <file:line list>

### Success Criteria Walkthrough
1. <step> — covered by <spec> ✓
2. <step> — covered by <spec> ✓
3. <step> — **NOT COVERED** — gap

### Learning Loop Check
- System learns: YES / NO / PARTIAL
- <what's learned, what's not>

### VERDICT: COHERENT / GAPS FOUND / MAJOR GAPS

**COHERENT:** All specs connect. Start implementation.
**GAPS FOUND:** Addressable gaps listed above. Fix before implementation.
**MAJOR GAPS:** Sprint design is incomplete. Missing specs or fundamental wiring issues.

**Hard override:** Any `UNCOVERED > 0` in the Step 5b Scope-by-Name Coverage check forces **MAJOR GAPS** regardless of the rest — a completeness-named (retire/cutover/drop/"fully migrate") slice cannot ship with uncovered surface sites, and any destructive/teardown slice that relies on the coverage is BLOCKED until UNCOVERED = 0.
```

---

## When NOT to Run

- Sprint has only 1 spec (no cross-spec integration to check)
- Sprint is pure refactoring with no new infrastructure
- User explicitly says "skip cohesion"

## Relationship to Other Skills

| Skill | When | What it checks |
|-------|------|---------------|
| `/spec` | Per-spec | Individual spec quality + throughline |
| `/sprint-cohesion` | After all specs | Cross-spec wiring + orphans + gaps |
| `/sprint-closeout` | After implementation | Did we build what we said? |
| `/codex-cto` | Per-spec | Feasibility against real code |
| `/staff-review` | Per-spec | Engineering quality + filters |
