---
name: ship
description: Sprint ship gate — closeout + merge-ready PR. The last skill before main.
---

Ship a sprint branch to main. Runs `/sprint-closeout` for internal cohesion, then creates a merge-ready PR.

**Usage:** `/ship` or `/ship <sprint-spec-path>`

**When to run:** After all slices are DONE on the branch. This is the FINAL gate before merging to main.

---

## Process

### Phase 1: Sprint Closeout

Run `/sprint-closeout` (or `/sprint-closeout <sprint-spec-path>` if path provided).

Wait for verdict:
- **MERGE** → proceed to Phase 2
- **FIX FIRST** → STOP. Fix the issues. Re-run `/ship` after fixes.
- **RETHINK** → STOP. Report to user. Do not proceed.

### Phase 2: Push + PR

Only after Phase 1 returns MERGE:

1. `git push -u origin $(git branch --show-current)` — push the branch
2. Create a draft PR via `gh pr create --draft` targeting `main`:
   - Title: `Sprint NN — <theme from closeout>`
   - Body: paste the Sprint Closeout report summary (verdict, shipped slices, proof gates)
   - Label: `sprint-merge`

Report the PR URL to the user.

### Phase 3: Final Verdict

```
## Ship Verdict: SHIP / FIX FIRST / BLOCKED

**Sprint:** <name>
**Branch:** <branch>
**PR:** <URL>

| Gate | Result |
|------|--------|
| Sprint Closeout | MERGE / FIX FIRST / RETHINK |
| PR Created | Yes — <URL> |

### Action
- SHIP: "PR is ready. Merge when you're ready."
- FIX FIRST: "Closeout found issues. Fix before re-running /ship."
- BLOCKED: "Closeout failed fundamentally. Step back."
```

**Optional:** Run `/ultrareview` manually on the PR for high-risk sprint merges (cloud multi-agent review, $5-20/run, 3 free on Pro/Max). Not automatic — call it when you want it.

---

## What This Skill Does

Two gates in one command:
1. **Internal cohesion** (`/sprint-closeout`) — do the pieces fit together?
2. **PR creation** — merge-ready PR with closeout summary

## What This Skill Does NOT Do

- Does not merge to main — that's the user's decision
- Does not run `/ultrareview` — call that manually when needed
- Does not run the per-PR review-fix loop — that's `/pr` (run during implementation)
- Does not run Stryker mutation testing — that's post-merge hardening per workflow.md

---

## When to Use `/ship` vs `/pr`

| Skill | When | What it does |
|-------|------|-------------|
| `/pr` | During implementation, per-slice | Review-fix loop on individual PRs (3 reviewers, Claude fixes, max 2 cycles) |
| `/ship` | End of sprint, once | Closeout + merge PR. The final gate. |

Sprint workflow: implement → `/pr` per slice → all slices DONE → **`/ship`** → (optionally `/ultrareview`) → user merges.
