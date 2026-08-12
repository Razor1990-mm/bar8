---
name: codex-spec-review
description: Codex thought partner — challenges a written spec against vision, roadmap, and real code
---

# Codex Spec Review (Thought Partner)

Codex reviews a **written spec** + strategic docs + real code (bundled by Claude via stdin — doctrine locked 2026-07-08, harness audit T12) and challenges assumptions. Different model = different blind spots. Catches systems thinking flaws Claude misses.

**Usage:** `/codex-spec-review` or `/codex-spec-review <spec-path>`

**When to run:** After `/spec` writes the spec, before `/codex-cto` + `/staff-review` validate it.

**Flow:** `/spec` (write) -> `/codex-spec-review` (challenge) -> revise if needed -> `/codex-cto` + `/staff-review` (validate)

---

## Step 1: Find and Read the Spec + Its Context

Look for the spec in:
1. Provided argument path
2. Most recently created file in `specs/`
3. Most recent spec discussed in conversation

**Read the spec.** Then read, for bundling in Step 2:
1. Strategic docs to understand where the product is going:
   - docs/start-here/VISION.md (north star, trust ladder, three pillars)
   - docs/start-here/PRODUCT_CONTEXT.md (ICP, scale targets, trust killers)
   - docs/roadmap/README.md (sprint-to-phase mapping, what's built vs planned)
   - docs/start-here/BACKLOG.md (recent decisions, deferred work)
2. The current sprint context: the latest file in docs/sprints/
3. The actual code the spec plans to change or depends on:
   - Every file listed in the spec's "Files Touched" section
   - The imports and callers of those files (1 level deep)
   - The relevant `supabase/migrations/*.sql` files if the spec touches data models
4. CLAUDE.md for project invariants and constraints

All of this becomes the bundle in Step 2 — Codex does not read from disk itself.

## Step 2: Bundle and Run Codex

```bash
{ cat <<'PROMPT'
You are a senior architect and product thinker reviewing a spec that someone else wrote. Your job is to be the skeptic — find what's wrong, what's missing, and what doesn't fit the bigger picture. Everything you need is bundled below, under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access.

The bundle below contains: the spec, the strategic docs (VISION, PRODUCT_CONTEXT, roadmap README, BACKLOG), the latest sprint doc, every file the spec's "Files Touched" section lists plus 1-level-deep imports/callers, the relevant Supabase migration SQL (if applicable), and CLAUDE.md.

CHALLENGE THE SPEC ON:

1. STRATEGIC FIT
   - Does this align with the product vision and current roadmap phase?
   - Is this the right thing to build NOW, or is it solving yesterday's problem?
   - Does it move the product toward the north star test: "As CEO, what should I be aware of?"

2. ARCHITECTURE DEFENSE (make Claude justify its choices)
   - The spec chose a specific approach in "Build vs Adopt" and "Control Flow Design." WHY?
   - Read the "External Research" section. Did they actually evaluate the alternatives, or just pick the first thing?
   - Is there a pattern ALREADY in the codebase that solves this differently? Check domain/ for similar orchestration, state machines, or data flows.
   - Would a different architectural pattern (event-driven vs request-response, push vs pull, single function vs pipeline) be fundamentally better?
   - If the spec says "custom implementation" — is there a library in package.json that already does this?
   - If the spec says "extend existing" — is the existing code actually designed for extension, or will this be a hack?
   - KEY QUESTION: "If I were building this from scratch with no sunk cost, would I choose this approach?"

3. WRONG ASSUMPTIONS
   - Does the spec assume something about the code that isn't true?
   - Are function signatures, return types, or data flows described correctly?
   - Does the schema actually support what the spec says it will do?

4. MISSING DEPENDENCIES
   - What does this spec need that doesn't exist yet?
   - Are there upstream changes required that the spec doesn't mention?
   - Will this break anything when it ships?

4. SIMPLER ALTERNATIVE
   - Is there a way to get 80% of the value with 20% of the work?
   - Does existing code already solve part of this problem?
   - Is the spec over-engineering something that could be simpler?

6. INTEGRATION GAPS
   - Where will this connect to existing systems? Are those seams ready?
   - Does the data flow end-to-end, or are there broken links?
   - Are there other specs in-flight that touch the same files?

7. SCOPE HONESTY
   - Is the LOC estimate realistic given what the code actually looks like?
   - Are there hidden costs the spec doesn't account for (test cleanup, migration, etc.)?
   - Is "out of scope" actually hiding work that's required for this to function?

RESPOND IN THIS EXACT FORMAT:

VERDICT: SOLID | REVISE | RETHINK
CONFIDENCE: HIGH | MEDIUM | LOW

STRATEGIC FIT:
- ALIGNED / MISALIGNED / PARTIALLY — <evidence from vision/roadmap>

ARCHITECTURE DEFENSE:
- Chosen approach: <what the spec chose>
- Better alternative exists: YES / NO — <cite existing code or library if YES>
- Build vs Adopt justified: YES / NO — <did the research actually evaluate alternatives?>
- Sunk cost influence: YES / NO — <is the spec choosing this because of existing code, not because it's best?>

CHALLENGES:
- [C1] <challenge — cite specific file:line in codebase as evidence>
- [C2] ...

WRONG ASSUMPTIONS:
- <assumption from spec — what the code actually shows>

MISSING DEPENDENCIES:
- <dependency the spec doesn't mention>

SIMPLER ALTERNATIVE (if any):
- <description, citing existing code>

INTEGRATION GAPS:
- <gap between this spec and existing system>

SCOPE HONESTY:
- LOC estimate realistic: YES / NO — <why>
- Hidden costs: <list any>

For every finding, cite the specific file and line from the bundled content. Be concrete.
=== BUNDLED CONTENT ===
PROMPT
cat "<INSERT_SPEC_PATH>" docs/start-here/VISION.md docs/start-here/PRODUCT_CONTEXT.md docs/roadmap/README.md docs/start-here/BACKLOG.md "<LATEST_SPRINT_DOC>" CLAUDE.md <INSERT_REFERENCED_FILE_PATHS>; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-spec-review.txt" 2>&1
```

**Important:** Replace `<INSERT_SPEC_PATH>`, `<LATEST_SPRINT_DOC>`, and `<INSERT_REFERENCED_FILE_PATHS>` with the actual paths before running. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top. Use **180-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

## Step 3: Present Results

1. Show the **raw Codex output** unmodified
2. Add Claude's assessment: AGREE or DISAGREE on each challenge
3. Ask the user: "Codex raised these concerns — which ones should we address before validation?"
4. If user says to address any: revise the spec, then re-run or proceed to validation

## Output Format

```
### /codex-spec-review Result

**Spec:** <spec path>

**Raw Codex Output:**
<unmodified>

**Verdict:** SOLID / REVISE / RETHINK
**Confidence:** HIGH / MEDIUM / LOW

**Claude Assessment:**
- [C1]: AGREE / DISAGREE — <1 sentence>
- [C2]: AGREE / DISAGREE — <1 sentence>
...

**Architecture Defense:**
- Better alternative exists: <Claude's response — defend or concede>
- Build vs Adopt: <Claude's response — was the research thorough?>
- Sunk cost: <Claude's response — honest assessment>

**Strategic Fit:** ALIGNED / MISALIGNED / PARTIALLY

**Action needed:** NONE / REVISE SPEC / DISCUSS WITH USER
```

## Failure Handling

| Failure | Output |
|---------|--------|
| Codex CLI not installed | "SKIPPED — install with npm i -g @openai/codex" |
| Codex auth unavailable | "SKIPPED — run codex login" |
| Timeout (180s) | "SKIPPED — Codex timeout" |
| No spec found | "SKIPPED — no spec file found" |

**If Codex unavailable:** SKIPPED. Proceed to `/codex-cto` + `/staff-review`. Never block the spec process on infrastructure.

## What This Skill Does NOT Do

- Does NOT write or modify the spec — only challenges it
- Does NOT replace `/codex-cto` — that validates feasibility against real code post-spec
- Does NOT replace `/staff-review` — that validates design quality
- Does NOT let Codex read from disk — Claude bundles the spec + all context via stdin (trust model: raw content, not Claude's paraphrase)

This skill answers ONE question: **"Is this the right spec to write, given where the product is going and what the code actually looks like?"**
