---
name: bugfix
description: Disciplined bug-fixing process — reproduce, investigate (Claude + Codex in parallel), plan, TDD, revert-or-ship, retrospective. For non-trivial bugs that need to be fixed right, not fast.
---

Fix a non-trivial bug with the discipline of a senior engineer arriving to fix a production problem. Understand before touching. If the fix doesn't go GREEN cleanly on the first attempt, REVERT and re-investigate. Never stack hacks.

**Usage:** `/bugfix <one-line symptom>` or `/bugfix` (with symptom in conversation context)

**Use for:** latent bugs, cross-system failures, anything that might be a symptom of a bigger problem, any bug that's been "fixed" before and came back.

**Do NOT use for:** typos, obvious one-liners, lint errors, test failures from your own in-progress code. Use `/fix` for those.

---

## Phase 0 — Pre-check (dev vs production)

Classify the bug's deployment state:

- **Case A — Dev-branch bug.** Standard `/bugfix`. Proceed.
- **Case B — Deployed, no customer affected.** Standard `/bugfix`, but Phase 4 plan must answer "how is this reversible in deployment?"
- **Case C — Deployed AND customer affected.** **STOP.** Stabilize first. `/bugfix` only after the bleed has stopped.

---

## Phase 1 — CAPTURE (30 seconds)

Create `docs/bugs/YYYY-MM-DD-<short-slug>.md`. Fill in ONLY:

- **Symptom** — exact error/log/behavior. No paraphrase.
- **Reproducer** — exact command/input/scenario.
- **Expected** — what should happen instead.
- **Case** — A/B/C from Phase 0.
- **Status: CAPTURED**

Commit this file before proceeding.

---

## Phase 2 — REPRODUCE (the gate)

**Hard rule: no fix without a deterministic reproducer.**

1. **Failing test** (best — becomes the regression test)
2. **Sim run with deterministic stall** (for spine bugs)
3. **Log capture with precise repro steps** (last resort)

If you cannot reproduce: expand sim coverage, add telemetry, or close with BACKLOG entry. Do NOT start fixing.

---

## Phase 3 — INVESTIGATE

Read the code. Understand the design. Two parallel investigations, then synthesis.

### Claude's investigation

1. Read the file(s) involved **in full**
2. Grep **every callsite** of the broken function
3. Read each callsite — check for contract mismatches
4. Read git history (last 10 commits)
5. Read relevant spec and state machine docs
6. **SYSTEMS CHECK** (see below)
7. Produce `HYPOTHESIS_CLAUDE` in the bug doc

### Codex investigation (background, parallel)

Same prompt piped via stdin. Different model = different blind spots.

### Synthesis

- If both agree: HIGH confidence
- If they disagree: present both, ask the user
- Adjacent bugs get separate bug docs

### SYSTEMS CHECK (mandatory)

Before proposing ANY fix, check:

**Production-first** — if the bug manifests in sim, trace it to the production code path. Sim exercises real domain code. If sim stalls, the domain code is broken — for sim AND for every production org. Fix the domain code; sim follows for free. **Never patch sim-specific orchestration (dayLoopOrchestrator, correctionGenerator, etc.) to work around a broken production primitive.** The question:

> "Does this same code path run in production? If yes, fix it there. If the bug is only possible in sim (e.g., sim-specific sequencing), then and only then fix the sim layer."

Example from Sprint 30F: sim WOs stalled at DISPATCHING. The naive fix was to change `runDispatchReentry` (sim-only) to use `dispatch_only` mode. The real fix was the graph router (`routing.ts`) returning null for DISPATCHING unconditionally — a production bug that sim exposed first. 100 orgs would hit the same stall on any timing-unlucky BullMQ re-entry.

**Existing infrastructure** — does BullMQ, LangGraph, departments, correction retrieval, event system, CAS/P2002, or DbClient already solve this?

**All paths to the same outcome** — this is the critical question that prevents workarounds:

> "List every code path that achieves the same end state as the broken path. Is the broken code using the right one?"

Example from Sprint 30F: the owner actor needed to approve quotes. There were TWO paths:
- `handleSmsQuoteAction` (SMS-specific, requires approval code + ADMIN phone)
- `approveQuote` (channel-agnostic, used by web dashboard)

The bug was that the agent used the SMS path instead of the domain path. The naive fix (generate fake SMS codes) addressed the symptom. The real fix (use `approveQuote`) addressed the design flaw. **Enumerating all paths would have caught this in 30 seconds.**

**Channel analysis** — if the broken code is in an agent, actor, or handler:

> "Is this code coupled to a specific channel (SMS, voice, web, sim)? Should it be? Does CLAUDE.md's 'all channels feed the same domain functions' rule apply?"

---

## Phase 3.5 — SENIOR ENGINEER INTERVIEW (mandatory, 1 round)

**This is the phase that prevents workarounds.**

After investigation, BEFORE planning, present findings to the user and ask pointed questions using AskUserQuestion. This is a senior engineer sitting down with the founder and saying "before I touch anything, let me make sure I understand how this is supposed to work."

### What to present

1. **"Here's what I found"** — root cause, one paragraph
2. **"Here's how the code currently works"** — the broken flow, step by step
3. **"Here's what I'm thinking for the fix"** — proposed fix shape

### Questions to ask (pick 2-3 most relevant)

**Design intent questions:**
- "Walk me through the approval/dispatch/triage flow. Who can trigger it and through what channels?"
- "Is there already a path that does this without [the broken dependency]? Should the broken code use that instead?"
- "If you were building this from scratch today, would you wire it this way?"

**Scope questions:**
- "Is this a symptom of a bigger design issue, or just a missing step?"
- "Does this need to work across all channels (SMS, web, voice, sim), or is channel-specific coupling acceptable here?"
- "Are there other callers of this function that would break with my proposed fix?"

**Confidence questions:**
- "My fix touches [files]. Is that the right blast radius, or am I missing something?"
- "I'm about to [describe fix shape]. Does that match your mental model of how this should work?"

### Rules for the interview

- **Always ask.** Never skip. Even if you're 99% confident. The 1% case is where workarounds happen.
- **Present concrete examples from the codebase**, not abstract questions. "I see `approveQuoteInTransaction` in `quotes.ts:685` — should the owner actor use this instead of `handleSmsQuoteAction`?"
- **If the user's answer changes your hypothesis, update the bug doc BEFORE proceeding to Phase 4.** The interview is the redirect point.
- **One round only.** This is a focused check, not a requirements gathering session.

### Why this exists

Sprint 30F: the owner actor agent was coupled to the SMS approval path. Investigation found the symptom (missing `smsApprovalCode`) and proposed a fix (generate fake codes). The fix was a workaround that passed all tests. The founder asked "why does this need SMS at all?" — one question that would have caught the design flaw before any code was written. This phase exists so that question always gets asked.

---

## Phase 4 — PLAN

Write a mini-spec in the bug doc:

- Root cause (from Phase 3 synthesis, updated by Phase 3.5 interview)
- Files to touch (ALLOWLIST)
- Blast radius (every callsite)
- Systems considered (table)
- Invariant coverage check
- Anti-duct-tape declaration: `[ ] Real fix` or `[ ] Workaround (+ BACKLOG entry)`
- Gate improvement proposal

---

## Phase 5 — VALIDATE (optional for small fixes)

Run `/codex-cto <bug-doc-path>` on the fix plan. Same convergence loop as `/spec`. Skip for fixes under 50 LOC if the Phase 3.5 interview gave clear direction.

---

## Phase 6 — IMPLEMENT (TDD RED -> GREEN)

1. Verify RED (reproducer fails on current HEAD)
2. Implement the fix (allowlist files only)
3. Verify GREEN (reproducer passes)
4. Full test suite passes
5. Sim re-run if spine-touching
6. Commit

---

## Phase 7 — VERIFY or REVERT

### GREEN on first attempt -> Phase 8
### Not GREEN -> `git revert`, back to Phase 3

**DO NOT patch the fix with another fix.** Revert is free. Compound hacks are expensive.

---

## Phase 8 — RETROSPECTIVE (mandatory)

Every bug pays for itself in gate improvement. Append to bug doc:

- **Trigger** (what made this manifest now)
- **Root cause** (the durable gap)
- **Classification** (latent bug, signature drift, missing invariant, wrong abstraction, race condition, cross-spec wiring gap, hallucination)
- **Why gates missed it**
- **Gate improvement** (at least one Prevent/Mitigate/Detect item; Repair alone is insufficient)
- **Regression test location**
- **Status: CLOSED**

---

## Phase 9 — /pr

Run `/pr` as normal. PR title includes `[BUGFIX]`.

---

## Classification taxonomy

| Class | Canonical gate |
|---|---|
| Latent production bug | Sim run as PR gate |
| Signature drift | Read-the-file + grep-every-callsite |
| Missing invariant | Invariant checklist in `/codex-cto` |
| Wrong abstraction | Phase 3.5 interview ("would you wire it this way?") |
| Provenance leak | Parallel Codex grep |
| Cross-spec wiring gap | `/sprint-cohesion` |
| Race condition | CAS pattern audit |
| Hallucination | Read-the-file rule |

## What makes this different from `/fix`

| | `/fix` | `/bugfix` |
|---|---|---|
| Mode | Autonomous, one-shot | Multi-phase, disciplined |
| Reproduce | Optional | **Gate** |
| Investigation | Single-model | **Parallel Claude + Codex** |
| **Interview** | None | **Senior engineer round with founder** |
| Revert rule | None | **Mandatory after failed attempt** |
| Retrospective | None | **Mandatory gate improvement** |
