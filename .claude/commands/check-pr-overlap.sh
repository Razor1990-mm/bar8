#!/usr/bin/env bash
# Verification run of /check-pr-overlap against open PRs

set -euo pipefail

if ! command -v gh >/dev/null 2>&1; then
  echo "BLOCKED — gh not installed"; exit 1
fi

PRS=("$@")
if [ ${#PRS[@]} -eq 0 ]; then
  mapfile -t PRS < <(gh pr list --state open --json number --jq '.[].number')
fi
if [ ${#PRS[@]} -eq 0 ]; then
  echo "No open PRs. Nothing to check."; exit 0
fi

# Fetch metadata for each PR
mkdir -p /tmp/pr-overlap
for pr in "${PRS[@]}"; do
  gh pr view "$pr" --json number,title,headRefName,headRefOid,baseRefName,files \
    > "/tmp/pr-overlap/pr-${pr}.json" 2>/dev/null || {
    echo "BLOCKED — PR #${pr} not found or not in this repo."; exit 1
  }
done

# Classify each shared file in each pair
classify_overlap() {
  local file=$1 sha_a=$2 sha_b=$3 base_a=$3 base_b=$4
  # Diff each PR's branch against origin/main
  local da db
  da=$(git diff "origin/main..$sha_a" -- "$file" 2>/dev/null || echo "")
  db=$(git diff "origin/main..$sha_b" -- "$file" 2>/dev/null || echo "")
  if [ -z "$da" ] && [ -z "$db" ]; then
    echo "EMPTY"; return
  fi
  if [ "$da" = "$db" ]; then
    echo "DUPLICATE"; return
  fi
  # Extract @@ header line ranges from each diff
  local ra rb
  ra=$(echo "$da" | grep '^@@' | awk '{print $3}' | tr -d '+')
  rb=$(echo "$db" | grep '^@@' | awk '{print $3}' | tr -d '+')
  local r1 r2 s1 l1 e1 s2 l2 e2
  for r1 in $ra; do
    s1=$(echo "$r1" | cut -d, -f1)
    l1=$(echo "$r1" | cut -s -d, -f2)
    l1=${l1:-1}
    e1=$((s1 + l1))
    for r2 in $rb; do
      s2=$(echo "$r2" | cut -d, -f1)
      l2=$(echo "$r2" | cut -s -d, -f2)
      l2=${l2:-1}
      e2=$((s2 + l2))
      if [ "$s1" -lt "$e2" ] && [ "$s2" -lt "$e1" ]; then
        echo "HARD_CONFLICT"; return
      fi
    done
  done
  echo "CO_EXIST"
}

# Stacking detection: B is stacked on A if B's baseRefName == A's headRefName
is_stacked() {
  local a=$1 b=$2
  local head_a base_b
  head_a=$(jq -r '.headRefName' "/tmp/pr-overlap/pr-${a}.json")
  base_b=$(jq -r '.baseRefName' "/tmp/pr-overlap/pr-${b}.json")
  [ "$head_a" = "$base_b" ] && echo "STACKED_B_ON_A" && return 0
  local head_b base_a
  head_b=$(jq -r '.headRefName' "/tmp/pr-overlap/pr-${b}.json")
  base_a=$(jq -r '.baseRefName' "/tmp/pr-overlap/pr-${a}.json")
  [ "$head_b" = "$base_a" ] && echo "STACKED_A_ON_B" && return 0
  echo "INDEPENDENT"
}

# For stacked PRs: classify whether the upstack PR's INCREMENTAL diff
# overwrites lines that the downstack PR added.
#   stacking = STACKED_B_ON_A → A is downstack, B is upstack
#   stacking = STACKED_A_ON_B → B is downstack, A is upstack
classify_stacked_overlap() {
  local file=$1 down_sha=$2 up_sha=$3
  local down_diff up_incr
  down_diff=$(git diff "origin/main..$down_sha" -- "$file" 2>/dev/null || echo "")
  up_incr=$(git diff "$down_sha..$up_sha" -- "$file" 2>/dev/null || echo "")
  if [ -z "$up_incr" ]; then
    echo "STACKED_LAYERED"; return
  fi
  # Extract `+` line ranges from each diff (post-change line numbers).
  local down_ranges up_ranges
  down_ranges=$(echo "$down_diff" | grep '^@@' | awk '{print $3}' | tr -d '+')
  up_ranges=$(echo "$up_incr" | grep '^@@' | awk '{print $3}' | tr -d '+')
  local r1 r2 s1 l1 e1 s2 l2 e2
  for r1 in $down_ranges; do
    s1=$(echo "$r1" | cut -d, -f1)
    l1=$(echo "$r1" | cut -s -d, -f2); l1=${l1:-1}
    e1=$((s1 + l1))
    for r2 in $up_ranges; do
      s2=$(echo "$r2" | cut -d, -f1)
      l2=$(echo "$r2" | cut -s -d, -f2); l2=${l2:-1}
      e2=$((s2 + l2))
      if [ "$s1" -lt "$e2" ] && [ "$s2" -lt "$e1" ]; then
        echo "STACKED_OVERWRITE"; return
      fi
    done
  done
  echo "STACKED_LAYERED"
}

HARD=0; DUP=0; CO=0; STK=0; OVERWRITE=0
REPORT=""

for a in "${PRS[@]}"; do
  for b in "${PRS[@]}"; do
    [ "$a" -lt "$b" ] || continue
    shared=$(comm -12 \
      <(jq -r '.files[].path' "/tmp/pr-overlap/pr-${a}.json" | sort -u) \
      <(jq -r '.files[].path' "/tmp/pr-overlap/pr-${b}.json" | sort -u))
    [ -z "$shared" ] && continue
    title_a=$(jq -r '.title' "/tmp/pr-overlap/pr-${a}.json")
    title_b=$(jq -r '.title' "/tmp/pr-overlap/pr-${b}.json")
    head_a=$(jq -r '.headRefOid' "/tmp/pr-overlap/pr-${a}.json")
    head_b=$(jq -r '.headRefOid' "/tmp/pr-overlap/pr-${b}.json")
    branch_a=$(jq -r '.headRefName' "/tmp/pr-overlap/pr-${a}.json")
    branch_b=$(jq -r '.headRefName' "/tmp/pr-overlap/pr-${b}.json")
    stacking=$(is_stacked "$a" "$b")
    REPORT+="═══════════════════════════════════════════════════════════════"$'\n'
    REPORT+="PR #${a}  ↔  PR #${b}"$'\n'
    REPORT+="   #${a}: ${title_a:0:80}"$'\n'
    REPORT+="        ${head_a:0:8} on ${branch_a}"$'\n'
    REPORT+="   #${b}: ${title_b:0:80}"$'\n'
    REPORT+="        ${head_b:0:8} on ${branch_b}"$'\n'
    REPORT+="   Stacking: ${stacking}"$'\n'
    REPORT+="   Shared files:"$'\n'
    while IFS= read -r file; do
      [ -z "$file" ] && continue
      case "$stacking" in
        STACKED_B_ON_A)
          verdict=$(classify_stacked_overlap "$file" "$head_a" "$head_b")
          ;;
        STACKED_A_ON_B)
          verdict=$(classify_stacked_overlap "$file" "$head_b" "$head_a")
          ;;
        *)
          verdict=$(classify_overlap "$file" "$head_a" "$head_b")
          ;;
      esac
      case "$verdict" in
        HARD_CONFLICT)     HARD=$((HARD+1));;
        DUPLICATE)         DUP=$((DUP+1));;
        CO_EXIST)          CO=$((CO+1));;
        STACKED_LAYERED)   STK=$((STK+1));;
        STACKED_OVERWRITE) OVERWRITE=$((OVERWRITE+1));;
      esac
      REPORT+="     ${file}  →  ${verdict}"$'\n'
      # For OVERWRITE / HARD_CONFLICT, print commit subjects so the human
      # can judge "intentional refactor" vs "accidental collision."
      if [ "$verdict" = "STACKED_OVERWRITE" ] || [ "$verdict" = "HARD_CONFLICT" ]; then
        msg_a=$(git log --oneline "origin/main..$head_a" -- "$file" 2>/dev/null | head -2)
        msg_b=$(git log --oneline "$head_a..$head_b" -- "$file" 2>/dev/null | head -2)
        [ -n "$msg_a" ] && REPORT+="        #${a} touched in: ${msg_a//$'\n'/$'\n'         }"$'\n'
        [ -n "$msg_b" ] && REPORT+="        #${b} touched in: ${msg_b//$'\n'/$'\n'         }"$'\n'
      fi
    done <<< "$shared"
    REPORT+=""$'\n'
  done
done

echo "$REPORT"
echo "═══════════════════════════════════════════════════════════════"
echo "VERDICT: ${HARD} HARD_CONFLICT, ${OVERWRITE} STACKED_OVERWRITE, ${DUP} DUPLICATE, ${CO} CO_EXIST, ${STK} STACKED_LAYERED"
if [ "$HARD" -gt 0 ]; then
  echo "RECOMMENDATION: BLOCK both PRs until reconciled. Pick the structurally better approach."
elif [ "$OVERWRITE" -gt 0 ]; then
  echo "RECOMMENDATION: REVIEW upstack PR's rewriting of downstack PR's lines. If intentional refactor, proceed. If accidental, BLOCK and reconcile."
elif [ "$DUP" -gt 0 ]; then
  echo "RECOMMENDATION: Drop the duplicate work from one PR. Surface to author."
elif [ "$CO" -gt 0 ]; then
  echo "RECOMMENDATION: Merge in any order. Tests should catch unexpected interaction."
elif [ "$STK" -gt 0 ]; then
  echo "RECOMMENDATION: Stacked layering. Merge in dependency order; no manual reconciliation needed."
else
  echo "RECOMMENDATION: No overlap. Safe to land independently."
fi
