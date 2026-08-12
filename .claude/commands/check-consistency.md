# Cross-File String Invariant Checker

## Purpose
Detect hardcoded event type strings that should use `EVENT_*` constants from `events.ts`. Catches cross-file string drift before it compounds.

## Usage
/check-consistency <file>
/check-consistency src/lib/quotes.ts
/check-consistency --audit   (full codebase scan)

## What It Checks

### 1. Hardcoded Event Type With Existing Constant
**Violation:** A domain file uses a string literal for `eventType:` when a matching `EVENT_*` constant exists in `events.ts`.

```typescript
// WRONG: constant EVENT_QUOTE_AUTO_APPROVED exists
eventType: "QUOTE_AUTO_APPROVED",

// CORRECT: use the constant
eventType: EVENT_QUOTE_AUTO_APPROVED,
```

**Severity:** FAIL — must use the constant.

### 2. Hardcoded Event Type Without Constant (Migration Candidate)
**Violation:** A domain file uses a string literal for `eventType:` with no matching `EVENT_*` constant in `events.ts`.

```typescript
// WARNING: no constant exists yet
eventType: "WorkOrderCreated",
```

**Severity:** WARNING — add to `events.ts` or file backlog item.

### 3. Naming Convention (PascalCase vs SCREAMING_SNAKE)
**Violation:** A new or existing event type string uses PascalCase when the constantized convention is SCREAMING_SNAKE_CASE.

```typescript
// WARNING: convention is SCREAMING_SNAKE_CASE
eventType: "QuoteDraftCreated",

// CORRECT convention
eventType: "QUOTE_DRAFT_CREATED",
```

**Severity:** WARNING — flag for migration to SCREAMING_SNAKE_CASE.

## Execution Logic

### Standard mode (file-scoped)

1. **Collect constants:** Read `src/lib/events.ts`. Extract all `EVENT_*` export constants and their string values into a lookup map:
   ```
   EVENT_QUOTE_AUTO_APPROVED -> "QUOTE_AUTO_APPROVED"
   EVENT_POLICY_EVALUATED -> "POLICY_EVALUATED"
   EVENT_AUTO_APPROVAL_OVERRIDDEN -> "AUTO_APPROVAL_OVERRIDDEN"
   ... etc
   ```

2. **Scan the target file:** Search for patterns:
   - `eventType: "..."` (object literal assignment)
   - `eventType: '...'` (single-quoted)
   - `eventType: \`...\`` (template literal without interpolation)

3. **Cross-reference each hardcoded string:**
   - If the string value matches an `EVENT_*` constant's value -> **FAIL**: "Use `EVENT_X` from `events.ts` instead of `"X"`"
   - If no matching constant exists -> **WARNING**: "No constant for `"X"` in `events.ts` — add constant or file backlog item"

4. **Naming convention check:** For each hardcoded string:
   - If it matches PascalCase pattern (e.g., `WorkOrderCreated`, `QuoteDraftCreated`) -> **WARNING**: "Convention is SCREAMING_SNAKE_CASE (e.g., `WORK_ORDER_CREATED`)"
   - If it matches SCREAMING_SNAKE_CASE -> no naming warning

5. **Report** with file:line references for each finding.

### Audit mode (`--audit`)

Scans **all** `src/lib/**/*.ts` files (not just the specified file). Produces a full drift report:

1. Run standard mode logic against every domain `.ts` file
2. Group findings by file
3. Summary at bottom: total FAILs, total WARNINGs, files clean

## Output Format

### Standard mode — clean
```
String Consistency Check: src/lib/autoApproval.ts

All event type strings use EVENT_* constants.
No drift detected.

PASS
```

### Standard mode — findings
```
String Consistency Check: src/lib/quotes.ts

FAIL  Line 142: Use EVENT_QUOTE_AUTO_APPROVED from events.ts instead of "QUOTE_AUTO_APPROVED"
  eventType: "QUOTE_AUTO_APPROVED",
  Fix: import { EVENT_QUOTE_AUTO_APPROVED } from "./events.js" and use the constant

WARN  Line 89: No constant for "QUOTE_GENERATED" in events.ts — add constant or file backlog item
  eventType: "QUOTE_GENERATED",

WARN  Line 89: Naming convention — "QUOTE_GENERATED" is SCREAMING_SNAKE (good)

WARN  Line 203: No constant for "QuoteDraftCreated" in events.ts — add constant or file backlog item
  eventType: "QuoteDraftCreated",

WARN  Line 203: Naming convention — "QuoteDraftCreated" uses PascalCase. Convention is SCREAMING_SNAKE_CASE (e.g., QUOTE_DRAFT_CREATED)

---

Summary: 1 FAIL, 3 WARNINGS
Reference: CLAUDE.md event type constants, src/lib/events.ts
```

### Audit mode
```
String Consistency Audit: src/lib/**/*.ts

Constants found in events.ts: 8
  EVENT_QUOTE_AUTO_APPROVED, EVENT_POLICY_EVALUATED, EVENT_AUTO_APPROVAL_OVERRIDDEN,
  EVENT_AUTO_APPROVAL_OVERRIDE_WARNING, EVENT_AUTO_APPROVAL_PAUSED,
  EVENT_RATE_WARNING, EVENT_SMS_OVERRIDE_ATTEMPTED, EVENT_RAMP_UP_MILESTONE_NOTIFIED

--- File-by-file results ---

src/lib/quotes.ts:
  FAIL  Line 142: "QUOTE_AUTO_APPROVED" — constant exists, use it
  WARN  Line 89: "QUOTE_GENERATED" — no constant
  WARN  Line 203: "QuoteDraftCreated" — no constant + PascalCase

src/lib/actionRequests.ts:
  WARN  Line 45: "ActionRequestCreated" — no constant + PascalCase
  WARN  Line 112: "ActionRequestApproved" — no constant + PascalCase

src/lib/autoApproval.ts:
  All event types use constants. CLEAN.

... (continues for all domain files)

---

AUDIT SUMMARY
  Files scanned: <N>
  Files clean: <N>
  Files with findings: <N>
  Total FAILs: <N> (constant exists but not used)
  Total WARNINGs: <N> (no constant / naming convention)

Migration candidates (no constant exists):
  "WorkOrderCreated"          — used in workOrders.ts:XX, coordinator.ts:XX
  "ActionRequestCreated"      — used in actionRequests.ts:XX
  "QuoteDraftCreated"         — used in quotes.ts:XX
  ... (grouped by unique string, with all usage locations)
```

## When to Auto-Trigger
- After editing any file in `src/lib/**/*.ts`
- As part of git pre-commit hook quality gates
- Manually via `/check-consistency --audit` for sprint close-out or migration planning

## Integration Notes

- **Severity is WARNING, not BLOCKER** — event type migration is in progress. This skill flags drift to prevent it from growing, but doesn't halt commits.
- **FAILs** (constant exists but unused) are stronger signals — these should be fixed before commit.
- **WARNINGs** (no constant yet) are migration candidates — track but don't block.
- Works alongside `/security` (OWASP) as part of the domain file edit-time checks.
- The `EventPayloads` type in `events.ts` documents expected payload shapes but doesn't enforce constant usage — this skill fills that gap.
