---
description: Take over a locked plan/spec and drive it to a draft PR as a self-verifying LOOP — establish goal + eligibility + budget, then implement (TDD) → gate gauntlet → independent review → draft PR. Never merges. Runs attended (founder hands off) or unattended (CI/overnight, if a scheduled workflow is configured).
---

# /execute-plan — take over a plan and run it as a loop

You are taking over a **PROCEED-locked spec/plan** and driving it to a **draft PR** as a self-verifying loop. Instead of prompt → respond → the founder iterates, you design the loop once (goal · scope · stop rules), then run turns against it and surface only when the goal is met or a stop-rule fires. A human reviews and merges. **You are NOT the merge gate — you never merge, never push to `main`.**

Two entry modes, same procedure:
- **Attended handoff** — the founder says "take over this plan / run this spec / take it from here." You establish the loop out loud (the pre-flight below), then execute.
- **Unattended** — a scheduled CI workflow (if configured) or a local `/loop` calls this once per spec, in dependency order, stacking each branch on the previous. No human is watching until it's reviewed.

## Arguments

`/execute-plan <spec-slug> [--base <branch>] [--draft true|false] [--max-fix-cycles N] [--max-usd N]`

- `<spec-slug>` — the spec/plan to implement, e.g. `s38.8d`. Resolves to the newest `specs/<slug>*.md`. (Attended: may also be a plan you were just handed in-chat — write it to `specs/` first if it isn't there.)
- `--base` — branch to stack on (default: current branch). The PR targets this branch.
- `--draft` — open the PR as draft (default: `true`).
- `--max-fix-cycles` — max gate→fix iterations before opening a red PR (default: `2`, the harness-wide cycle cap).
- `--max-usd` — soft dollar ceiling for the run; stop and surface if exceeded (default: `5`).

Local multi-spec convenience: `/execute-plan s38.8d s38.8e` runs the procedure once per spec, auto-chaining `--base` (spec 2 stacks on `plan/s38.8d`).

## Pre-flight — establish the loop BEFORE any code (the 6 parts)

This is what makes it a loop and not a one-shot. Do this first, every time. In attended mode, state it back to the founder in ~6 lines before you touch code.

1. **GOAL (the grader).** Restate the spec's acceptance criteria as ONE verifiable end-state: "loop until all HARD gates green AND every AC demonstrably ships AND a draft PR is open." If the plan has no gradable end-state → **STOP and ask.** You cannot loop toward a goal you can't grade.
2. **ELIGIBILITY GATE (loop vs human-in-loop).** Classify the work before trusting the loop to self-verify:
   - **LOOP-ELIGIBLE** — fully covered by the HARD gates: mechanical refactor, test backfill, straightforward CRUD slice, mutation-hardening, FE mocks, docs. The loop may run to green and open the draft PR unattended.
   - **HUMAN-IN-LOOP** — touches **RLS policies · auth · state machines · `supabase/migrations/*.sql` · architecture** (the landmine zone). The gates do NOT fully catch correctness here. Loop only to green gates, then **STOP at draft PR and explicitly flag it for founder review — never self-approve.** Read `.claude/rules/landmines.md` first; do not re-litigate locked decisions.
3. **SCOPE.** The spec's Files column, nothing else. An out-of-scope file needed → STOP that spec, open the draft PR with a `## BLOCKER` naming the file and why. Do not silently edit it.
4. **STOP RULES (be explicit — success · failure · budget).**
   - success: the grader passes (gates green, ACs shipped, draft PR open).
   - failure: same gate red after `--max-fix-cycles`; 3+ discoveries (the spec may be wrong — stop and tell the founder); an out-of-scope file is required.
   - budget: `--max-fix-cycles` iterations AND `--max-usd`. Do not grind a red gate forever — a transparent red PR beats a silent infinite loop.
5. **VERIFIER (separate checker each checkpoint).** The HARD gate gauntlet (step 3) + an independent reviewer subagent that did NOT write the code (step 5) + Codex as the adversarial pass. The verifier is a different model than the doer — that separation is what creates quality.
6. **MEMORY.** Maintain `.claude/scratch/impl-notes.md` (non-obvious judgment calls; the PR body embeds it) and log spec deviations in the spec's section 14 (`[DISCOVERY]`/`[CORRECTION]`/`[REPLAN]`).

## Hard rules (non-negotiable — these are why a human can trust the diff)

1. **Draft PR by default. Never push to `main`.** Merging follows `.claude/rules/workflow.md` § Merge Authority (founder-adjudicated 2026-07-08): LOOP-ELIGIBLE work with ALL hard gates green may merge unattended; product-behavior and landmine-zone slices ALWAYS stop at draft PR for the founder.
2. **Stay on a `plan/<slug>` branch.** Branch from `--base`. Never switch to `main`.
3. **Files outside the spec's declared scope are off-limits.** If you need one, STOP that spec, open the PR as draft with a `## BLOCKER` section naming the file and why. Do not silently edit it.
4. **Never modify existing tests to make code pass.** If code breaks a test, the code is wrong — fix the code or report it as a blocker. (CLAUDE.md invariant.)
5. **≤1,500 LOC production + test per PR.** If the spec is bigger, implement the first shippable sub-slice, mark the rest in the PR body under `## Carried`, and stop. Do not ship a tarball.
6. **TDD.** Write the failing test first for every non-trivial change (no RED screenshot ceremony — just test-first ordering).
7. **Obey the project invariants** in `CLAUDE.md` and `.claude/rules/*`: thin route handlers / fat `src/lib`, RLS-scoped queries (auth.uid()), any audit/event tables append-only, idempotency on retries/duplicate submissions, conditional-update row-count checks, no secrets committed.
8. **Read `.claude/rules/landmines.md` before touching state machines or "dormant" code.** Do not re-litigate locked decisions (e.g. L5 Path B).

## Procedure (one spec)

### 0. Preflight — refuse to run on a bad spec
- Resolve `specs/<slug>*.md`. If missing → abort this spec, report "spec not found", continue to next.
- Confirm the spec is **locked**: it must contain a `## Citations` section AND show a PROCEED disposition (look for `/codex-cto` + `/staff-review` PROCEED, or a "rev N — PROCEED" marker). If it is NOT locked → **do not implement**. Open NO PR. Report: "spec `<slug>` is not PROCEED-locked — refusing to amplify an unreviewed spec." (Garbage in, garbage out is the #1 risk — this is the gate.)
- Run the **pre-flight** above (goal · eligibility · scope · stop rules · verifier · memory). If ELIGIBILITY = HUMAN-IN-LOOP, note it now so step 7 stops at draft PR with a review flag.
- Check the spec's `depends-on` / preconditions. If a dependency branch isn't present in `--base`'s history → report the missing dependency and skip.

### 1. Branch (stacked)
```bash
git fetch origin
git checkout <base>
git pull --rebase
git checkout -b plan/<slug>
```

### 2. Implement (TDD, in spec slice order)
- Read the spec fully, including section 14 (`[DISCOVERY]`/`[REPLAN]`) and the Files column.
- For each slice: write failing test(s) → implement the lib function → wire the thin route handler → repeat.
- Maintain a running `.claude/scratch/impl-notes.md` of non-obvious judgment calls (the PR body will embed it).
- Stay strictly inside the spec's declared file scope (rule 3).

### 3. Run the real gates (the same ones CI runs)
```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```
- If the spec adds e2e coverage, also run `npm run test:e2e`.
- If the spec adds/changes a `supabase/migrations/*.sql` file: confirm it applies cleanly against a local/dev Supabase project and that RLS policies were added for any new table (see `.claude/rules/code-patterns.md` § Supabase RLS Patterns).
- For any modified `src/lib/**` or `src/app/api/**` file, sanity-check that queries correctly rely on RLS (auth.uid()-scoped) rather than an unjustified service-role bypass.

### 4. Fix-loop (bounded)
- If any gate fails: read the failure, fix the **code** (never the test), re-run. Repeat up to `--max-fix-cycles` (default 2).
- Stop early if `--max-usd` is exceeded. If still red after the cap: **do not keep grinding.** Proceed to open the PR as draft, and put the exact failing output under `## ⚠️ Gates red` in the body. A transparent red PR the human can triage beats a silent infinite loop.

### 5. Independent review (separate agent — mirrors your `/pr` loop)
This is the one stage that actually creates quality: a reviewer that did **not** write the code looks at it before a human ever does.

- Spawn a **fresh reviewer subagent** (`subagent_type: "bar8-qa-eng"`, or a clean general agent) with NO implementation context — give it only the spec, the assembled diff (`git diff <base>...plan/<slug>`), and the instruction to run `/review` plus an adversarial pass (correctness, tenancy, idempotency/CAS, append-only audit, layer forkability, AI-smell, spec-completeness — did every AC actually ship?).
- The reviewer returns structured findings with severity (P0/P1/P2). It does NOT fix anything — review and implementation stay separated (your role-separation rule: reviewer reviews, implementer fixes).
- **The implementer (this run) fixes P0/P1 findings**, re-runs the step-3 gates, then re-submits the diff to a fresh reviewer. Repeat up to `--max-fix-cycles` (default 2, shared budget with step 4).
- **Convergence:** stop when the reviewer returns no new P0/P1, or the cycle cap is hit. Unresolved P0/P1 at cap do NOT block the PR — they go into the PR body under `## ⚠️ Unresolved review findings` so the human triages them. (Codex's adversarial pass is a deliberate gate — run `/codex-pr-review` on the PR before approving — because Codex auth is machine-bound and cannot run in CI.)
- Record the final reviewer verdict + any unresolved findings for the PR body.

### 6. Commit (project format)
```
type(slug): short description

- what changed
- why

Co-Authored-By: Claude <noreply@anthropic.com>
```
Commit at logical boundaries; keep each commit one concern.

### 7. Push + open DRAFT PR
```bash
git push -u origin plan/<slug>
gh pr create \
  --base <base> \
  --head plan/<slug> \
  --draft \                       # unless --draft false
  --title "type(<slug>): <spec title>" \
  --body-file <generated body>
```

**PR body must contain, in this order:**
- **Spec:** link to `specs/<slug>*.md` + one-line goal.
- **Loop setup:** the goal (grader), the ELIGIBILITY verdict (LOOP-ELIGIBLE / HUMAN-IN-LOOP — and if the latter, "⚠️ founder review required, not self-approved"), and the budget spent (cycles / ~USD).
- **Gate status:** ✅/❌ for lint, typecheck, test, build, (e2e / migration checks if applicable). Paste the failing output verbatim if red.
- **Independent review verdict:** the step-5 reviewer's final verdict + how many cycles it took. List any `## ⚠️ Unresolved review findings` (P0/P1 left at cap) for the human. Add the reminder: *"Run `/codex-pr-review` before approving — Codex adversarial pass is the final gate."*
- **Implementation Notes:** contents of `.claude/scratch/impl-notes.md` (then delete the file).
- **LOC:** production + test, and confirmation it's ≤1,500 (or the `## Carried` split note).
- **`## BLOCKER`** (if any out-of-scope file was needed) or **`## ⚠️ Gates red`** (if it opened red).
- A line: *"Autonomous plan-takeover run. Draft — human reviews + merges. Not auto-merged."*

`claude-code-review.yml` and `eval-gate.yml` then fire on the opened PR, decorating it for the human.

### 8. Report
End your run with a one-block summary per spec: branch, PR number/URL, **loop setup (goal + eligibility)**, gate status, **independent-review verdict + unresolved findings**, budget spent, LOC, and any blocker/carried/red flag. If you processed multiple specs, list them in order with their stacking base.

## What the human sees when they look
A stack of draft PRs, each: stacked correctly, lint/type/test-green (or transparently red with output), tenancy-checked, ≤1,500 LOC, **already passed an independent reviewer that didn't write the code**, with the loop's goal + eligibility verdict stated up top. The human runs `/codex-pr-review` for the adversarial Codex pass, then reviews top-of-stack down and merges in order. Shipping is no longer gated on the founder being the loop's interval — only on the review + approve.

## How this maps to your real process
Not an org chart — your actual loop: spec PROCEED-locked (refuse-gate) → pre-flight loop setup (goal · eligibility · budget) → solo TDD implement (steps 1–4) → **independent review before a human sees it** (step 5 + `claude-code-review.yml`) → Codex adversarial pass + you merge. No specialist fleet, no worktrees beyond the per-spec branch — because that's not how you code. The eligibility gate is the safety rail: mechanical work runs the loop to green; the landmine zone loops to green gates but always stops at your desk.
