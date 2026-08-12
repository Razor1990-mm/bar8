---
name: check-pr-overlap
description: Detect cross-PR file overlaps among open PRs — surface divergent fixes before they collide on merge
model: sonnet
---

Detect when two open PRs touch the same files and surface the overlap with commits + line-level conflict status. Pure shell, no LLM. Use this BEFORE `/codex-pr-review` so the reviewer has cross-PR context, or any time multiple PRs are in flight against shared infrastructure.

**Why this exists:** two PRs can both fix the same underlying issue with different shapes — neither review catches the divergence because each is scoped to its own diff, and you end up having to manually unwind one of them. This skill catches that class of conflict in 5 seconds.

**Usage:**
- `/check-pr-overlap` — scan all open PRs
- `/check-pr-overlap 325 326` — specific pair
- `/check-pr-overlap 325 326 324` — N-way scan (every pair within the set)

## Process

### Step 1: Resolve PR set

If args provided, use those PR numbers. Otherwise, list every open PR:

```bash
if [ $# -eq 0 ]; then
  PRS=$(gh pr list --state open --json number --jq '.[].number')
else
  PRS="$@"
fi
```

### Step 2: Fetch per-PR metadata

For each PR, capture: number, title, head branch, head SHA, and the full file list of its diff.

```bash
for pr in $PRS; do
  gh pr view "$pr" --json number,title,headRefName,headRefOid,files \
    > "/tmp/pr-overlap-$pr.json"
done
```

### Step 3: Compute pairwise file intersections

For each ordered pair `(A, B)` with `A < B`, intersect their file lists. Skip empty intersections.

```bash
for a in $PRS; do
  for b in $PRS; do
    [ "$a" -lt "$b" ] || continue
    shared=$(comm -12 \
      <(jq -r '.files[].path' "/tmp/pr-overlap-$a.json" | sort -u) \
      <(jq -r '.files[].path' "/tmp/pr-overlap-$b.json" | sort -u))
    [ -z "$shared" ] && continue
    echo "::PAIR $a vs $b::"
    echo "$shared"
  done
done
```

### Step 4: For each overlap, classify the risk

For every shared file in each pair:

1. **List recent commits on each PR's branch that touched this file** (limit 5 each):
   ```bash
   gh pr view "$a" --json commits --jq '.commits[].oid' | \
     while read sha; do
       git log -1 --format="%h %s" "$sha" -- "$file"
     done | grep -v '^$' | head -5
   ```

2. **Detect line-level conflict** by comparing the two PRs' diffs against `origin/main` (their common base, modulo stacking):
   - `git diff origin/main..<pr-a-head> -- <file> > /tmp/a.diff`
   - `git diff origin/main..<pr-b-head> -- <file> > /tmp/b.diff`
   - If the line ranges (header `@@ -X,Y +X,Y @@`) overlap → **HARD CONFLICT** (one will overwrite the other on rebase).
   - If they don't overlap → **CO-EXIST** (both can land, just need ordering).
   - If both diffs are byte-identical → **DUPLICATE WORK** (one PR can drop the change).

   Use a small helper:
   ```bash
   classify_overlap() {
     local file=$1 sha_a=$2 sha_b=$3
     local da=$(git diff origin/main.."$sha_a" -- "$file")
     local db=$(git diff origin/main.."$sha_b" -- "$file")
     [ "$da" = "$db" ] && echo "DUPLICATE" && return
     # Extract line ranges from @@ headers, check overlap
     ranges_a=$(echo "$da" | grep '^@@' | awk '{print $2}')
     ranges_b=$(echo "$db" | grep '^@@' | awk '{print $2}')
     # If any range from A overlaps any range from B, it's a hard conflict
     for ra in $ranges_a; do
       a_start=$(echo "$ra" | tr -d '-' | cut -d, -f1)
       a_len=$(echo "$ra" | tr -d '-' | cut -d, -f2)
       a_len=${a_len:-1}
       a_end=$((a_start + a_len))
       for rb in $ranges_b; do
         b_start=$(echo "$rb" | tr -d '-' | cut -d, -f1)
         b_len=$(echo "$rb" | tr -d '-' | cut -d, -f2)
         b_len=${b_len:-1}
         b_end=$((b_start + b_len))
         # Overlap iff a_start < b_end AND b_start < a_end
         if [ "$a_start" -lt "$b_end" ] && [ "$b_start" -lt "$a_end" ]; then
           echo "HARD_CONFLICT"
           return
         fi
       done
     done
     echo "CO_EXIST"
   }
   ```

   **Stacked-PR handling:** if PR B's base is PR A's head (detect via `gh pr view <num> --json baseRefName` matching the other PR's `headRefName`), the line-overlap check against `origin/main` is wrong (it counts A's changes twice). Instead:

   - Compute A's diff against main: `git diff origin/main..A-head -- <file>`
   - Compute B's INCREMENTAL diff (just B's changes on top of A): `git diff A-head..B-head -- <file>`
   - If B's incremental diff is empty → **STACKED_LAYERED** (B inherits A's version unchanged; safe).
   - If B's incremental diff modifies line ranges that A added → **STACKED_OVERWRITE** (B is rewriting work A just did — red flag, review the intent. The FX.5 collision between PR #325 and PR #326 was this case).
   - If B's incremental diff touches a different region of the same file → **STACKED_LAYERED** (intentional layering, fine).

   STACKED_OVERWRITE is the case the FX.5 collision hit: PR #325 commit 8797db83 added one fix to `routes/internal/transcripts.ts`; PR #326 commit 66af79e6 rewrote those same lines with a different fix. The skill must catch this — never treat "stacked" as automatically safe.

### Step 5: Emit the report

For each pair with overlap, output a compact block. For every STACKED_OVERWRITE or HARD_CONFLICT file, ALSO print the commit subjects on each PR that touched it — this is the signal that separates "intentional refactor on top" (same slice/finding ID extending the work) from "accidental collision" (both PRs trying to solve the same problem with different shapes).

```
═══════════════════════════════════════════════════════════════
PR #<A> "<title-a>"  ↔  PR #<B> "<title-b>"
   #<A>: <head-a> on <branch-a>
   #<B>: <head-b> on <branch-b>
   Stacking: <INDEPENDENT | STACKED_B_ON_A | STACKED_A_ON_B>

   Shared files:
     <file-1>  →  <verdict>
        #<A> touched in: <sha> <subject>     ← only for OVERWRITE/CONFLICT
        #<B> touched in: <sha> <subject>     ← only for OVERWRITE/CONFLICT
     <file-2>  →  <verdict>
═══════════════════════════════════════════════════════════════
```

End with a verdict line:

```
VERDICT: <N> HARD_CONFLICT, <N> STACKED_OVERWRITE, <N> DUPLICATE, <N> CO_EXIST, <N> STACKED_LAYERED
RECOMMENDATION: <see below>
```

**How to read the commit subjects on STACKED_OVERWRITE files:**
- **Both PRs reference the same slice/finding ID (e.g., both say "FX.5")** → likely a collision. Two different shapes for the same fix. Review each diff and pick one. This is the case the skill exists to catch.
- **Different IDs / different concerns** → likely intentional layering. The upstack PR is extending or revising the downstack PR's work for a different reason. Proceed.
- **Upstack message starts with "fix(...)" or "revert(...)" on a downstack "feat(...)"** → usually intentional; the fix/revert pattern is normal stacking.

### Step 6: Recommendation rubric

| Situation | Recommendation |
|---|---|
| Zero overlaps | `No overlap. Safe to land independently.` |
| Only STACKED_LAYERED overlaps | `Stacked layering. Merge in dependency order; no manual reconciliation needed.` |
| 1+ DUPLICATE | `Drop the duplicate work from one PR. Surface to author.` |
| 1+ CO_EXIST (no HARD_CONFLICT, no STACKED_OVERWRITE) | `Merge in any order. Tests should catch any unexpected interaction.` |
| 1+ STACKED_OVERWRITE | `REVIEW upstack PR's rewriting of downstack PR's lines. If intentional (refactor), proceed. If accidental, BLOCK and reconcile — usually means downstack work should be reverted to let upstack own the final shape.` |
| 1+ HARD_CONFLICT | `BLOCK both PRs until reconciled. Pick the structurally better approach. Revert the alternative's changes to those file(s).` |

## When to Run

- **Before `/codex-pr-review`** on any PR — gives the reviewer 1-paragraph cross-PR context.
- **Before any sprint kickoff** when 2+ audit-fix or hotfix PRs are still open. Catches cross-cutting collisions.
- **After force-pushing or stacking** — verify the merge-order assumption.

## Failure Handling

| Failure | Output | Action |
|---------|--------|--------|
| `gh` not authenticated | "BLOCKED — Run `gh auth login`." | Block |
| PR number doesn't exist | "BLOCKED — PR #<n> not found or not in this repo." | Block |
| No open PRs | "No open PRs. Nothing to check." | Exit 0 |
| Stacked-PR detection fails (base ref deleted) | Continue, label STACKING as UNKNOWN | Warn, don't block |

## What this does NOT do

- Does NOT read file contents or do semantic conflict detection (line-range overlap is the proxy).
- Does NOT score severity — that's the reviewer's call given the recommendation.
- Does NOT modify any state — read-only.
