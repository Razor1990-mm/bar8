---
name: codex-code-review
description: Codex production-readiness code review — Claude bundles the raw diff via stdin, no summarizing middleman
model: sonnet
---

Get an independent production-readiness review from OpenAI Codex. Codex input is stdin-bundle: Claude pipes the raw PR diff (or raw local diff, pre-PR) into Codex's prompt via stdin — never a summary (doctrine locked 2026-07-08, harness audit T12).

**Usage:** `/codex-code-review` or `/codex-code-review <file>`

## Distinct Lens

| Skill | Focus |
|-------|-------|
| `/grill` | Hostile — tries to break correctness ("what if X is null?") |
| `/review` | AI smell detection + completeness + spec adherence |
| `/codex-code-review` | **Production-readiness** — "will this survive a 3am incident?" |
| `/codex-pr-review` | **Strategic cohesion** — "is this a coherent unit of work?" |

## Trust Model

**Doctrine (2026-07-08, harness audit T12):** codex input is stdin-bundle everywhere. Codex does not navigate the codebase itself — `--json` hangs, and letting Codex wander the filesystem risks worktree contamination. This is a deliberate, founder-accepted tradeoff: we give up "Codex roams the whole repo" independence in exchange for reliability (no hangs, no contamination). What we do NOT give up is "Codex sees reality, not Claude's summary" — for a code review, that property is preserved by piping the **raw PR diff via `gh pr diff`** (or the raw local diff, pre-PR) straight into Codex's stdin. Claude does not paraphrase, describe, or hand-select lines from the diff; it pipes the command's raw output verbatim.

Claude's job: identify the PR (or local diff range), compose the instructions prompt (invariants, review focus, output format), and pipe the raw diff in behind it. Claude does not read the changed files itself to summarize them into the prompt — the diff command's raw output IS what Codex reviews.

## Process

### Step 1: Identify the PR (or Local Diff Range)

If a PR is already open for this branch (the common case — `/codex-code-review` normally runs after `/pr` creates the PR):

```bash
PR_NUMBER="$(gh pr view --json number -q .number 2>/dev/null)"
```

If no PR exists yet (standalone pre-PR invocation), fall back to a local diff range:

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

If a specific file was provided as argument, note it in the instructions so Codex focuses on it.

**Do NOT read the changed files yourself to inline or summarize them.** The file list above is only for the output report — the actual review content is the raw diff piped in Step 2.

### Step 2: Bundle and Run Codex Review

```bash
{ cat <<'PROMPT'
You are a skeptical senior engineer doing a production-readiness review. Your job is to evaluate whether this code is safe to deploy and operable at 3am. Everything you need is bundled below, under === BUNDLED CONTENT === (the raw diff). You have no filesystem access — review exactly this bundled content; do not ask for repo access.

PROJECT INVARIANTS (violations are P0):
- All database queries MUST be org-scoped (multi-tenancy). Fetching by ID alone = cross-tenant vulnerability.
- Event and AuditLog tables are append-only. Never UPDATE or DELETE.
- Auth is fail-closed. Missing credentials = 500, not silent bypass.
- Webhooks must be idempotent. Catch P2002 unique constraint and re-fetch.
- External API calls must have timeouts (AbortController).
- No unbounded SELECT — always LIMIT.
- Domain functions accept optional db: DbClient parameter for transactions.
- Thin route handlers, fat lib — all business logic in src/lib/, route handlers in src/app/api/ stay thin.

REVIEW FOCUS (what makes this different from a correctness review):
1. OBSERVABILITY — Can you debug this in production? Are logs sufficient with correlation IDs? Is PII redacted (no phone numbers, emails, tokens, addresses in logs)?
2. ERROR MESSAGES — Are they actionable? Will an on-call engineer understand what went wrong?
3. FAILURE RECOVERY — What happens after a crash mid-operation? Is state left consistent?
4. NAMING & READABILITY — Can a new developer onboard to this code in 30 minutes?
5. CONTRACT CLARITY — Are function signatures, types, and return values self-documenting?
6. DEPLOYMENT SAFETY — Is this backward compatible? Safe to deploy with zero downtime?
7. INVARIANT COMPLIANCE — Do queries correctly rely on RLS (auth.uid()-scoped), with any service-role bypass justified? Are audit tables append-only (if present)? Is auth fail-closed?
8. STRUCTURAL HEALTH — Are functions under 80 lines? Is nesting under 4 levels? Functions with 6+ params should use options objects. Flag any function with cyclomatic complexity that would make a state diagram hard to draw. When modifying existing code, flag if the change made structural health worse.

SCOPE:
- The bundled content below is the raw diff (via `gh pr diff` or local `git diff`) for this branch — review it directly.
- You have no filesystem access; judge structural health, invariant compliance, and integration risk from the diff's context lines and hunks. If a finding is genuinely undecidable without seeing a whole file, say so explicitly rather than guessing.

Respond in this EXACT format:

VERDICT: SHIP IT | NEEDS WORK | BLOCK
CONFIDENCE: HIGH | MEDIUM | LOW

FINDINGS:
- [P0] <critical issue — must fix before deploy — cite file:line>
- [P1] <important issue — should fix before deploy — cite file:line>
- [P2] <minor issue — consider fixing — cite file:line>

For each finding, cite the specific file and approximate line. Be concrete — "query at foo.ts:42 uses the service-role client without justification, bypassing RLS" not "might have an access-control issue".
=== BUNDLED CONTENT ===
PROMPT
if [ -n "$PR_NUMBER" ]; then gh pr diff "$PR_NUMBER"; else git diff "$MERGE_BASE"..HEAD; fi; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-code-review-output.txt" 2>&1
```

Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top. Use a **180-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

**If a specific file was provided as argument**, append to the prompt (before the `=== BUNDLED CONTENT ===` marker): `Focus especially on: <file path>`

### Step 3: Present Results

1. Show the **raw Codex output** unmodified
2. Add Claude's assessment: agree or disagree with each finding (1-2 sentences per finding)
3. If running alongside `/review` and verdicts conflict, flag prominently

**DISMISSAL RULES (STRICT):**
- **"Out of scope" is NOT a valid dismissal.** If Codex found it in the changed files, it's in scope. Period.
- **"Pre-existing issue" requires proof.** Show `git blame` or `git log` proving the issue existed before this branch. If you can't prove it, treat it as a finding.
- **P0 findings CANNOT be dismissed by Claude.** Only the user can override a P0.
- **P1 findings require a concrete reason** to disagree — not "this is fine" or "not relevant." Cite the specific code that makes Codex wrong.
- **If Claude disagrees with 3+ findings, flag this to the user** — Claude may be rationalizing rather than fixing.
- **Default posture: Codex is right until proven wrong.** The whole point of an independent reviewer is that it catches things Claude missed or rationalized away.

## Output Format

```
### /codex-code-review Result

**Files on Branch:**
- <file list from changed-file command — NOT read by Claude>

**Raw Codex Output:**
<unmodified Codex response>

**Verdict:** SHIP IT / NEEDS WORK / BLOCK
**Confidence:** HIGH / MEDIUM / LOW

**Claude Assessment:**
- [Finding 1]: AGREE / DISAGREE — <1 sentence>
- [Finding 2]: AGREE / DISAGREE — <1 sentence>
...

Claude agrees with verdict: YES / NO — <1 sentence if disagreement>
```

## Failure Handling

**Codex-code-review is a BLOCKING gate when run standalone.** If it can't run, that's a setup problem to fix — not a reason to skip. When run inside `/pr`, Codex unavailability degrades gracefully (Claude-only review) but the PR comment MUST state "DEGRADED: Codex reviews unavailable. Single-model review only."

| Failure | Output | Action |
|---------|--------|--------|
| Codex CLI not installed | "BLOCKED — Codex CLI not installed. Run: `npm install -g @openai/codex`" | **Block gate** |
| Codex auth unavailable | "BLOCKED — Codex authentication unavailable. Run `codex login` or configure API key/session." | **Block gate** |
| Timeout (180s) | "BLOCKED — Codex API timeout (180s). Retry or check API status." | **Block gate** |
| Diff too large for stdin | Note truncation risk; split the bundle or narrow to the argument file if provided | Run anyway, flag in report |
| Unexpected error | "BLOCKED — <error message>" | **Block gate** |

**On NEEDS WORK or BLOCK verdict:** Gate is blocked. Fix the findings and re-run.
**On SHIP IT verdict:** Gate passes.

## When to Run

- In `/pr` pipeline (runs in parallel with `/review` and `/codex-pr-review`)
- Manual invocation: `/codex-code-review` or `/codex-code-review <file>`

## What NOT to Do

- Do NOT hand-summarize or paraphrase the diff into the prompt — pipe `gh pr diff` / `git diff` output raw and verbatim
- Do NOT pass file paths for Codex to read from disk — Codex has no filesystem access; the diff is the whole bundle
- Do NOT use `--json`, `-o`/`--output-last-message`, or `--full-auto` — use the canonical plugin-companion form (bundle to a file first — piping a live multi-command stream into the companion EAGAINs on stdin)
- Do NOT read .env files, credentials, or secrets — if a diff touches them, strip those hunks before bundling
- Do NOT skip on Codex failure — if Codex can't run, that's a blocker to fix
- Do NOT summarize Codex output — show it raw, then add your assessment separately
