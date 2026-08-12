---
name: codex-sprint-cohesion
description: Codex-powered cross-spec wiring review. Independent second opinion on whether sprint specs form a working system. Run alongside /sprint-cohesion.
model: sonnet
---

Codex independently reviews all specs in a sprint for cross-spec wiring gaps. Different model = different blind spots. Catches producer/consumer chain breaks that Claude systematically misses.

**Usage:** `/codex-sprint-cohesion` or `/codex-sprint-cohesion <sprint-prefix>`

**When to run:** Alongside `/sprint-cohesion`, after all specs are written. Both reviews run, then Claude reconciles.

**Why this exists (2026-04-04):** Sprint 29E cohesion review — Claude's `/sprint-cohesion` found 1 P0 + 2 P1s. Codex found 4 additional real gaps Claude missed entirely (department write tools not setting simulationRunId, CoS signature missing params, orphaned package.json script, success criteria not achievable). Different model catches different wiring gaps.

---

## Process

### Step 1: Find Sprint Specs

1. Determine sprint prefix from argument or current branch (e.g., `sprint-29e` → `29e`)
2. Find all spec files: `specs/sprint-<prefix>*.md`
3. Find sprint doc: `docs/sprints/sprint-<prefix>*.md`
4. Extract the **Success** line from the sprint doc TL;DR

### Step 2: Bundle and Run Codex

**CRITICAL: Pipe specs via stdin — this is the canonical codex input doctrine (locked 2026-07-08, harness audit T12), and it's how this skill discovered the pattern in the first place.** Codex hangs/times out when told to read many files from disk. Learned the hard way — 3 consecutive timeouts in Sprint 29E until we switched to stdin.

```bash
{ cat <<'PROMPT'
You are reviewing <N> specs for <Sprint Name>, bundled below under === BUNDLED CONTENT ===. You have no filesystem access — review exactly this bundled content; do not ask for repo access. Check CROSS-SPEC WIRING only:

1. Does every spec's output have a consumer in another spec or existing code?
2. Does every spec's input have a producer? If a spec queries a field, does another spec create/populate that field?
3. Are there file conflicts (same file touched by multiple specs)?
4. Can the success criteria ('<SUCCESS LINE>') be achieved from these specs?
5. Any orphaned infrastructure (built but 0 callers)?
6. Any function signatures that don't match between producer and consumer specs?

VERDICT: COHERENT / GAPS FOUND / MAJOR GAPS. Max 400 words. Be specific about which spec produces and which consumes for every gap.
=== BUNDLED CONTENT ===
PROMPT
cat specs/<sprint-prefix>*.md; } > "$SCRATCH/codex-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/codex-bundle.txt" > "$SCRATCH/codex-sprint-cohesion.txt" 2>&1
```

**Replace:**
- `<N>` with spec count
- `<Sprint Name>` with sprint title
- `<sprint-prefix>` with the prefix (e.g., `sprint-29e`)
- `<SUCCESS LINE>` with the sprint doc's Success criteria

Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top. Use **120-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

### Step 3: Present Results

**Do NOT tell Codex what Claude's `/sprint-cohesion` found.** Independence is the value.

```
### /codex-sprint-cohesion Result

**Sprint:** <sprint name>
**Specs reviewed:** <count>

**Raw Codex Output:**
<unmodified Codex response>

**Codex Verdict:** COHERENT / GAPS FOUND / MAJOR GAPS

**Claude Assessment of Codex Findings:**
- [Finding 1]: AGREE / DISAGREE — <1 sentence + action if AGREE>
- [Finding 2]: AGREE / DISAGREE — <1 sentence + action if AGREE>
...

**Gaps to fix:** <list only AGREE findings that need spec changes>
```

If running alongside `/sprint-cohesion`, add a combined verdict:

```
### Combined Cohesion Verdict

| Review | Verdict | Unique Findings |
|--------|---------|-----------------|
| Claude `/sprint-cohesion` | <verdict> | <count> |
| Codex `/codex-sprint-cohesion` | <verdict> | <count> |

**Combined:** COHERENT / GAPS FOUND / MAJOR GAPS
**Fix before implementation:** <list all agreed gaps from both reviews>
```

---

## Failure Handling

| Failure | Output | Action |
|---------|--------|--------|
| Codex CLI not installed | "SKIPPED — install with npm i -g @openai/codex" | `/sprint-cohesion` alone gates |
| Codex timeout (120s) | "SKIPPED — Codex timeout" | `/sprint-cohesion` alone gates |
| No specs found | "SKIPPED — no specs matching prefix" | Check prefix |
| Codex reviews wrong specs | "SKIPPED — misroute detected" | Verify stdin pipe worked |

**If Codex unavailable:** SKIPPED. `/sprint-cohesion` (Claude) alone gates implementation. Never block on infrastructure.

---

## What This Skill Does NOT Do

- Does NOT re-review individual specs (that's `/codex-cto` and `/codex-spec-review`)
- Does NOT check feasibility against real code (that's `/codex-cto`)
- Does NOT replace Claude's `/sprint-cohesion` (complementary, not replacement)
- Does NOT read code files — reviews specs only (cross-spec wiring focus)

This skill answers ONE question: **"Do these specs form a working system, or are there broken wires between them?"**

---

## Workflow Integration

The recommended sprint spec workflow is now:

```
/spec (per-spec, full process)
  → /codex-spec-review (per-spec, challenges assumptions)
  → /codex-cto + /staff-review (per-spec, validates)
  → repeat for all specs
  → /sprint-cohesion + /codex-sprint-cohesion (cross-spec, run in parallel)
  → fix gaps from both reviews
  → implement
```
