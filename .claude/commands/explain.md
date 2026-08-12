---
name: explain
description: Explain code with ASCII diagrams and analogies
---

Explain code or an entire PR with visual aids, reasoning, and narrative.

**Usage:**
- `/explain <file-or-function>` — **Code mode**: explain a specific file or function with ASCII diagrams
- `/explain pr` — **PR mode**: explain the full branch as a narrative (for PR descriptions, reviews, or future-you)

---

## Mode 1: Code Explanation (`/explain <file>`)

### Structure

1. **Simple Analogy** (automotive style per CLAUDE.md)
   - Use everyday comparisons
   - Connect to ECU, traction control, gear changes, etc.

2. **ASCII Flow Diagram**
   - Show data/control flow visually
   - Keep it readable (80 chars wide max)

3. **Step-by-Step Walkthrough**
   - Number each step
   - Show what happens at each stage

4. **Common Gotchas**
   - Edge cases to watch for
   - Easy mistakes to make

5. **Related Docs** (if applicable)

### Communication Style

Use automotive analogies from CLAUDE.md:
- Domain layer = Engine Control Unit (ECU)
- Firebreak rule = Traction control
- Job status transitions = Gear changes
- API routes = Pedals and switches

---

## Mode 2: PR Explanation (`/explain pr`)

Read everything on the current branch, then write a narrative explaining **why** this PR exists and **why** the code looks the way it does.

### Step 1: Gather Context

Run these in parallel:

```bash
BASE_REF="${BASE_REF:-origin/main}"
git rev-parse --verify "$BASE_REF" >/dev/null 2>&1 || BASE_REF="main"
MERGE_BASE="$(git merge-base HEAD "$BASE_REF")"

# All changed files
{
  git diff --name-only "$MERGE_BASE"..HEAD
  git diff --name-only
  git diff --cached --name-only
  git ls-files --others --exclude-standard
} | awk 'NF' | sort -u

# Full diff
git diff "$MERGE_BASE"..HEAD
git diff
git diff --cached

# Commit history on this branch
git log --oneline "$MERGE_BASE"..HEAD

# Branch name (often contains slice/feature context)
git branch --show-current
```

Also check for:
- **Plan file**: look in system-reminder for `/Users/.../.claude/plans/*.md` — read it if it exists
- **Sprint doc**: check `docs/sprints/` for active sprint context referenced by the branch name

### Step 2: Read Changed Files

Read every file in the diff to understand the actual implementation. Also read key imports and callers (1 level deep) for integration context.

### Step 3: Write the Narrative

Write a long-form explanation structured as follows. This is meant to be thorough — length is fine as long as every section earns its place.

```markdown
## PR Explanation: <branch name or feature title>

### What This Does
<2-3 sentences. What does the system do differently after this PR merges? Write for someone who knows the product but hasn't read the code.>

### Why This Change Was Needed
<The problem or need that prompted this work. Reference sprint docs, backlog items, or user-reported issues if relevant. What was broken, missing, or suboptimal before?>

### How It Works
<Technical walkthrough of the approach. Walk through the key files in logical order — not alphabetical, but in the order someone would need to understand them. For each key file:>
- **What it does** (1 sentence)
- **Why it's structured this way** (the reasoning behind the approach)
- **Key decisions made** (parameter choices, algorithm selection, error handling strategy)

<Include ASCII flow diagrams where they clarify multi-step processes or data flow between files.>

### Decisions Made and Why
<The most valuable section. For each significant engineering decision:>
- **Decision**: What was chosen
- **Why**: The reasoning — constraints, trade-offs, prior art in the codebase
- **Alternatives considered**: What else could have been done and why it wasn't
- **Trade-offs accepted**: What was given up and why it was worth it

### Invariants and Patterns
<Which project invariants (org-scoping, idempotency, CAS, etc.) were relevant to this PR and how they shaped the implementation. Reference specific code if helpful.>

### What This Doesn't Do
<Explicit scope boundaries. What was intentionally left out, deferred, or out of scope. Reference backlog items if applicable.>

### Risk and Rollback
<What could go wrong. How to roll back if it does. Blast radius if something breaks.>
```

### Writing Guidelines

- **Write for future-you reviewing this PR in 6 months.** You won't remember the context. Spell it out.
- **Lead with reasoning, not description.** "We chose X because Y" beats "X was implemented."
- **Name files explicitly.** `src/lib/knowledge.ts` not "the knowledge module."
- **Be honest about trade-offs.** If something is hacky, say so and explain why it was the right call anyway.
- **Reference commit messages** when they add context about incremental decisions.
- **Reference the plan file** if one exists — note where the implementation matches or deviates from the plan.
- **Don't pad.** Every section should contain information the reader can't get from just reading the diff. If a section has nothing interesting, skip it.

### What NOT to Do

- Do NOT just describe what the code does — the diff already shows that
- Do NOT list every file changed without explaining why
- Do NOT include implementation details that are obvious from reading the code
- Do NOT add sections that say "N/A" — skip them instead
