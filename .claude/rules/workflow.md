# Workflow Rules

These apply to all files. Root CLAUDE.md has the summary; this file has the detailed flow.

## Philosophy: Commit Often, Review in a Loop

Uncommitted work is lost work. Commit frequently at logical boundaries — a passing test, a working slice, a fixed bug — rather than batching a huge diff. Small commits are easier to review, easier to bisect, and cheaper to revert.

The default arc for any non-trivial change:

```
/spec (or goal-lock for smaller work) → implement (TDD via /tdd-workflow) → commit
  → /review + /codex-code-review → fix findings → commit
  → /pr → user merges
```

### Spec-Driven Development

Before starting any feature, hardening, or refactor: run `/spec`. It explores the codebase, researches, interviews to converge on a design, and writes the spec to `specs/<name>.md`. `/codex-cto` + `/staff-review` validate the spec before implementation starts.

- **Citation verification matters.** Before validating a spec, grep every file/symbol/field it cites against the real code. A spec that references a schema field or component that doesn't exist wastes an implementation session discovering that mid-build.
- **Convergence loop, not a single pass.** If `/codex-cto` or `/staff-review` returns SIMPLIFY or RE-PLAN, fix and re-run. Cap at 2 rounds — if a spec can't converge in 2 rounds, it's too big; split it.
- Also read `.claude/rules/landmines.md` before writing a spec that touches RLS policies, the fixture-accessor seam, or the RSVP provider — those are the traps that have bitten this codebase before.

### Implementation Phase

- Read the spec from `specs/<name>.md`.
- Write tests first via `/tdd-workflow` (TDD ordering, no RED screenshot ceremony).
- Commit freely at logical boundaries — the pre-commit hook runs lint + typecheck + vitest automatically.
- **High-risk checkpoint:** for RLS policy changes, privileged-column writes, or auth/middleware changes, get a second look (security-focused review) before committing.

**Mid-flight discovery rule:** when implementation reveals the spec is wrong:

| Situation | Action |
|-----------|--------|
| Spec approach is technically impossible (function/table doesn't exist, Supabase API differs) | Stop, tell the user, note the correction, continue against the corrected understanding |
| Spec has a factual error (wrong file/column name) | Note it, continue — no need to stop for typo-level fixes |
| The plan is wrong but the goal is right | Re-slice, note why, continue |
| You need a file outside the spec's declared scope | STOP and report as blocker. Do not silently edit out-of-scope files |
| Scope cut | Note it, add to backlog if relevant |

### PR Phase

- Commit + push + open/update PR.
- Run `/review` + `/codex-code-review` + `/codex-pr-review`.
- Fix findings, re-verify (lint + typecheck + full test suite), commit fixes.
- Human reviews and merges — this is a solo/small-team project; there is no automated merge queue here.

### Commit Discipline

- **Spec** is the unit of planning: one feature, sized to land in a single session.
- **Commit** is the unit of rollback: one concern per commit. With TDD, a commit typically bundles the implementation + its tests.
- Commit messages describe *why*, not just *what*.

## Trivial Changes

Trigger phrases: "Just fix it", "quick fix".

Flow: fix → quality gates (lint, typecheck, test) — no TDD ceremony, no spec required.

"Trivial" means small change (typo, rename, constant, copy tweak), not relaxed quality.

## Default: Goal First, Then Loop

A plain "build X" request should trigger a quick goal-lock pass before implementation, not an immediate dive into code against a fuzzy target.

1. **Interview to converge on the goal**, asking one question at a time, prioritizing questions that change scope or architecture. Don't ask what the codebase already answers — go read it first.
2. **State the goal as a verifiable condition:** `Goal: <what>. Done when: <a check you can actually run>.`
3. **Implement toward the locked goal**, verifying against the "done when" as you go.
4. **Pause only for:** destructive/irreversible actions, a real scope change, or input only the user can provide (a credential, a product decision, a merge).

**Skip straight to work when:** the change is trivial; the user says "just code it" / "skip questions"; or the request already contains a definitive goal.

## Branch Discipline

**Never switch to `main` after committing on a feature branch.** Stay on the working branch for the entire session — the `block-checkout-main.sh` hook enforces this mechanically for Bash `git checkout`/`git switch` calls.

- At session start: if on `main`, create or checkout a feature branch first (unless the user explicitly wants to work on `main` for a small doc/config change).
- After completing work: stay on the branch. Ask what's next — more work on this branch, or open a PR.
- Only touch `main` when the user explicitly says "merge" or "switch to main."

## Gate Discipline

**Hard gates (mechanical, must pass before commit/merge):**
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test` (vitest)
4. `npm run build` (before merge — catches things typecheck/lint miss, e.g. RSC/Client boundary violations)

**Advisory aids (useful signal, not proof of correctness):** `/review`, `/codex-code-review`, `/codex-pr-review`, `/security`, `/audit`. Green from these means "nothing obvious was found," not "this is correct" — especially for RLS policy changes, which need a real Supabase project to verify against (see `.claude/rules/testing.md` § Circular Validation Warning).

## Process Enforcement

Non-negotiable rules:
- **TDD is default** for all non-trivial code changes. Invoke `/tdd-workflow` via the Skill tool.
- **Skills must be invoked via the Skill tool**, not manually replicated.
- **Existing tests are sacred** — never modify to make new code pass. If tests break, the code is wrong.
- **Files outside declared scope are off-limits** — report as blocker.
- **Commit frequently** — uncommitted work is lost work.
- **Ship complete features** — never defer pieces to hypothetical future work; build it now or cut scope explicitly.

## File Routing (Auto-Apply)

| User says... | Claude does... |
|--------------|----------------|
| "We should eventually..." / "Future idea..." | Add to a backlog note (create `docs/BACKLOG.md` if none exists) |
| "We need a runbook..." | Create in `docs/runbooks/` |

## Definition of Done

- [ ] `npm run lint` passes
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `npm run build` passes (for anything touching routing, Server/Client boundaries, or Supabase env usage)
- [ ] Never modify existing tests — fix the code, not the tests
- [ ] New/modified Zod schemas, RSVP provider logic, and RLS-adjacent code have tests
- [ ] No secrets committed (check `.env*` stayed gitignored — see `.claude/rules/landmines.md`)
