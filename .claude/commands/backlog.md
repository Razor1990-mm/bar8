---
name: backlog
description: Add an item to the product backlog
---

Add an agent-ready item to `docs/start-here/BACKLOG.md`.

**Usage:** `/backlog` or `/backlog "Add SMS notifications"`

## Agent-Ready Format

Every backlog item must include enough context that an agent can start implementing in under 5 minutes — no 20-minute exploration phase. The key fields are **entry point** and **fix approach**.

## Process

1. **Gather info from user.** If not provided, ask for:
   - Title (short description)
   - Priority: P0 (production blocker), P1 (next sprint), P2 (backlog), P3 (future)
   - What it is and why it matters

2. **Fill in agent-ready fields.** Use your codebase knowledge to fill in:
   - **Entry point** — the specific file + function where the change starts
   - **Files** — all files likely to be touched (use full paths from repo root)
   - **Fix approach** — how to fix it (1-3 sentences). If unknown, write "Needs exploration: <specific question to answer>"
   - **Acceptance criteria** — how you know it's done (testable statement)
   - **Pattern to follow** — if an existing pattern applies, cite it with file path
   - **Complexity** — S / M / L

3. **Read current `docs/start-here/BACKLOG.md`** to find the right section

4. **Append using this format:**

```markdown
### [Title]

**What:** 1-2 sentence description.
**Why:** What breaks or improves.
**Entry point:** `src/lib/file.ts` (`functionName`)
**Files:** `path/to/file1.ts`, `path/to/file2.ts`, `path/to/__tests__/file1.test.ts`
**Fix approach:** How to fix it. Reference patterns if applicable.
**Acceptance criteria:** Testable statement of "done."
**Pattern to follow:** `domain/quotes.ts:createQuote` P2002 pattern (if applicable)
**Complexity:** S / M / L
**Source:** Where this came from (sprint review, codex finding, user request)
**Depends on:** What must be done first (if applicable)
```

5. **Show the addition and confirm with user before saving**

## What Makes an Item "Agent-Ready"

An agent can always find files and read code. What costs 20 minutes is figuring out:
- **WHERE to start** — the entry point (file + function)
- **WHAT approach to take** — the fix approach + which pattern to follow

If you can fill in those two fields, the item is agent-ready. If you can't, mark them as "Needs exploration: <specific question>" so the agent knows exactly what to investigate first.

## Example

```markdown
### Webhook Retry Dedup

**What:** `handleInboundWebhook` doesn't dedup by the provider's message/event id. Retries can re-process the same event.
**Why:** Retry hits a different "latest" state, causing an incorrect side effect.
**Entry point:** `src/lib/webhooks.ts` (`handleInboundWebhook`, ~line 523)
**Files:** `src/lib/webhooks.ts`, `src/lib/webhooks.test.ts`
**Fix approach:** Before mutating, check for an existing row keyed by the provider's idempotency id. If found, return early with `{ processed: false, reason: "already_processed" }`. Follow the idempotency pattern in `.claude/rules/code-patterns.md`.
**Acceptance criteria:** Calling `handleInboundWebhook` twice with the same event id — first call processes, second call returns idempotent no-op.
**Pattern to follow:** idempotency pattern in `.claude/rules/code-patterns.md`
**Complexity:** S
**Source:** Sprint 6 /codexreview (A1)
```

## Notes

- Don't create new files for ideas — always use BACKLOG.md
- If unsure about priority, default to P2 and note "priority TBD"
- Use full paths from repo root (e.g., `src/lib/foo.ts`, not just `lib/foo.ts`)
- Always include the test file in **Files** — if no test file exists, note that one needs to be created
- If you genuinely can't determine the entry point or fix approach, that's fine — mark "Needs exploration" with a specific question, not a vague "needs investigation"
