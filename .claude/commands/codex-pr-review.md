---
name: codex-pr-review
description: Codex CTO-level strategic PR review — cohesion, completeness, architectural consistency
model: sonnet
---

Get an independent strategic PR review from OpenAI Codex. Unlike tactical reviews (`/grill` breaks code, `/audit` checks rules, `/codex-code-review` checks production-readiness), `/codex-pr-review` asks: **is this a coherent, complete, well-factored unit of work that sets good precedent?**

**Usage:** `/codex-pr-review` or `/codex-pr-review <sprint-spec-path>`

## Distinct Lens

| Skill | Question | Overlap |
|-------|----------|---------|
| `/review` (Claude) | Completeness + adversarial + AI smells + **spec adherence** | COMPLEMENTARY — both check spec adherence independently |
| `/codex-code-review` | Will this survive 3am? | MINIMAL — blast radius only |
| `/codex-pr-review` | **Is this coherent, complete, well-factored, and faithful to spec?** | UNIQUE strategic lens + **spec adherence** |

**What ONLY /codex-pr-review does:**
1. Verifies slice cohesion (coherent unit or grab-bag?)
2. Traces sprint spec requirements to implementation (requirement completeness)
3. Checks for architectural precedent risk (will future devs copy this blindly?)
4. Assesses integration safety (contract changes, caller impact)
5. Evaluates PR sizing (too big, too small, should split?)

## Trust Model

**Doctrine (2026-07-08, harness audit T12):** codex input is stdin-bundle everywhere. Codex does not navigate the codebase itself — `--json` hangs, and letting Codex wander the filesystem risks worktree contamination. This is a deliberate, founder-accepted tradeoff: we give up "Codex roams the whole repo" independence in exchange for reliability. What we do NOT give up is "Codex sees reality, not Claude's summary" — the bundle is the **raw PR diff via `gh pr diff`** (or raw local diff, pre-PR) plus the **raw spec files** (sprint spec + feature spec, read verbatim, not paraphrased), piped straight into Codex's stdin.

Claude's job: identify the spec paths (Step 1), read them verbatim, identify the PR/diff range (Step 2), and pipe the raw diff + raw spec content in behind the instructions prompt (Step 3). Claude does not describe or summarize the diff or the specs into the prompt.

## Process

### Step 1: Identify and Read Specs

**Feature spec** (from `/spec` skill):
- Check `specs/` directory for a spec matching the work being reviewed
- If argument provided, use that path
- If no feature spec found: set feature spec path to "NONE"

**Sprint spec** (from sprint planning):
- Check recent commit messages for sprint/slice references
- Check `docs/sprints/` for the active sprint doc
- If no sprint spec found: set sprint spec path to "NONE"

**Read both spec files found** (if not "NONE") — their raw content is bundled in Step 3.

### Step 2: Identify the PR (or Local Diff Range) and Changed Files List

If a PR is already open for this branch:

```bash
PR_NUMBER="$(gh pr view --json number -q .number 2>/dev/null)"
```

If no PR exists yet, fall back to a local diff range:

```bash
BASE_REF="${BASE_REF:-origin/main}"
git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 || BASE_REF="main"
MERGE_BASE="$(git merge-base HEAD "$BASE_REF")"
```

Also collect the changed-file list for the output report (display only, not read by Claude):

```bash
{
  git diff --name-only "$MERGE_BASE"..HEAD
  git diff --name-only
  git diff --cached --name-only
  git ls-files --others --exclude-standard
} | awk 'NF' | sort -u
```

**Do NOT read the changed files yourself to inline or summarize them.** The file list is only for the output report — the raw diff piped in Step 3 is what Codex reviews.

### Step 3: Bundle and Run Codex Review

Compose the instructions and run:

```bash
{ cat <<'PROMPT'
You are a skeptical CTO doing a strategic PR review. Your job is NOT to break code (that's /grill) or check compliance (that's /audit) or check production-readiness (that's /codex-code-review). Your job is to evaluate whether this PR forms a COHERENT, COMPLETE, WELL-FACTORED unit of work that sets good precedent. Everything you need — the specs and the raw diff — is bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

PROJECT CONTEXT:
- Next.js 16 App Router app with Supabase (single app, not a monorepo)
- Architecture: thin route handlers (`src/app/api/`), business logic in `src/lib/`
- Single-tenant per-user: every query relies on Supabase RLS scoped by `auth.uid()`
- Append-only audit trail where applicable (event/audit tables, if present)
- Idempotent webhooks: provider retries, duplicate submissions

SPRINT SPEC PATH: <INSERT_SPEC_PATH_OR_NONE>
FEATURE SPEC PATH: <INSERT_FEATURE_SPEC_PATH_OR_NONE>

If a sprint spec path is given above (not NONE), its raw content is bundled below — extract:
- Slice IDs and acceptance criteria
- Requirements list
- MUST-COVER invariants
- "Not Building" exclusions

If a feature spec path is given above (not NONE), its raw content is bundled below too — extract:
- Requirements and acceptance criteria
- Design (entry points, data flow)
- Constraints (tenancy, idempotency, CAS, security)
- Verification criteria
- Out-of-scope items

REPO SCOPE:
- The bundled content is the raw PR diff (via `gh pr diff` or local `git diff`) for this branch. Review it directly — you have no filesystem access. Judge integration risk, caller impact, and architectural consistency from the diff's context lines and hunks; if something is genuinely undecidable without a whole file, say so explicitly.

Then review the diff against these 7 dimensions:

DIMENSION 1: SLICE COHESION
- Do the changed files form a coherent unit of work, or a grab-bag?
- Could this PR be split into smaller, independently reviewable PRs?
- Are unrelated changes smuggled in (refactors mixed with features)?
- Does the commit history tell a clear story (each commit = one logical step)?
- Red flag: files from different domains changed for unrelated reasons.
- Red flag: commit messages with "also fixed X" where X is unrelated.

DIMENSION 2: REQUIREMENT COMPLETENESS
- For each requirement in the spec: is there code that implements it?
- For each acceptance criterion: is there a test or verifiable path?
- Are there IOUs? (TODO comments, "future sprint", "deferred" in new code)
- Did we implement FAIL criteria (negative tests), not just PASS criteria?
- Red flag: spec says 5 requirements, code implements 4.
- Output a requirement traceability matrix if spec was found.

DIMENSION 3: ARCHITECTURAL CONSISTENCY
- Does new code follow established codebase patterns or introduce new ones?
- Check: thin controllers/fat domain, DbClient parameter, typed errors, P2002 idempotency.
- If new patterns: are they justified? Will they be blindly copied?
- Red flag: new pattern without comment explaining why existing pattern wasn't used.
- Red flag: same concept implemented differently than existing code.

DIMENSION 4: INTEGRATION SAFETY
- Did function signatures change (params added/removed/retyped)?
- Did return types change?
- Are all callers of changed functions updated?
- Did shared types or interfaces change?
- Are there schema changes needing a new file under `supabase/migrations/*.sql`?
- Red flag: export signature changed but only some callers updated.

DIMENSION 5: SYSTEM-LEVEL RISK
- What is the blast radius if this introduces a bug?
- Which services are affected? Which user-facing flows break?
- Is failure mode silent (data corruption) or loud (500 error)?
- Is rollback simple (git revert), moderate (data cleanup), or hard (external effects)?
- Red flag: changes to shared infrastructure without proportional test coverage.

DIMENSION 6: DATA SAFETY
- New DB queries: do they rely on RLS (auth.uid()-scoped), or do they use the service-role client (bypasses RLS — needs explicit justification)?
- New log statements: could they leak PII (email, address, token)?
- Do state changes produce appropriate audit/event records, if the domain has them?
- Could any new query return another user's data?
- Red flag: a Supabase query using the service-role client where the anon/RLS-scoped client would suffice.
- Red flag: log statement includes PII fields.

DIMENSION 7: TEST QUALITY
- Are tests testing BEHAVIOR or mirroring IMPLEMENTATION?
- Are there edge case tests (null, empty, boundary, concurrent)?
- Could a refactor break tests even if behavior stays the same (brittle)?
- Do error path tests verify SPECIFIC errors (not just "throws")?
- Red flag: tests only assert .toHaveBeenCalled() without checking args/outcome.
- Red flag: all happy-path, no error/rejection tests.
- NOTE: focus on test QUALITY, not test EXISTENCE (that's /grill's job).

DIMENSION 8: SPEC ADHERENCE
- If a feature spec path was provided (specs/ directory), read it and compare against implementation.
- For each requirement in the spec: is there code that implements it? Is there a test?
- For each constraint (tenancy, idempotency, CAS, security): is it enforced?
- Are any requirements silently dropped (spec says X, code doesn't do X)?
- Are any out-of-scope items implemented anyway (scope creep)?
- Is any work done that ISN'T in the spec (undeclared scope)?
- Red flag: spec has 5 requirements, implementation covers 3.
- Red flag: code implements something the spec explicitly excludes.
- If no feature spec provided: output "NO SPEC — skipping adherence check" for this dimension.

Respond in this EXACT format:

VERDICT: SHIP IT | REWORK | REJECT

PER-DIMENSION VERDICTS:
D1 Slice Cohesion: COHERENT | MIXED | GRAB-BAG
D2 Requirement Completeness: COMPLETE | GAPS FOUND | NO SPEC
D3 Architectural Consistency: CONSISTENT | MINOR DRIFT | DIVERGENT
D4 Integration Safety: SAFE | CALLERS AT RISK | BREAKING CHANGE
D5 System-Level Risk: LOW | MEDIUM | HIGH
D6 Data Safety: SAFE | CONCERNS
D7 Test Quality: STRONG | ADEQUATE | WEAK
D8 Spec Adherence: FAITHFUL | DRIFT | NO SPEC

[If feature spec found, include:]
SPEC ADHERENCE TABLE:
| # | Requirement | Implemented (file:fn) | Tested (file:case) | Status |
|---|-------------|----------------------|-------------------|--------|
(one row per requirement from the spec)

FINDINGS:
- [P0] <must fix — cite file:line>
- [P1] <should fix — cite file:line>
- [P2] <consider — cite file:line>

RATIONALE:
<2-3 sentences explaining the verdict>
=== BUNDLED CONTENT ===
PROMPT
{ [ "$SPRINT_SPEC_PATH" != "NONE" ] && cat "$SPRINT_SPEC_PATH"; [ "$FEATURE_SPEC_PATH" != "NONE" ] && cat "$FEATURE_SPEC_PATH"; true; }
if [ -n "$PR_NUMBER" ]; then gh pr diff "$PR_NUMBER"; else git diff "$MERGE_BASE"..HEAD; fi
} > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-pr-review-output.txt" 2>&1
```

**Important:** Replace `<INSERT_SPEC_PATH_OR_NONE>` and `<INSERT_FEATURE_SPEC_PATH_OR_NONE>` with the actual spec paths or "NONE" before running, and set `$SPRINT_SPEC_PATH`/`$FEATURE_SPEC_PATH` to match. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top.

Use a **180-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

### Step 4: Present Results

1. Show the **raw Codex output** unmodified
2. Add Claude's assessment: agree or disagree with each finding (1-2 sentences per finding)
3. If running alongside `/review` or `/codex-code-review` and verdicts conflict, flag prominently

**DISMISSAL RULES (STRICT):**
- **"Out of scope" is NOT a valid dismissal.** If Codex found it in the changed files, it's in scope.
- **"Pre-existing issue" requires proof.** Show `git blame` or `git log` proving the issue existed before this branch.
- **P0 findings CANNOT be dismissed by Claude.** Only the user can override a P0.
- **P1 findings require a concrete reason** to disagree — cite the specific code that makes Codex wrong.
- **If Claude disagrees with 3+ findings, flag this to the user** — Claude may be rationalizing rather than fixing.
- **Default posture: Codex is right until proven wrong.** Independent reviewer catches what Claude missed or rationalized.

## Output Format

```
### /codex-pr-review Result

**Changed Files:**
- <file list from changed-file command>

**Sprint Spec:** <path or NONE>

**Raw Codex Output:**
<unmodified Codex response>

**Verdict:** SHIP IT / REWORK / REJECT

**Claude Assessment:**
- [Finding 1]: AGREE / DISAGREE — <1 sentence>
- [Finding 2]: AGREE / DISAGREE — <1 sentence>
...

[If disagreement with other skills:]
DISAGREEMENT: /codex-pr-review says <X>, /grill says <Y>. Review both.

Claude agrees with verdict: YES / NO — <1 sentence if disagreement>
```

## Verdict Criteria

| Verdict | When |
|---------|------|
| **SHIP IT** | Zero P0 findings, all dimensions healthy, no IOUs |
| **REWORK** | P0 findings exist but approach is sound — fix and re-review |
| **REJECT** | 3+ dimensions at worst level, or >50% requirements missing, or anti-patterns introduced |

## Failure Handling

**Codex-pr-review is a BLOCKING gate when run standalone.** If it can't run, that's a setup problem to fix. When run inside `/pr`, Codex unavailability degrades gracefully (Claude-only review) but the PR comment MUST state "DEGRADED: Codex reviews unavailable. Single-model review only."

| Failure | Output | Action |
|---------|--------|--------|
| Codex CLI not installed | "BLOCKED — Codex CLI not installed. Run: `npm install -g @openai/codex`" | **Block gate** |
| Codex auth unavailable | "BLOCKED — Codex authentication unavailable. Run `codex login`." | **Block gate** |
| Timeout (180s) | "BLOCKED — Codex API timeout (180s). Retry or check API status." | **Block gate** |
| Unexpected error | "BLOCKED — <error message>" | **Block gate** |

## When to Run

- **In `/pr` pipeline** — runs alongside `/review`, `/codex-code-review`
- **Manual:** `/codex-pr-review` anytime for a strategic sanity check
- **Especially useful when:**
  - PR touches 3+ domain files
  - PR spans multiple slices
  - PR introduces new patterns or modules
  - PR changes shared infrastructure

## What NOT to Do

- Do NOT hand-summarize or paraphrase the diff or the specs into the prompt — pipe `gh pr diff` / `git diff` and `cat` the spec files raw and verbatim
- Do NOT pass file paths for Codex to read from disk — Codex has no filesystem access; the bundle is the whole review surface
- Do NOT use `--json`, `-o`/`--output-last-message`, or `--full-auto` — use the canonical plugin-companion form (bundle to a file first — piping a live multi-command stream into the companion EAGAINs on stdin)
- Do NOT re-run compliance checklists (/audit does this)
- Do NOT try to break code or check AI smells (/review does both)
- Do NOT check per-function operability (/codex-code-review does this)
- Do NOT read .env files, credentials, or secrets — if the diff touches them, strip those hunks before bundling
- Stay at the SYSTEM level, not the LINE level
