---
name: spec
description: Write an upfront spec for a feature, hardening task, or refactor
---

Write a spec interactively using AskUserQuestion, then save to `specs/<name>.md`.

**Usage:** `/spec` or `/spec --type hardening` or `/spec --type refactor`

---

## Step 0: Parse Arguments + Select Posture

Parse `$ARGUMENTS` for `--type feature|hardening|refactor` (default: feature). No mode flags — every spec gets the full process.

**Before doing anything else, ask the user to pick a posture:**

Use AskUserQuestion with this prompt:

```
What posture should I take for this spec?

1. DREAM BIG — Find the 10-star version. Push scope UP. "What would make this 10x better for 2x the effort?"
2. HOLD SCOPE — Your scope is accepted. Make it bulletproof. Catch every failure mode, edge case, and test gap.
3. STRIP TO ESSENTIALS — Find the minimum viable version. Cut everything that isn't the core outcome.

Pick 1, 2, or 3 (default: 2 — Hold Scope):
```

**Commit to the chosen posture for the entire spec.** Do not silently drift. If DREAM BIG, do not argue for less work. If STRIP, do not sneak scope back in.

---

## Spec Process

1. **Explore codebase + throughline check**: Spawn an Explore agent (haiku) to map the relevant domain area BEFORE asking the user anything:
   - Existing domain functions, patterns, and data flows related to the problem area
   - Similar features already built (how was the analogous problem solved?)
   - Current schema models, relationships, and constraints involved
   - Test coverage for the area
   - **THROUGHLINE (BACKWARD):** Check for prior specs on this problem area under `specs/`. What infrastructure was built specifically for this problem area? List functions/tables with 0 callers that this spec should consume. Flag any "built for this but never used" patterns.
   - **THROUGHLINE (FORWARD):** Read `docs/BRIEF.md` for what this problem area is expected to support next (e.g. the RSVP provider abstraction being designed so Luma can later be swapped for native RSVP).
   - **SYSTEMS CHECK:** Before proposing new infrastructure, check if the Supabase schema (`supabase/migrations/`), the fixture-accessor seam (`src/lib/fixtures.ts`), the RSVP provider abstraction (`src/lib/rsvp/provider.ts`), or existing Zod schemas (`src/lib/schemas/`) already solve this. If yes, extend — don't rebuild.
   - **EXISTING WORK CHECK (mandatory — must answer all 4 before writing Prior Art):**
     1. **Does a spec for this feature already exist?** Grep `specs/` for keywords from the feature name. If a `partial` or `abandoned` spec exists for this area, read it in full before writing new Prior Art. The new spec either resumes, supersedes, or explicitly diverges from the existing one — never silently duplicates.
     2. **Do the tables/columns I want to add/touch already exist?** Grep `supabase/migrations/*.sql` for the table/column names. If they exist, report caller count for each (grep `src/lib`). Schema orphans (table exists, 0 callers) are candidates for this spec to wire up — do not recreate them.
     3. **Do the error/event types I want to add already exist?** Grep `src/lib` for error classes and any shared event/constant modules for the type names. If they exist, reuse them. Do not create duplicate `FooNotFoundError` or similar constants.
     4. **What are the 0-caller functions in this area?** Grep the target `src/lib` directory for exported functions, then grep the codebase for each to find orphans (0 callers outside tests). These are the likeliest consumption targets for the spec. An orphan being there means someone already wrote the function — the spec's job is to connect it, not replace it.
   - **FAIL-LOUD RULE:** If the explore agent can't answer any of these 4 checks confidently, STOP and report as a blocker. Do not write Prior Art based on partial exploration. The cost of an extra grep pass is seconds; the cost of rediscovering existing work mid-implementation is hours.
   - Output: a "Prior Art" brief + "Throughline" brief + "Systems Available" list + "Existing Work Found" section (specs, models, types, 0-caller functions) — prior art shows what exists, throughline shows what was built FOR this and what comes AFTER this, systems shows what infrastructure to extend, existing work shows what to NOT rebuild
2. **External research**: Use WebSearch and Context7 to find how production systems solve this:
   - Search for established frameworks, libraries, or patterns (e.g., "Next.js Server Actions form patterns", "Supabase RLS design patterns")
   - Check if dependencies already in `package.json` have built-in features for this (use Context7 to query their docs — Next.js, Supabase, Zod, React Hook Form, Resend)
   - Search for architecture patterns used at similar scale (small member-community apps, not enterprise multi-tenant systems)
   - Output: 2-5 candidate approaches with source links, labeled "build custom" vs "adopt existing"
   - **Quality gate**: Each candidate must include: (a) source link, (b) whether it fits this codebase's stack (Next.js 16 App Router / Supabase), (c) 1-line fit assessment. Generic blog posts without actionable specifics do NOT count.
3. **Interview**: Use AskUserQuestion. **Present Prior Art + External Research findings as the first message.** Minimum 2 rounds mandatory.
   - Round 1: Present findings + gather core requirements. Ask: "Given what exists in the codebase and what's available externally, which direction do you want to go?"
   - Round 2: Scope boundaries, edge cases, architecture decision, Build vs Adopt call
   - **Round 2 MUST include the Consumer Chain question:** "What existing system output does this spec consume? What existing system will consume this spec's output?" If either answer is "nothing" — flag it. The spec may be building an orphan.
   - Continue beyond 2 rounds if the picture is still incomplete.
   - **Posture shapes the interview**: DREAM BIG → actively suggest expansions and "what if we also...". HOLD SCOPE → focus on edge cases and failure modes. STRIP → challenge every requirement with "do we actually need this for v1?"
4. **Write spec**: Use the template below. Save to `specs/<name>.md`
5. **🛑 CITATION VERIFICATION GATE (HARD STOP — non-skippable):** Append a `## Citations` table to the spec body. See "Citation Verification" section below for the table format. Every cited symbol, field, path, and constant must be grep-verified against current code. Mismatches are fixed in the spec, never in the code.
   - **The skill MUST NOT proceed to step 6 until the spec contains a `## Citations` section with at least one row per concrete reference.**
   - **Before invoking `/codex-spec-review`, `/codex-cto`, or `/staff-review`: read the spec file and confirm the `## Citations` section exists. If missing, HALT and write it first.** No exceptions for "small specs" — one-paragraph hardening specs cite 2-3 symbols and STILL need the table.
   - **Why this is a hard gate:** Citation Verification has been a "recommended" step since April 2026 and gets skipped under pressure. Skipping it is the single largest cause of Codex review-loop churn (S35A1.2 = 6 rounds, S36H.2 = 7 rounds, realtime-demand-v1 = 4 rounds — all dominated by mechanical grep errors). 10 minutes of grep saves 30-60 min per review round.
   - **Teardown/drop/cutover/"fully migrate" specs ALSO require a `## Surface Coverage Proof` section (UNCOVERED = 0) before review** — same hard-stop discipline as Citations. See the dedicated "Teardown / Drop / Cutover Precondition" section below. This is the gate that catches scope-by-name (a `DROP` whose predecessors only covered a subset of the real read surface).
6. **Codex challenge**: Run `/codex-spec-review <spec-path>` — Codex reads the written spec + vision + roadmap + real code and challenges assumptions. Feed findings back, revise spec if needed. (Gate check: confirmed `## Citations` exists.)
7. **Validate**: Run `/codex-cto` (feasibility) and `/staff-review` (design quality) in parallel. (Gate check: confirmed `## Citations` exists.)
8. **Done**: "Spec validated. Ready to implement."

---

## Interview Questions (adapt to type)

**Feature:**
- What problem does this solve? Why now?
- Given what already exists in the codebase and what's available externally, which approach fits best?
- What's the acceptance criteria? (specific, testable)
- What's explicitly out of scope?
- Which external systems are involved? (Supabase auth/storage, Resend, etc.)

**Hardening:**
- Which area/invariant are you hardening?
- What's the current state? (existing coverage, known gaps)
- Are there framework-level solutions we're not using?
- What specific invariants must hold after this work?

**Refactor:**
- What code are you refactoring and why?
- What patterns does the rest of the codebase use for this?
- Is there an established pattern or library that does this better?
- What's the target structure?
- Which existing tests must still pass?

---

## Spec Template

```markdown
# <Type>: <name>

## Prior Art
What already exists in the codebase for this problem area. File:line references.
- Existing patterns: <how similar problems are solved today>
- Related domain functions: <list with signatures>
- Related models: <schema models involved>

## Throughline
What was built BEFORE this spec that it should consume, and what comes AFTER that depends on it.
- **Backward (previous sprints):** <list infrastructure from previous 2 sprints that this spec uses or should use>
- **Forward (roadmap):** <list future sprint dependencies this spec enables>
- **Orphans consumed:** <list any existing functions/models with 0 callers that this spec wires up>

## Consumer Chain
Every spec must have both an input and an output consumer. If either is "nothing" — justify why or this spec is building an orphan.
- **This spec consumes:** <list existing functions/outputs/data this spec reads or calls>
- **This spec's output is consumed by:** <list existing code or planned specs that will use this spec's outputs>
- **If "nothing":** <justify — e.g., "leaf feature with no downstream consumers" or "foundational infra, consumers in Sprint N+1 spec X">

## External Research
What frameworks, libraries, and patterns exist externally.
Each candidate must have: source link + stack fit assessment + actionable specifics.
- <Approach 1>: <description> — <source link> — Fits: YES/NO because <reason>
- <Approach 2>: <description> — <source link> — Fits: YES/NO because <reason>

## Build vs Adopt Decision
| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| Build custom | <pros> | <cons> | <S/M/L> |
| Adopt <framework/library> | <pros> | <cons> | <S/M/L> |
| Extend existing pattern | <pros> | <cons> | <S/M/L> |

**Chosen:** <option> — <1 sentence why>

## Problem
What's broken or missing. Why now.

## Requirements
- Acceptance criteria (testable, specific)
- Edge cases to handle
- What's explicitly out of scope

## Control Flow Design
How the solution is structured. Pick ONE and justify against alternatives:

| Pattern | When to use | Fits this problem? |
|---------|-------------|-------------------|
| Single domain function | Pure data transform, no side effects | Yes/No — why |
| Pipeline (sequential steps) | Multi-step, explicit ordering, clear I/O per step | Yes/No — why |
| State machine | Entity lifecycle with guarded transitions | Yes/No — why |
| Deterministic workflow | External calls, retries, timeouts, compensation | Yes/No — why |
| Framework feature | Solved by an existing dependency already in package.json | Yes/No — why |

**Chosen:** <pattern> — <1 sentence why this over the alternatives>

## Design
- Entry points (files + functions)
- Data flow (which tables, which `src/lib` functions)
- External systems touched (Supabase auth/storage, Resend, etc.)

## Files Touched
| File | Change | Why |
|------|--------|-----|
| `src/lib/foo.ts` | Modify | Add new function |
| `src/lib/foo.test.ts` | Create | Tests for new function |

## Constraints
- RLS scoping: which queries rely on auth.uid()-scoped RLS, any justified service-role bypass
- Idempotency: which operations could retry
- Concurrency: which state transitions need a conditional update + affected-row check
- Security: auth pattern, PII considerations
- New migration: does this need a new `supabase/migrations/*.sql` file (with matching RLS policy)

## Stop Conditions
- If any existing test breaks, STOP — fix the code, not the test
- If you need to modify a file outside the Files Touched table, STOP and report as blocker

## Verification
- Test cases (input -> expected output)
- Manual verification steps
- What "done" looks like
```

---

## Spec Quality Checks (before saving)

- Every requirement is testable (not vague like "improve performance")
- Entry points reference real files (read them to verify)
- Constraints section addresses multi-tenancy if domain files are touched
- At least 2 test cases in Verification (1 happy path, 1 failure)
- Out-of-scope section is non-empty (forces explicit scoping)
- **Prior Art section references real files with line numbers** (not vague descriptions)
- **Files Touched table is complete** — every file you plan to touch is listed
- External Research has at least 2 candidate approaches with source links and fit assessments
- Build vs Adopt decision has a clear winner with justification
- Control Flow Design table has all 5 patterns evaluated with Yes/No + reason
- **Consumer Chain section is non-empty** — both "consumes" and "consumed by" have concrete answers. "Nothing" requires justification.
- **Existing Work Found section is non-empty** — 4 mandatory checks from step 1 (spec index, schema models, error/event types, 0-caller functions) are answered with concrete file:line evidence or "none found after [exact grep command]"
- **🛑 `## Citations` section exists in the spec body** — this is a HARD GATE. The skill must read the spec file and confirm the `## Citations` heading is present with at least one row per concrete reference before invoking `/codex-spec-review`, `/codex-cto`, or `/staff-review`. No exceptions. (See "Citation Verification" section below for table format. Skip-under-pressure is the single largest cause of review-loop churn — 4-7 rounds per spec when skipped.)
- **🛑 `## Surface Coverage Proof` section exists (teardown / drop / cutover / "fully migrate" / "re-home a surface" specs ONLY)** — HARD GATE: access-pattern grep pasted (not a type proxy), per-file coverage table, **UNCOVERED = 0**, before any review. (See "Teardown / Drop / Cutover Precondition" section below.) Skip only if the spec neither drops a schema object nor claims surface-completeness.

---

## Citation Verification (mandatory — between writing spec and `/codex-spec-review`)

**Every concrete reference in the spec must be grep-verified against current code.** This catches "spec said X, code has Y" mismatches that explode on day-1 implementation. Existence is covered by step 1's EXISTING WORK CHECK; this gate covers **citation accuracy** (signatures, field names, timeouts, paths, middleware, wire DTO shapes).

**What to verify (every one of these in your draft):**
- Every file path in Prior Art and Files Touched (`ls <path>` — does it exist at the cited location?)
- Every function signature you cite (`grep -n "export.*<name>" <file>` — does the signature match what you wrote?)
- Every table/column name (`grep -n "<name>" supabase/migrations/*.sql`)
- Every constant, timeout, or env var (`grep -rn "<NAME>" src`)
- Every shared helper or auth utility (`grep -rn "<helperName>" src/lib` — confirm you're citing the canonical helper, not a stale literal)

**Format the result as a Citations table appended to the bottom of the spec (or in a scratch section that gets deleted before save):**

| Cited as | Grep command | Actual hit | Status |
|----------|--------------|-----------|--------|
| `profiles.is_admin` column | `grep -n "is_admin" supabase/migrations/*.sql` | `0001_initial_schema.sql:42: is_admin boolean` | OK |
| `SESSION_TIMEOUT_MS = 60_000` | `grep -rn "SESSION_TIMEOUT_MS" src` | `src/lib/auth.ts:12: SESSION_TIMEOUT_MS = 120_000` | **FIXED — spec now says 120s** |
| `src/lib/auth.ts` | `ls src/lib/auth.ts` | exists, exports `getSession()` | OK |

**FAIL-LOUD rule:** If grep returns "NOT FOUND" or output that contradicts the spec, **fix the spec to match the code**, never the other way around. If the discrepancy is a code bug, log it as a separate finding — it does NOT belong in the spec text.

**Skip condition:** None. Even one-paragraph hardening specs cite at least 2-3 concrete symbols. The cost is ~10 min; the cost of one extra Codex round is 30-60 min of your wall-clock time.

## Teardown / Drop / Cutover Precondition: Surface Coverage Proof (HARD STOP before review)

**Applies to** any spec that **drops** a table/column/enum, or **claims to** re-home / repoint / retire / fully-migrate / re-source a surface. This is the spec-authoring half of `/sprint-cohesion` § "Step 5b"; the cohesion gate re-checks the union across slices, this is where the surface first gets *counted*.

When it applies, the spec MUST contain a `## Surface Coverage Proof` section before it may be submitted to `/codex-spec-review`, `/codex-cto`, or `/staff-review`:

1. **Grep the real surface as an access pattern, never a type proxy.** For a table use the actual query call shape, e.g. `.from("<table>")`; for a column/enum use the field/value occurrences, not just the type name. Paste the full output + totals (N_files / S_sites). A `.from("<table>")` read does not appear in a status-literal grep — substituting one for the other is how a coverage check misses the real read surface and undercounts sites that still need updating.
2. **Per-file coverage table:**

   | Surface file:line | Reads/writes what | Re-homed by which slice (cite spec + Files-Touched) | COVERED / CARVED-OUT / UNCOVERED |

3. **UNCOVERED MUST be 0.** Any uncovered site blocks the spec — either bring it into a slice's Files-Touched, or write an explicit carve-out (deferred, with an owner + follow-up). "The straggler audit will catch the rest" is not a carve-out.
4. **The DROP-safety grep is re-verification, not discovery.** If the spec's own pre-drop safety grep is the first place the surface gets enumerated, that IS the gap this gate prevents — move the count to authoring time.

**Skip condition:** the spec neither drops a schema object nor claims surface-completeness. A spec that only *adds* to a surface does not need this.

**Anchor:** S38.8 "WorkOrder Retirement" near-miss (2026-06-04, `.claude/scratch/s38.8-audit-report.md`) — a `DROP TABLE WorkOrder` reached a build agent while 35 files / 93 sites still read the table; only ~12 were ever in any slice's Files-Touched.

## Failure Modes (recurring mistakes — check yourself during every spec)

**Skipping or compressing interview rounds:**
Minimum 2 rounds is non-negotiable, even for "small" slices. User has caught this multiple times (27.2, 27.3, 27.4 all had interviews skipped). Codex catches technical issues; the user catches direction. Round 1 presents findings + gathers requirements. Round 2 covers scope boundaries + edge cases. If the picture is still incomplete after 2, keep going.

**Batch-writing specs:**
Never write multiple specs in one session without the full process for each. Each spec gets: explore codebase, external research, 2+ interview rounds, validate. No shortcuts, no "I already know this area."

**Missing evals question for LLM-powered features:**
For any spec that involves an LLM-powered feature (agent behavior, classification, extraction, generation), the interview MUST include: "How do we know the agent is right? What does a wrong answer look like? How do we measure accuracy?" If the spec doesn't answer this, it ships without evals — and bugs are invisible until a customer reports them.

**Spec review as single-pass:**
Run `/codex-cto` + `/staff-review` in a convergence loop, not just once. Fix findings, re-run, repeat until both return PROCEED (max **2 rounds** — the Sprint Cadence cap in `.claude/rules/workflow.md`; round-3+ findings become `[DISCOVERY]` TODOs in section 14, not blockers). A single-pass review ships specs with real errors.

**Building orphans — no consumer chain check (NEW — 2026-04-05):**
Sprint 30c spec originally proposed building vector search for corrections when `correctionRetrieval.ts` already existed and was production-wired for quotes. Codex caught it — Claude missed it. Pattern: spec proposes building X without checking if X (or something close enough) already exists with a wired consumer path. The Consumer Chain section + interview question "who calls this?" prevents this. If the spec's output has no consumer, and no planned consumer in the next sprint, it's an orphan. Examples caught too late: `state.knowledgeChunks` unused by triage (4 sprints), `searchKnowledge()` unused for mandatory pre-retrieval (2 sprints), 16 reasoning types producing Insights that no agent reads.

**Ignoring the throughline (NEW — 2026-04-04):**
Simulation needed 3 iterations (S28, S29d, S29E) because specs didn't check what previous sprints built FOR them or what future sprints need FROM them. Every spec MUST include a Throughline section. If you can't name at least one thing from a previous sprint that this spec consumes or one thing a future sprint depends on — either the spec is isolated (suspicious) or you didn't look. Run `/sprint-cohesion` after all specs in a sprint are written to catch orphans and gaps.

**Rediscovering existing work mid-spec (NEW — 2026-04-15):**
A prior spec in this codebase's lineage rediscovered mid-implementation that a schema table, a Zod schema, and a helper function it proposed adding already existed — caught by Codex, not during Prior Art. The fix: step 1's EXISTING WORK CHECK is MANDATORY, not aspirational. Grep `supabase/migrations/*.sql`, `src/lib/schemas/`, and the target `src/lib/` directory for every type/table/function name the spec proposes. Grep for 0-caller functions. If the explore agent didn't answer all 4 checks with concrete file:line evidence, STOP and re-run exploration. An extra grep pass costs seconds; rediscovering existing work mid-implementation costs hours and forces a spec rewrite. Pattern: "I'm writing this because it doesn't exist" is never true until proven via grep.

**Citation drift in spec body — Codex doing the grep that the author should have done (NEW — 2026-04-27):**
S35A1.2 took **6 review rounds** to reach PROCEED. Of those 6, only one was a real architectural reframe (rev 3, founder-driven). The other five were Codex doing mechanical grep-verification that should have happened during authoring:
- Rev 2: wrong file paths, wrong auth middleware, wrong severity sort
- Rev 4: idempotency contradiction, missing crash recovery (`bootstrapKey` partial unique)
- Rev 5: wrong field name (`Worker.role` → actually `Worker.type`), wrong timeout (60s → actually 120s), missing `api/client.ts` from Files Touched
- Rev 6: wire DTO `role` vs `type` mismatch with prerequisite spec, hardcoded `'dashboard_token'` literal instead of shared `getValidDashboardToken()` helper
Each round = ~30-60 min wall-clock. Spending 10 min on the Citation Verification Pass (above) before submitting to `/codex-spec-review` would have eliminated 4 of the 6 rounds. The grep is mechanical — do it once, up front, instead of paying review-loop cost to re-discover the same facts.

**Whack-a-mole stale references after 2+ revisions — switch to clean rewrite (NEW — 2026-05-11):**
S36H.2 spec took 7 review rounds. Rounds 1-3 all had the same shape of feedback: "Codex still finds stale references in sections I didn't edit this round." Surgical edits left contradictions in Edge cases, Tests, Citation table, Files Touched — sections that didn't get touched in the targeted fix. Rev 4 was a from-scratch rewrite of the spec body with all locked decisions baked in fresh; eliminated all stale-ref noise. Subsequent rounds (5-7) found REAL design issues, not noise, and converged.

**Pattern recognition:**
- 2 review rounds of same-shape feedback ("stale ref X still appears") without convergence → time for clean rewrite
- Symptom: reviewers consistently flag the same kind of issue (residue, contradictions, sections not updated together)
- Cost: 30-60 min for rewrite vs 3+ more surgical rounds at 30-60 min each

**How to apply:**
- Track the SHAPE of Codex feedback across rounds, not just the count
- If round 2 has the same pattern as round 1 (different specifics, same shape), call rewrite
- Preserve revision history at the bottom of the rewritten spec — context for future readers
- Single source of truth from the rewrite forward

**Counter-pattern:** if reviewers find genuinely DIFFERENT issues each round (round 1: schema, round 2: idempotency, round 3: caps), surgical iteration is appropriate. The rewrite trigger is repeated-shape, not repeated-effort.

**Scope sketch before deep ceremony, especially in multi-spec clusters (NEW — 2026-05-11):**
For S36H, presenting a 1-page IN/OUT + open architecture questions + CTO decisions for each spec BEFORE running full /spec ceremony saved multiple interview rounds. The founder confirms or pushes back on scope in 1-2 messages; THEN the deep ceremony runs against locked scope, not negotiating it. Use when: (a) cluster has 5+ related specs, (b) cross-spec contracts exist, (c) founder wants alignment before deep work. Skip when: single-spec sprint or trivial change.

**Format:**
```
IN scope: [what I'd build — bullets]
OUT of scope: [explicit defers]
Open architecture questions + CTO calls: [Q + my recommended decision + rationale]
LOC estimate
```

**Frozen wire schema for cross-boundary contracts (NEW — 2026-05-11):**
For any spec with cross-boundary contracts (frontend↔backend SSE events, service↔service webhooks, event-stream envelopes), include explicit TypeScript types as part of the spec body. Without this, reviewers (and implementations) drift: frontend assumes one shape, backend implements another. H.3 spec was REVISE'd 3 times for missing fields (`activeCall.startedAt`) until the frozen schema section was added. Place it in the Design section under "SSE event envelope" or "Wire schema."

**Multiple sources of truth for side effects (NEW — 2026-05-11):**
When one user action can trigger a side effect via 2+ paths (e.g., a direct API mutation AND a webhook both emitting the same completion event), pick ONE source. Document the choice and the dedup mechanism — e.g. a direct action writes state only, while an inbound webhook is the single source for lifecycle events, or vice versa. If two paths must both exist, route them through a single idempotent function (e.g., a dedup table with a unique constraint on the natural key).

**Post-commit emit, not in-tx emit (NEW — 2026-05-11):**
For events/broadcasts/notifications that announce state changes (event bus, SSE, webhooks), fire AFTER the DB transaction commits successfully — never inside the tx. Otherwise: tx rolls back → broadcast already fired → consumers see phantom state. H.3 reviewers caught this in rev 1: "after `writeEvent`" inside a tx was risking phantom emissions. Resolution: collect events into a local array during the tx, then iterate and broadcast AFTER `await tx.$transaction(...)` returns. Broadcast failure logs warning but does NOT propagate (state is committed; sse delivery is best-effort).

**Replay/buffer over-scope for v1 event-stream specs (NEW — 2026-05-11):**
For SSE/event-stream specs, default to REST re-hydrate on reconnect. Defer durable replay buffers (Last-Event-ID + server-side ring buffer) to S37+ when there's an actual operational need. H.3 spec rev 1 proposed an in-memory replay buffer + ULID event IDs + Last-Event-ID handling — 3 reviewers independently said "over-scoped for v1." Native `EventSource` can't set custom headers on first connect anyway, so Last-Event-ID only works on auto-reconnect, not first connect. REST re-hydrate on `onopen` recovers state in ~200-500ms; for sparse event streams (engagement/call events at 5-10/min), this is invisible to operators.

---

## Session Sizing

- Target: 200-400 LOC **production code** per spec (TDD adds ~2-3x test code on top)
- If a spec would need >4 implementation commits, split into two specs
- The `/pr` review-fix loop typically adds 1 fix commit — plan for N+1 total commits
- Typical session: 2-4 implementation commits + 1 review-fix commit
