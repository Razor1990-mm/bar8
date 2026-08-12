---
name: hard-task-operating-loop
description: Operating loop for hard, multi-step tasks — how to decompose work into gradable slices, verify results with evidence instead of confidence, and choose the next action. Use at the start of any non-trivial task (multi-file change, debugging, migration, work in unfamiliar code) and re-consult whenever a verification fails or the same fix has failed twice.
---

# Hard-Task Operating Loop

The loop is: **lock a gradable goal → map before planning → do the riskiest slice first → verify with evidence → let the result choose the next action.** Everything below is detail on those five moves.

The failure mode this skill exists to prevent: plausible-looking work that was never checked, produced by a plan that was never stress-tested, toward a goal that was never made concrete. Each section closes one of those gaps.

## 1. Decompose

### Lock the goal before touching anything

Restate the task as a condition you could mechanically grade:

> Goal: <what>. Done when: <a check you can actually run — this test passes, this behavior is observable, this output exists>.

If you cannot write the "done when" as something runnable or observable, the goal is fuzzy — and a fuzzy goal is a signal to ask or investigate, never to guess. Do not start building against a goal you couldn't grade, because you'll have no way to know when to stop, and "looks done" will substitute for "is done."

### Map before planning

For any task in code you didn't just write, spend the first phase building a map, not a plan:

- What are the entry points, the data flow, the invariants the surrounding code protects?
- What looks load-bearing? What looks dormant? **Treat every "this is unused / this is a simple enum / this helper is generic" read as a hypothesis requiring proof** (a grep, a call-site read, an executor-body read). Names lie; implementations don't. The most expensive class of error in hard tasks is designing around a misread — a state machine mistaken for enum sprawl, a single-purpose helper mistaken for a generic one.
- What did previous authors already decide? Search for docs, ADRs, prior specs, and lock notes before re-deriving a decision. A locked decision outranks your fresh analysis of the current code, because the current code may be a half-finished migration *toward* that decision.

### Decompose by verifiability, not by component

Cut the work into slices where **each slice ends in a check you can run**. "Write the schema, then the domain layer, then the routes" is component decomposition — nothing is verifiable until the end, so errors compound silently. Prefer thin vertical slices: one behavior working end-to-end, proven, then the next.

Rules of thumb:

- **Riskiest unknown first.** Identify the assumption most likely to invalidate the whole plan (an API that may not exist, a constraint that may not hold, a performance ceiling) and probe it before building anything that depends on it. Cheap probes before expensive construction.
- **Irreversible steps last.** Sequence destructive or hard-to-undo actions (drops, deletes, sends, deploys) after everything that could change your mind about them. A teardown slice is blocked until every premise it relies on is *verified*, not merely asserted by the plan's name.
- **Track subtasks in writing** once there are more than ~3. A slice is marked done only after its check passed — never when the code merely exists.
- **If the task resists decomposition**, that is information: either the goal is still fuzzy (go back to goal-lock) or the task is actually two tasks (split it).

## 2. Verify

### Evidence, not confidence

Your own sense that the work is correct is the weakest possible signal, because the mind that made the error is the mind assessing it. The hierarchy of evidence, strongest first:

1. **A check that would have failed before your change and passes after** — a test written before the fix, a reproduced bug now unreproducible, an observable behavior change.
2. **Exercising the real seam** — drive the actual flow (the route, the CLI, the UI), not just the unit under it. Unit tests green + the endpoint returning 500 is a common reality.
3. **Gates** (typecheck, lint, full suite) — necessary, never sufficient. Green gates mean "nothing mechanical is broken," not "the change is correct." A logic inversion passes every gate.
4. **Re-reading the diff** — weakest, but still catches things. Read it as a hostile reviewer, not as the author.

Claims require pasted proof. "Tests pass" means showing the run output. "X is unused" means showing the grep and its empty result. If you didn't run the check, say so plainly — never report an unverified state as verified.

### The adversarial pass

After the work looks done, switch roles: **try to break it.**

- What input, ordering, or concurrent action makes this wrong? (Empty list, retry/duplicate delivery, the row deleted between read and write, the second tenant's data.)
- What did the change *not* touch that should have moved with it — callers, tests, docs, the other place the same constant lives? Check the negative space of the diff, not just the diff.
- Would a different mind catch something you can't? Same-author code and tests share blind spots; where available, use an independent check — a mechanical tool (mutation testing, a linter), a different model, or tests written *before* the implementation.

### When verification fails

Do not immediately patch and re-run. **Diagnose first**: form a hypothesis about the root cause, find evidence for it, and only then fix. A fix applied without a diagnosis is a guess, and guesses under time pressure converge on shotgun debugging — each retry mutating the code further from a state anyone understands.

## 3. Decide what to do next

### The loop step

After every action, before the next one, answer: **did that result confirm or contradict my current plan?** If it contradicted it — even slightly — update the plan before acting again. Most wasted effort in long tasks is momentum: continuing to execute a plan that the last result already falsified.

### Choosing the next action

- When several actions are possible, prefer the one that **most reduces uncertainty per unit cost**. A 10-second grep that could invalidate an hour of building goes first.
- When blocked, ask: *is this blocked on information only the user has, or information I can get myself?* Retry-able errors, missing context, and ambiguity resolvable from the code are yours to resolve. Product decisions, credentials, and irreversible calls are the user's.
- **Proceed without asking** for reversible actions that follow from the request. Stop and ask only for: destructive/irreversible actions, genuine scope changes, or true user-only input. "Shall I proceed?" on a reversible step is an abdication, not caution.

### The stuck protocol

Track attempts against the same failure. **After ~3 failed attempts with the same approach, the approach is wrong — not the execution.** Stop iterating and step back:

1. Restate what you actually know (observations, not interpretations).
2. List the assumptions the failing approach rests on; find the one you never verified.
3. Generate a genuinely different approach — different layer, different tool, different decomposition — not a variation of the last attempt.

Escalate to the user only after this pass, and bring the diagnosis, not just the failure.

### Stop conditions

End the turn only when one of these is true:

- The goal's "done when" check has been run and passed — report it with the evidence.
- You are blocked on input only the user can provide — say exactly what you need and why.
- The scope has genuinely changed — surface the change and the decision it forces.

Never end on a plan, a promise, or a list of next steps you could execute now. If the last paragraph you're about to write says "next, I'll…" — do that instead of writing it.

## Anti-patterns (each has burned a real task)

- **Building against an ungraded goal** — no "done when" means no way to know you're finished, so effort substitutes for completion.
- **Trusting the name** — a generic-sounding helper, field, or enum whose implementation is single-purpose. Read the body before writing "reuse X" into a plan.
- **Declaring "unused" without the grep** — partial exploration plus confidence is how load-bearing code gets deleted.
- **Component-order decomposition** — nothing verifiable until the end; errors discovered when they're most expensive.
- **Gates-green-equals-correct** — passing lint, typecheck, and the suite while the actual behavior is wrong.
- **Shotgun debugging** — retry-mutate-retry without a diagnosis; each cycle destroys evidence.
- **Momentum past a falsified plan** — the last result contradicted an assumption and the plan didn't update.
- **Ending on a promise** — "I'll now verify this" as the final sentence, with the verification never run.
