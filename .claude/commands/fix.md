---
name: fix
description: Autonomous bug fixing from pasted logs/errors
---

Fix a bug from pasted error output. Works autonomously — no hand-holding.

**Usage:** Paste error output, then `/fix` (error is read from conversation context, not as an argument)

## Autonomous Fix Mode

User will paste one of:
- Stack traces
- CI output (lint, typecheck, test failures)
- Docker logs
- Browser console errors
- Slack threads about bugs
- Any error message

My job: **Parse → Locate → Fix → Verify**

## Process

1. **PARSE** — Extract from the error:
   - File path and line number
   - Error type/code
   - Root cause hypothesis

2. **LOCATE** — Find the bug:
   - Read the referenced file
   - Read surrounding context (callers, callees)
   - Understand why it's failing

3. **FIX** — Make the minimal change:
   - Fix the root cause, not the symptom
   - Don't refactor unrelated code
   - Keep the change as small as possible

4. **VERIFY** — Confirm the fix:
   - Run the relevant test(s)
   - Run typecheck if types changed
   - Run lint if new code added

## Rules

- **Don't ask clarifying questions** unless the error is truly ambiguous
- **Don't explain at length** — just fix it
- **Don't over-fix** — solve this bug, not all bugs
- **Do verify** — a fix without verification isn't done

## Input Examples

### Stack Trace
```
TypeError: Cannot read properties of undefined (reading 'id')
    at getWorkerId (/app/src/domain/jobs.ts:42:15)
    at assignJob (/app/src/domain/jobs.ts:87:23)
```
→ Fix: Add null check at jobs.ts:42

### Lint Error
```
/src/components/Timeline.tsx
  75:5  error  React Hook "useState" is called in function "renderEntry"
```
→ Fix: Extract to proper component

### Test Failure
```
FAIL src/domain/__tests__/quotes.test.ts
  ✕ should reject already-approved quote (15ms)
    Expected: 409
    Received: 200
```
→ Fix: Add status check before approval

### CI Output
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE could not resolve dependency tree
```
→ Fix: Resolve dependency conflict in package.json

### Docker Log
```
Error: connect ECONNREFUSED 127.0.0.1:5432
    at TCPConnectWrap.afterConnect [as oncomplete]
```
→ Fix: Check DATABASE_URL or docker-compose networking

### Slack Thread
```
"The dashboard isn't loading quotes anymore. Started after yesterday's deploy."
"Getting 404s on GET /api/ops/work-orders/:id/quote"
```
→ Fix: Find what changed yesterday, trace the 404

## Output Format

```
## Fix Applied

**Error:** <brief description>
**Root cause:** <why it failed>
**Fix:** <what was changed>

### Changes Made
- `file.ts:42` — Added null check for worker.id
- `file.ts:45` — Added early return for missing worker

### Verification
- [x] Test passes: `npm test -- quotes.test.ts`
- [x] Typecheck passes
```

## When It Asks for Help

Only ask for clarification if:
- Multiple unrelated errors in the output
- Error references code that doesn't exist
- Fix requires architectural decision

Otherwise, just fix it.

## Difference from /bug-squash

| Skill | Trigger | Mode |
|-------|---------|------|
| `/bug-squash` | Proactive scan | Finds bugs in codebase |
| `/fix` | Reactive (pasted error) | Fixes specific bug |
