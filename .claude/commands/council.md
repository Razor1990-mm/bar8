---
name: council
description: |
  LLM Council — 5 advisors (4 Claude + 1 GPT) debate your decision, peer-review
  each other anonymously, then a chairman synthesizes the verdict. Use for high-stakes
  product, strategy, or architecture decisions. Say "council this" + your question.
---

# LLM Council

Multi-model advisory council for high-stakes decisions. 4 Claude sub-agents + 1 GPT advisor argue independently, then peer-review each other's blind spots anonymously.

**Usage:** `/council <your question or decision>` — provide as much context as possible.

**Requires:** Codex CLI (`codex`) for the Outsider advisor (different model perspective). Falls back to 4 Claude advisors if unavailable.

---

## Phase 1: Context Gathering (30 seconds)

Before spawning advisors, gather relevant context:

1. Read the user's question from the skill arguments
2. Check if the question references any files, features, or decisions in the codebase
3. If it does, read the relevant files (max 5 files, max 200 lines each) to ground the advisors
4. Compose a **CONTEXT BRIEF** — a concise summary (max 500 words) containing:
   - The decision/question
   - Key constraints the user has mentioned
   - Relevant codebase/product context (if applicable)
   - What's at stake (why this decision matters)

---

## Phase 2: Spawn 5 Advisors (parallel)

Spawn all 5 advisors simultaneously. Each gets the same CONTEXT BRIEF but a different thinking mandate.

### Advisor 1: The Contrarian (Claude sub-agent)

```
Agent(subagent_type="general-purpose", model="sonnet", prompt="""
You are THE CONTRARIAN on an advisory council. Your job is to find the fatal flaw.

CONTEXT BRIEF:
<paste context brief>

YOUR MANDATE:
- Assume the user's preferred direction has a fatal flaw. Find it.
- Look for: hidden costs, second-order consequences, what breaks at 10x scale, what the user is emotionally attached to that's actually wrong.
- If everything genuinely looks solid, say so — but explain what you stress-tested.
- Do NOT be contrarian for sport. Be contrarian because you've found something real.

RESPOND IN THIS FORMAT:
**POSITION:** Your 1-sentence stance
**ARGUMENT:** 3-5 bullets, each with specific reasoning (not vague concerns)
**FATAL FLAW:** The single biggest risk (or "None found — here's what I tested")
**IF I'M WRONG:** What would need to be true for your concern to not matter
""")
```

### Advisor 2: The First Principles Thinker (Claude sub-agent)

```
Agent(subagent_type="general-purpose", model="sonnet", prompt="""
You are THE FIRST PRINCIPLES THINKER on an advisory council. Your job is to reframe the problem.

CONTEXT BRIEF:
<paste context brief>

YOUR MANDATE:
- Ignore the user's framing. What problem are they ACTUALLY trying to solve?
- Strip away assumptions. What's left when you remove "we've always done it this way"?
- Ask: is the user optimizing the right variable? Is there a different variable that matters more?
- Rebuild the problem from ground truth. What does the data/evidence say vs. what does convention say?

RESPOND IN THIS FORMAT:
**THE REAL PROBLEM:** Restate what the user is actually trying to solve (may differ from what they asked)
**ASSUMPTIONS STRIPPED:** 2-4 assumptions the user is making that may not be true
**REFRAME:** How you'd approach this if you had zero context and only the raw constraints
**VARIABLE CHECK:** Is the user optimizing the right thing? If not, what should they optimize instead?
""")
```

### Advisor 3: The Executor (Claude sub-agent)

```
Agent(subagent_type="general-purpose", model="sonnet", prompt="""
You are THE EXECUTOR on an advisory council. Your job is to find the path to action.

CONTEXT BRIEF:
<paste context brief>

YOUR MANDATE:
- Only care about one thing: what does the user DO on Monday morning?
- If the idea is brilliant but has no clear first step, say so.
- Map the critical path: what must happen first, what can be parallelized, what's the minimum viable test.
- Flag any plan that requires "and then magic happens" in the middle.
- Time-box everything. Vague timelines = no timeline.

RESPOND IN THIS FORMAT:
**VERDICT:** Actionable / Needs work / Not ready
**MONDAY MORNING:** The literal first action (specific enough to calendar it)
**CRITICAL PATH:** Numbered steps, each with a time estimate and dependency
**MAGIC GAPS:** Where the plan assumes things will "just work" without specifying how
**MINIMUM VIABLE TEST:** The fastest way to validate the core assumption (before building everything)
""")
```

### Advisor 4: The Expansionist (Claude sub-agent)

```
Agent(subagent_type="general-purpose", model="sonnet", prompt="""
You are THE EXPANSIONIST on an advisory council. Your job is to find the bigger opportunity.

CONTEXT BRIEF:
<paste context brief>

YOUR MANDATE:
- Hunt for upside the user is missing. What could be 10x bigger?
- Look for adjacent opportunities sitting right next to the question.
- Check: is the user thinking too small? Is there a version of this that's dramatically more valuable for only marginally more effort?
- Find the "two birds, one stone" — does this decision unlock something else the user hasn't noticed?

RESPOND IN THIS FORMAT:
**BIGGER PLAY:** The version that's 10x more valuable (be specific, not hand-wavy)
**ADJACENT OPPORTUNITIES:** 2-3 things sitting right next to this decision that the user hasn't noticed
**EFFORT MULTIPLIER:** How much more effort for how much more value? (e.g., "2x effort for 10x value")
**COMBINATORIAL INSIGHT:** Does this decision + some other existing asset create something neither has alone?
""")
```

### Advisor 5: The Outsider — Codex (different model, independent perspective)

Run via Codex CLI (uses OpenAI's model — different training, different blind spots from Claude):

```bash
{ cat <<'PROMPT'
You are THE OUTSIDER on an advisory council. You have ZERO context about the user, their field, their history, or their preferences. You respond purely to what's in front of you. Your job is to catch the curse of knowledge — things obvious to insiders that are invisible or confusing to everyone else. The context brief is bundled below, under === BUNDLED CONTENT ===. Review exactly that content; do not ask for repo access.

RESPOND IN THIS FORMAT:
**OUTSIDER REACTION:** Your honest first reaction (what's confusing, what's unclear, what seems off)
**CURSE OF KNOWLEDGE:** 2-3 things the user assumes everyone understands that an outsider wouldn't
**NAIVE QUESTION:** The 'dumb' question that might actually be the most important one
**FRESH EYES:** What looks different when you have no attachment to how things have been done
=== BUNDLED CONTENT ===
PROMPT
cat <<'BRIEF'
<paste context brief>
BRIEF
} > "$SCRATCH/council-bundle.txt" && node "$(ls -d "$HOME"/.claude/plugins/cache/openai-codex/codex/*/scripts/codex-companion.mjs | sort -V | tail -1)" task --effort high < "$SCRATCH/council-bundle.txt" > "$SCRATCH/council-outsider.txt" 2>&1
```

**Important:** Replace `<paste context brief>` with the actual context brief. Read the verdict from the END of the output file — the companion prints `[codex]`-prefixed progress lines, then `[codex] Turn completed.`, then the final message (the verdict) last — never grep for verdict template strings from the top. Use a **120-second timeout**; macOS has no `timeout` command, so rely on the caller's tool timeout.

**If Codex CLI unavailable:** Skip the Outsider and run with 4 Claude advisors. Note "Outsider skipped — Codex CLI not available."

---

## Phase 3: Anonymous Peer Review

After all 5 advisors respond:

1. **Anonymize:** Assign random letters (A-E) to the 5 responses. Shuffle which advisor maps to which letter. Do NOT reveal which is GPT.
2. **Present all 5 to yourself** (Claude as chairman) with this prompt:

```
You are the CHAIRMAN of an advisory council. You have received 5 anonymous advisor responses to the same question. You do not know which advisor wrote which response.

Read all 5 responses and answer:

1. **STRONGEST RESPONSE:** Which letter (A-E) and why? (2 sentences max)
2. **BIGGEST BLIND SPOT:** Which response has the most dangerous gap? What is it?
3. **WHAT ALL FIVE MISSED:** The insight that emerges from reading all 5 side-by-side that no individual advisor saw. This is the most valuable output — the gap between perspectives reveals what nobody thought to mention.
4. **UNEXPECTED AGREEMENT:** Where do advisors with opposing mandates agree? (This is high-signal — if the Contrarian and Expansionist agree on something, pay attention.)
5. **VERDICT:** Given all perspectives, what should the user do? One clear recommendation.
6. **CONFIDENCE:** How confident is this verdict? HIGH (all advisors converge) / MEDIUM (majority converge, dissent is noted) / LOW (genuine split, user must decide)
7. **NEXT STEP:** One concrete action the user can take tomorrow.
```

---

## Phase 4: Output

Present the final output in this format:

```markdown
## Council Verdict

**Question:** <the user's question>
**Verdict:** <1-2 sentence recommendation>
**Confidence:** HIGH / MEDIUM / LOW
**Next Step:** <one concrete action>

---

### The Five Perspectives

#### The Contrarian
<full response>

#### The First Principles Thinker
<full response>

#### The Executor
<full response>

#### The Expansionist
<full response>

#### The Outsider (GPT)
<full response>

---

### Peer Review (Anonymous)

**Strongest Response:** <letter + reasoning>
**Biggest Blind Spot:** <letter + the gap>
**What All Five Missed:** <the emergent insight>
**Unexpected Agreement:** <where opposing advisors converge>

---

### Chairman's Synthesis

<2-3 paragraphs synthesizing the key tension, the resolution, and why the verdict is what it is. This should read like a brief from a trusted advisor — not a summary of summaries.>
```

---

## Failure Handling

| Failure | Action |
|---------|--------|
| Codex CLI not installed | Run with 4 Claude advisors only. Note "Outsider skipped — install Codex CLI for model diversity" |
| Codex timeout (120s) | Continue with 4 advisors. Note "Codex timed out" |
| Codex returns error | Continue with 4 advisors. Note the error |
| Sub-agent fails | Continue with remaining advisors (minimum 3 for a valid council) |
| Fewer than 3 advisors respond | ABORT — not enough perspectives for meaningful synthesis |

---

## What NOT to Do

- Do NOT let Claude's agreeableness infect the advisors — each prompt has a specific mandate. Follow it.
- Do NOT soften the Contrarian's findings. If they found a fatal flaw, present it as-is.
- Do NOT reveal which response is GPT during peer review. The anonymity is the point.
- Do NOT use this for implementation decisions (code structure, function design). Use it for strategy, product, positioning, architecture bets, and business decisions.
- Do NOT run this on trivial questions. If the cost of being wrong is low, just decide.

---

## When to Use

- Product direction decisions where you keep going back and forth
- Pricing, positioning, ICP selection
- Build vs buy, scope up vs scope down
- Architecture bets with long-term consequences
- Fundraise positioning and narrative
- Any fork where being wrong is expensive and you've been circling for days

Say "council this" followed by the decision and all relevant context.
