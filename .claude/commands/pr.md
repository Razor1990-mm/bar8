---
name: pr
description: Automated review-fix loop — commit, push, review, fix, verify, re-review (max 2 cycles)
model: sonnet
---

Orchestrate the full BUILD -> REVIEW -> FIX loop. Commit staged changes, run all three reviews, parse findings, auto-fix what's safe, ask the user about the rest, and re-review until convergence or max cycles.

**Usage:** `/pr` (from a feature branch with staged or committed changes)

### Expected Runtime & Cost

| Scenario | Wall Time | Claude Tokens | Codex Tokens | When |
|----------|-----------|---------------|--------------|------|
| **Happy path** (SHIP cycle 1) | ~5-8 min | ~30-60K | ~50-100K | Clean implementation, no findings |
| **1 fix cycle** (SHIP cycle 2) | ~10-15 min | ~80-120K | ~150-200K | Findings exist, Claude fixes them |
| **Worst case** (2 full cycles) | ~15-20 min | ~120-180K | ~200-300K | Multiple findings, some recurring |

Breakdown: Each review cycle = 3 skill invocations (~2 min each) + parse + classify. Fix cycle = Claude applies fixes + lint/typecheck/tests. Re-reviews only run reviewers that had findings.

**Token strategy:** Codex reviews (cheap tokens). Claude orchestrates, fixes, and verifies (expensive but reliable). Clear role separation — reviewers don't fix, fixer doesn't review.

---

## Role Separation Principle

**Codex reviews. Claude fixes.** Reviewers don't fix their own findings. The fixer doesn't review its own work. This separation prevents closed feedback loops and keeps each role honest.

**Anti-gaming:** Severity comes from reviewer output verbatim. Claude CANNOT downgrade, reinterpret, dismiss, or relabel severity. The `/pr` skill parses severity from reviewer output exactly as written.

### Failure Modes (recurring mistakes — check yourself during every cycle)

**Dismissing Codex findings as "out of scope" or "pre-existing":**
Recurring pattern: Claude labels P0/P1 findings as "out of scope" or "pre-existing" to avoid fixing them. Rule: if Codex found it in changed files, it's in scope. "Pre-existing" requires `git blame` proof showing the line existed before this branch. P0s can only be overridden by the user, not by Claude. If you disagree with 3+ findings, flag it to the user — you may be rationalizing.

**Severity reinterpretation through classification:**
Even if you can't change the label, routing a P0 to SUGGEST (instead of AUTO or ASK_USER) has the same effect as downgrading it. P0 and P1 findings MUST route to AUTO or ASK_USER. Never SUGGEST.

---

## Process

### Phase 1: PUBLISH

1. Check current branch is NOT `main`. Abort if on main.
2. If there are staged changes, commit them (via `/commit` skill).
3. **Diff-size pre-flight:** Run `git diff $(git merge-base HEAD origin/main) --stat | tail -1` to check total LOC changed. If >400 lines, warn the user: "Large diff ({N} lines). Consider splitting into smaller PRs for better review quality." Do not block — just surface it.
4. **Compose PR body:** Check for `.claude/scratch/impl-notes.md` (running log maintained during implementation — see `.claude/rules/workflow.md` § "Implementation Notes"). If present and non-empty, build the PR body as:
   ```
   ## Summary
   {1-3 bullets summarizing the change}

   ## Implementation Notes
   {verbatim contents of .claude/scratch/impl-notes.md}

   ## Test plan
   {bulleted checklist}
   ```
   If the file is missing or empty, omit the `## Implementation Notes` section entirely — do NOT fabricate notes.
5. Push the branch to origin (`PR_PUSH=1 git push -u origin <branch>`). The `PR_PUSH=1` env var bypasses the pre-push gate (which blocks pushes not originating from `/pr`).
6. If no PR exists for this branch, create one (draft) using `gh pr create --draft --body "$(cat <<'EOF' ... EOF)"` with the body composed in step 4.
7. If PR already exists AND `.claude/scratch/impl-notes.md` exists, update the PR body via `gh pr edit <number> --body "..."` — replace the existing `## Implementation Notes` section (or insert if absent). Then `PR_PUSH=1 git push` for the new commits.
8. **Delete the notes file** after the PR is created or updated: `rm -f .claude/scratch/impl-notes.md`. The notes are now captured in the PR body; the on-disk file is scratch.

### Phase 1b: IDENTIFY SPEC (Required)

Before reviews launch, find the active spec for this work:

1. **Branch name match:** Extract slice ID from branch name (e.g., `sprint-27a/spec-27.1` → `specs/sprint-27.1-*.md`)
2. **Commit message match:** Scan recent commits for `Sprint NN.M` references → match to `specs/sprint-NN.M-*.md`
3. **Sprint doc:** Check `docs/sprints/` for active sprint doc matching branch prefix
4. **Fallback:** If no spec found, set `SPEC_PATH=NONE` and log warning: "No spec found — spec adherence checks will be limited"

Store the paths. **Both `/review` and `/codex-pr-review` MUST receive the spec path explicitly** — do not rely on self-discovery.

### Phase 2: REVIEW (Cycle 1)

Run all three reviews (invoke each via Skill tool — NEVER simulate):

1. `/review <SPEC_PATH>` — Claude: completeness + adversarial + spec adherence
2. `/codex-code-review` — Codex: production-readiness
3. `/codex-pr-review <SPEC_PATH>` — Codex: strategic coherence + spec adherence

**CRITICAL:** Pass the spec path from Phase 1b to `/review` and `/codex-pr-review`. Without it, spec adherence checks silently skip — this is how implementation drift goes undetected.

**IMPORTANT — Stagger Codex calls to avoid API rate limits:**
1. Launch `/review` (Claude) AND `/codex-code-review` (Codex) together
2. Wait **15 seconds** (`sleep 15`)
3. Then launch `/codex-pr-review` (Codex)
All 3 reviews MUST run. The stagger only delays the second Codex call to prevent simultaneous OpenAI API hits. If you skip Codex reviews, the PR is DEGRADED.

**Codex timeout:** Each Codex invocation has a 180-second timeout. If exceeded, log it and proceed with available results. If BOTH Codex reviews are unavailable (timeout, auth failure, CLI not installed), degrade to Claude-only review and add `DEGRADED: Codex reviews unavailable. Single-model review only.` to the PR comment. Auto-fix is still allowed but the PR comment must clearly state the degradation.

Collect all available outputs.

### Phase 3: PARSE

Run `/ingest-review` internally on the combined review output. This produces:
- Structured findings with unique IDs (format: `F{cycle}-{dimension}-{shortname}`)
- Verbatim severity (P0/P1/P2) — NEVER reinterpreted
- File:line references where available
- Fix: action where available

### Phase 4: VERDICT CHECK

If ALL three reviewers say SHIP / SHIP IT:
- Post summary as PR comment (`gh pr comment`)
- Output: "All reviewers: SHIP. PR ready for human review."
- DONE — exit loop.

If ANY findings exist, proceed to Phase 5.

### Phase 5: CLASSIFY (Rules-Based, Not Judgment)

For each finding, classify as AUTO / ASK_USER / SUGGEST using these rules:

#### AUTO-FIX (must meet ALL conditions):
- Severity is P0 or P1
- Has a `File:` reference with line number
- Has a `Fix:` action that is concrete (not vague)
- Fix action matches an item on the **Auto-Fix Allowlist** (below)
- Blast radius: affects <=3 files AND <=30 lines changed
- Does NOT require modifying a test file
- Does NOT require a prohibited pattern (below)
- Total auto-fixes this cycle: <=5. Overflow goes to ASK_USER.

#### ASK_USER (any of these triggers):
- Architectural findings or scope questions
- Claude disagrees with the finding
- Finding requires test file modification
- Finding is recurring (same ID appeared in prior cycle)
- Inter-reviewer contradiction (one says SHIP on code where the other flags P0/P1)
- Blast radius >3 files or >30 lines for a single fix
- >5 auto-fixable findings in one cycle (remainder)
- Finding requires changes outside spec scope
- Fix would use a prohibited pattern
- Fix: action is missing or vague
- Finding severity is not P0 or P1 (P2s go to SUGGEST unless user opts in)

#### SUGGEST (collected, presented at end):
- P2 findings — presented to user after loop completes
- No action taken on these automatically

### Phase 6: ASK USER (if any ASK_USER findings)

Present ASK_USER findings to the user via AskUserQuestion. Include:
- Finding ID, severity, category
- File:line reference
- Both reviewer perspectives (if inter-reviewer contradiction)
- Why it couldn't be auto-fixed

Wait for user direction on each.

### Phase 7: FIX (Claude applies fixes)

For each AUTO finding, Claude applies the fix directly:

1. Read the file referenced in the finding
2. Apply the `Fix:` action following the auto-fix allowlist pattern
3. Each fix must be minimal — change only what the finding specifies
4. Do NOT use prohibited patterns (below)
5. After all fixes applied, proceed to Phase 8

**Claude fixes all AUTO findings in one pass.** Batch them — don't fix-verify-fix-verify sequentially.

### Phase 8: VERIFY

After applying fixes, Claude verifies nothing broke:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm test` (FULL suite, not just affected)
4. If ANY fix touched routing, Server/Client boundaries, or Supabase env usage: `npm run build`
5. If the fix set added/changed e2e-relevant behavior: `npm run test:e2e`

If verify fails: STOP. Present failure to user. Do NOT commit broken code.

### Phase 9: PUBLISH FIXES

1. Stage fixed files (`git add <specific files>`)
2. Commit with message including finding IDs:
   ```
   fix: resolve review findings F1-RLS-rlsBypass, F1-CONC-count

   - F1-RLS-rlsBypass: Switched to RLS-scoped client in members.ts:42
   - F1-CONC-count: Added row-count check after update in dispatch.ts:87

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
3. Push to origin (`PR_PUSH=1 git push`)

### Phase 10: RE-REVIEW

Re-run ONLY the reviewers that had findings. Use the templated re-review prompt:

**For Codex re-reviews, include this context in the prompt:**
```
PRIOR FINDINGS (from cycle {N}):
{list of finding IDs + descriptions from prior cycle}

INSTRUCTIONS: Review the full diff. For each prior finding:
- If resolved: mark as RESOLVED with finding ID
- If still present: re-raise with SAME finding ID
- If partially fixed: re-raise with SAME finding ID + note what remains
New findings get new IDs.
```

### Phase 11: CONVERGENCE CHECK

After re-review results arrive:
- If ALL findings resolved and verdict is SHIP -> DONE
- If a finding ID appears for the 2nd consecutive cycle -> immediately move to ASK_USER (not converging)
- If new findings appeared -> classify and loop (Phase 5)
- If cycle count reaches 2 -> STOP. Present remaining findings to user.

#### Stuck Detection

Before proceeding to the next cycle, check for these stuck patterns:

| Pattern | Detection | Action |
|---------|-----------|--------|
| **Same finding recurs** | Finding ID appears in 2+ consecutive cycles | ASK_USER (existing rule above) |
| **Same file re-edited** | A file that was fixed in cycle N is fixed again in cycle N+1 for a DIFFERENT finding | Warn: "File {path} edited in consecutive cycles — possible churn." ASK_USER for all findings on that file. |
| **Net-zero fix** | A fix in cycle N is effectively reverted by a fix in cycle N+1 (same file, same lines, opposite change) | STOP. Present both findings side-by-side. "Contradictory fixes detected — reviewers disagree. Human decision required." |
| **Fix cascade** | Cycle N+1 has MORE auto-fixable findings than cycle N | Warn: "Fix cascade — {N} new findings after fixing {M}. Fixes may be introducing issues." ASK_USER for all new findings. |

If **any 2 stuck patterns** trigger in the same cycle -> hard stop, present diagnostics, human decides. Don't enter cycle 3.

### Phase 12: LOOP EXIT (max 2 cycles)

After 2 cycles OR when SHIP:
1. Post PR comment with full fix history:
   ```
   ## Automated Review-Fix Loop Summary

   ### Cycle 1
   - Findings: F1-RLS-rlsBypass (P0), F1-CONC-count (P1), F1-STYLE-import (P2)
   - Auto-fixed: F1-RLS-rlsBypass, F1-CONC-count
   - Suggested: F1-STYLE-import

   ### Cycle 2
   - Resolved: F1-RLS-rlsBypass, F1-CONC-count
   - New findings: none

   ### Verdict: SHIP
   ```
2. If remaining findings exist after 2 cycles, present ALL to user with fix history
3. Output P2 suggestions collected across all cycles
4. **PRE-EXISTING backlog prompt:** If any PRE-EXISTING findings were surfaced across cycles, present them grouped and ask: "Add these N pre-existing findings to BACKLOG.md? [Y/n]". If user says yes, invoke `/backlog` for each. This prevents known issues from vanishing into the void after the PR.

---

## Auto-Fix Allowlist (Exhaustive)

These are the ONLY fix patterns that may be applied automatically. **Nothing else auto-fixes.**

| Pattern | Description | Example Fix |
|---------|-------------|-------------|
| Unjustified RLS bypass | Query uses the Supabase service-role client where the session/RLS-scoped client would suffice | Switch to the RLS-scoped client |
| Unused import | Import statement not referenced in file | Remove the import line |
| Missing typed error throw | Lib function returns null instead of throwing typed error | Add `throw new XNotFoundError(...)` |
| Missing update-count check | Conditional `update` result not checked for an affected-row count of 0. **GUARD:** Do NOT auto-fix if the function's JSDoc contains `DESIGN DECISION (exception)` — those are intentional. See `code-patterns.md`. | Add `if (count === 0) throw new XNotFoundError(...)` |
| Missing AbortController timeout | External API call without timeout | Add AbortController with timeout |

**If a finding's fix doesn't clearly match one of these 5 patterns -> ASK_USER.**

---

## Prohibited Fix Patterns

Auto-fix MUST NEVER use any of these. If the fix would require one, finding goes to ASK_USER.

- `// eslint-disable` or `@ts-ignore` to suppress warnings
- Delete or modify existing test assertions
- Add empty catch blocks or swallow errors
- Move code between files to "hide" it from a file-scoped reviewer
- Add `TODO` or `FIXME` comments as a "fix"
- Wrap problematic code in try/catch that returns a default value

---

## Structural Rules

1. **Severity is immutable.** Reviewers set P0/P1/P2. The fixer cannot change it.
2. **Finding IDs are persistent.** IDs survive across cycles. Re-review prompt includes prior findings.
3. **Blast radius caps.** Single fix: max 3 files, 30 lines. Cycle total: max 5 auto-fixes.
4. **Test files are off-limits.** Any fix touching a test file -> ASK_USER.
5. **Convergence detection.** Same finding in 2+ cycles -> ASK_USER immediately.
6. **Inter-reviewer contradictions -> ASK_USER.** Both perspectives shown.
7. **Re-review uses templated prompts.** Not composed dynamically by Claude.
8. **Full diff re-review.** Codex reviews the full diff, not just fixed files.
9. **Full test suite after every fix cycle.** Not just affected tests.
10. **Fix history is visible.** Logged per cycle + posted as PR comment.

---

## Edge Cases

- **No staged changes and no new commits:** Run reviews on existing PR diff. Skip Phase 1 commit.
- **No PR exists:** Create draft PR in Phase 1.
- **All findings are P2:** Skip fix loop. Present suggestions to user. Verdict: SHIP.
- **Verify fails after fix:** Do NOT commit. Present failure. User decides.
- **User rejects all ASK_USER findings:** Record as "user-accepted risk" in PR comment. Proceed.
- **Codex is unavailable:** Degrade to Claude-only review. PR comment MUST state `DEGRADED: Codex reviews unavailable. Single-model review only.` so the founder knows the adversarial gate was skipped.
