# Work Order Template

Use this when delegating a bounded slice of work to a specialist agent. Core value: tight scope, explicit file boundaries, invariant floor.

**Note:** Implementing agents already inherit TDD workflow, testing rules, and quality gates from `CLAUDE.md` + `.claude/rules/`. Do NOT restate those rules here — just reference the scope and boundaries.

## Template

```text
========================
WORK ORDER: <SLICE ID> — <SLICE TITLE>
========================

FILES YOU MAY TOUCH (ONLY THESE):
- <ALLOWLIST OF FILE PATHS>

DO NOT TOUCH:
- <OUT-OF-SCOPE AREAS>

REQUIREMENTS:
1) <REQUIREMENT 1>
2) <REQUIREMENT 2>
3) Output contract:
   - Input: <INPUT TYPE>
   - Output: <OUTPUT TYPE SHAPE>

MUST-COVER INVARIANTS (missing any = blocker):
- INV-1: <INVARIANT>
- INV-2: <INVARIANT>
- INV-3: <INVARIANT>
(Each must map to at least one test. See `.claude/rules/testing.md` for categories A-H.)

WIRE-IN (MINIMAL):
- Entrypoint: <FILE + FUNCTION>
- Parse/validate: <WHAT>
- Call: <DOMAIN FUNCTION>

EDGE CASES:
- <EDGE CASE>
- If enum/status involved: enumerate ALL values + expected behavior
- If nullable field involved: specify null vs empty vs missing

STOP CONDITIONS:
- If you discover <OUT-OF-SCOPE THING>, STOP and report as blocker
- If any existing test breaks, STOP — fix the code, not the test

PROOF COMMANDS:
- <e.g., npm test>
- <e.g., npm run lint>
```

## Optional Sections (include only when applicable)

Add these ONLY when the slice actually needs them. Do not include with "N/A".

```text
API/ENV CONTRACT:
- Endpoints: <method path auth>
- Env vars: <name=default>
- Idempotency keys: <format>

ROLLBACK / KILL SWITCH:
- External effects: <what side effects occur>
- Kill switch: <how to disable>

LATENCY CONSTRAINTS:
- Webhook timeouts: <max duration>
- Request timeouts: <AbortController timeout>

STATE MODEL:
- Initial: <STATE>
- Transitions: <STATE> -> <STATE> on <EVENT>
- Terminal: <STATE>
```

## CTO Prep Checklist (for work order creator, not the implementer)

Before writing a work order, the CTO must:
- [ ] Read the sprint doc + slice reference
- [ ] Read 3-10 relevant source files
- [ ] Identify existing patterns to follow (cite file + function)
- [ ] Verify integration points (what existing code this connects to)
- [ ] Resolve open questions (don't delegate ambiguity)

## Example

```text
WORK ORDER: SLICE 1C — RSVP provider capacity check

FILES YOU MAY TOUCH (ONLY THESE):
- src/lib/rsvp/provider.ts
- src/lib/rsvp/provider.test.ts

DO NOT TOUCH:
- src/lib/fixtures.ts
- src/app/**

REQUIREMENTS:
1) Add `getCapacityStatus(event): "open" | "waitlist" | "full"` to RsvpProvider
2) LumaProvider returns "open" always in V1 (Luma owns capacity display)
3) NativeProvider computes from attending count vs capacity

MUST-COVER INVARIANTS:
- INV-1: LumaProvider.getCapacityStatus always returns "open"
- INV-2: NativeProvider returns "full" when attending === capacity
- INV-3: NativeProvider returns "waitlist" when attending > capacity

EDGE CASES:
- capacity null/undefined: NativeProvider throws (capacity is required for native)

STOP CONDITIONS:
- If you need to change the events schema, STOP (out of scope)

PROOF COMMANDS:
- npm test
- npm run lint
```
