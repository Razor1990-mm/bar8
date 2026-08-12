# Sprint Document Template

> **SUPERSEDED** by `sprint-spec.md` for Sprint 8+ sprints. This template is retained for Sprint 7 and earlier reference only. New sprints MUST use `.claude/templates/sprint-spec.md`.

Use this when creating or updating sprint documents for Sprint 7 and earlier (`docs/sprints/sprint-*.md`).

## Sprint Doc Structure

Every sprint document should include these sections in order:

### 1. Overview
- **What it builds**: 1-2 sentences on deliverable
- **Focus areas**: 2-4 bullets on priorities

### 2. Assumptions
List environmental/user assumptions explicitly (3-5 bullets minimum):
- Database state assumptions (empty, has data, migration constraints)
- External service availability (Twilio configured, Cloudflare Access set up)
- Integration assumptions (webhook retries enabled, specific env vars set)
- Concurrency assumptions (no simultaneous approvals, single-tenant testing)
- Format: "Assumption: <statement>" per bullet

**Why:** Makes implicit context explicit; when assumptions break, you know what changed

### 3. Status (living spec)
- Canon rule: "This doc wins if conflicts with PRDs/tech specs"
- Update frequency: patch this doc when decisions change

### 4. Spec Changelog
Track what changed since last major review:
```
### YYYY-MM-DD (Slice X completion / Day Y start)
- **Added:** <what was added>
- **Changed:** <what was modified + why>
- **Removed:** <what was deleted>
- **Clarified:** <what was made explicit>
```

**Why:** Makes evolution visible; useful for PR reviews and "did we agree to this?" debates

### 5. Decision Log (living) — Enhanced
For each decision, include:
- **Date**: YYYY-MM-DD
- **Decision**: What was decided
- **Why**: Rationale (1-2 sentences)
- **Alternatives considered**: What else was evaluated
- **Trade-offs**: Cost/benefit of chosen option vs alternatives
- **Risks**: Known risks + mitigations

Example:
```
- **2026-01-08**: Day 2 SMS is **stubbed first** (records Action + Events/AuditLogs, no Twilio send).
  - **Why:** Unblocks executor/idempotency/audit work even if SMS capability/config is uncertain
  - **Alternatives considered:**
    - Real Twilio SMS first → blocked by number provisioning delays
    - Skip SMS entirely → loses executor test coverage
  - **Trade-offs:** Stub behavior may diverge from real Twilio; mitigated by follow-up slice
  - **Risks:** Team forgets to implement real SMS; mitigated by explicit follow-up slice in Day plan
```

**Why:** Future-you can reconstruct reasoning, not just outcome

### 6. Open Questions
- Track unresolved items
- Format: "Question: <statement>? (blocker: yes/no)"

### 7. Defaults / Key Decisions
- API conventions, auth strategies, cardinality rules, etc.

### 7.5 User Journeys (REQUIRED)
Add 2-3 short user journey diagrams for the sprint's critical paths:
- Use **ASCII diagrams** (sequence/flow) so they render everywhere
- Must include **human-in-the-loop** steps if approvals/escalations exist
- **Cap:** max 3 journeys, max ~20 nodes total

**Why:** Makes "who does what when" explicit; exposes missing steps

### 7.6 State Machines (REQUIRED)
Include at least one explicit state transition diagram for the sprint's core entity lifecycle:
- Prefer ASCII state diagrams
- Mermaid allowed only if user explicitly asks
- **Cap:** 1-2 diagrams total
- Focus on invariants and "no ghost states"

**Why:** Prevents undefined/contradictory states and documents invariants

### 8. Acceptance (BHAG)
- High-level end-to-end success criteria

### 9. Acceptance Criteria — Enhanced with Negative Cases
For each major deliverable/slice, define:

**Positive cases (happy path):**
- What should succeed

**Negative cases (failure modes):**
- What should FAIL safely
- What should be REJECTED with proper errors
- What should NEVER happen (invariants)

Example:
```
### Slice 4 — Ops auth + request context
**Acceptance:**
- ✅ Requests with valid Cloudflare JWT return correct orgId/actorWorkerId
- ✅ `whoami` endpoint returns stable identifiers
- ❌ Requests without JWT are rejected (401, no data leak)
- ❌ Requests with expired JWT are rejected (401, not 500)
- ❌ Requests with valid JWT but unmapped subject fail closed (403, no default org)
```

**Why:** Catches security bugs, fail-closed gaps, and error handling issues

### 10. Verification Scenarios (Manual QA)
Define 2-3 end-to-end flows with step-by-step manual checks:

Template:
```
### Scenario 1: <Name> (happy path / failure case / edge case)
1. **Setup:** <Prerequisites + data state>
2. **Trigger:** <Action to perform>
3. **Expect:** <Observable outcomes - DB state, API responses, logs>
4. **Verify:** <How to confirm it worked>
```

**Why:** Gives implementation checklist for "done means actually works"

### 11. Success Metrics (Post-Deploy)
Define observable outcomes (3-5 must-track):

```
### Must-track (immediate)
- **<Metric name>**: <What to query/measure> (<Expected value / alert threshold>)

### Should-track (weekly)
- **<Metric name>**: <What to query/measure> (<Expected value / alert threshold>)
```

**Why:** Shifts focus from "did we build it?" to "is it working?"

### 11.5 Observability Thresholds (REQUIRED)
3-5 metrics with thresholds and actions:
```
| Metric | Target | Alert Threshold | Action |
|--------|--------|-----------------|--------|
| <name> | <goal> | <page when>     | <what to do> |
```

### 11.6 Failure Modes (REQUIRED)
Top 5 "things that will ruin the sprint/demo":
```
| Failure | Impact | Detection | Recovery |
|---------|--------|-----------|----------|
| <thing> | <P0/P1> | <signal> | <runbook-ish step> |
```

### 11.7 API Examples (REQUIRED)
For new/changed endpoints, include 3-5 concrete request/response examples. Prefer JSON over type signatures.

### 12. Week Plan / Day-by-Day Slices
- Deliverables + acceptance per day/slice
- Enhanced with negative acceptance criteria from section 9

### 13. Notes / References
- Links to PRDs, runbooks, related docs

---

## Sprint Doc Checklist

Before considering a sprint doc "ready":
- [ ] Assumptions section includes at least 3 environmental/integration assumptions
- [ ] Every major decision has trade-offs + alternatives documented
- [ ] User journeys included (2-3 max) for the critical paths
- [ ] At least one state machine diagram exists for the sprint's core lifecycle
- [ ] Every slice has at least 1 negative acceptance criterion
- [ ] At least 2 verification scenarios (1 happy path, 1 failure case)
- [ ] Success metrics include at least 3 must-track observables
- [ ] Observability thresholds table included (3-5 metrics)
- [ ] Failure modes table included (top 5, with recovery)
- [ ] API examples included (3-5 request/response pairs for new/changed endpoints)
- [ ] Spec changelog initialized (even if empty at first)

## When to Update Sprint Docs

- **Before sprint start**: Write full doc with all sections
- **During sprint**: Update decision log + spec changelog after each slice completion
- **After sprint**: Final spec changelog entry summarizing what shipped vs planned

---

## Sprint-as-Spec Contract (Slice Close-Out)

When completing a slice, update the sprint doc with these items:

### Required Updates Per Slice

**1. Slice identification**
- Slice ID + title + completion date
- In/out scope boundaries (what was built vs deferred)

**2. Interfaces & contracts**
- API endpoints: method, path, auth strategy
- Idempotency keys: format + retry semantics
- Feature flags / env vars: name, default, rollout strategy, rollback method

**3. Data changes**
- Tables touched: name + change type (add column, add table, add index, migration)
- Invariants enforced: tenant scoping, unique constraints, append-only rules
- Migrations: note if required, backfill strategy, rollback plan (or "N/A")

**4. Failure modes & boundaries**
- Fail-closed behaviors: what happens on unknown input, missing auth, invalid state
- Timeouts: max duration for external calls
- Max payload sizes: request body limits
- Partial failure semantics: what happens if DB succeeds but external call fails

**5. Observability proof**
- Required log fields: correlationId, orgId, relevant entity IDs
- Redaction confirmation: no secrets/tokens/full-phone-numbers logged
- Event/AuditLog entries: describe expected entries for 1 happy path + 1 failure path

**6. Acceptance proof**
- Operator-verifiable steps: concrete curl commands or UI actions to test the slice
- "Done" criteria: what passing looks like

### Where to Add Updates
- **Decision log**: Slice ID, interfaces, data changes, failure modes
- **Acceptance criteria**: Add negative cases + observability proof
- **Spec changelog**: Date + what changed
- **Verification scenarios**: Add operator-verifiable steps if new flow introduced

---

## Sprint Close-Out Gate (After 3rd-Party Wiring)

At the end of a sprint, once 3rd-party endpoints are wired, prove the system works **as deployed** and **as integrated**.

### Requirements (all mandatory)

**1) Full proof gates output**
Paste full output for:
- `npm -w services/backend run lint`
- `npm -w services/backend run typecheck`
- `npm -w services/backend test`
- `RUN_DB_TESTS=1 npm -w services/backend test`
- Any service-specific tests for touched services

**2) Black-box rehearsal with real integrations**
Execute at least one end-to-end rehearsal against real wired endpoints (no mocks):
- Voice: real Twilio call → backend ingress → WorkOrder/Job → logs/events/audits
- SMS: real Twilio SMS → WorkOrder threading → intake updates → ActionRequest creation/dedupe
- Ops: approve ActionRequest → Action → executor transitions → Events/AuditLog timeline

Required properties:
- Idempotency under replay (do the flow twice; results stable)
- Concurrency safety (at least one parallel replay or race scenario)
- Fail-closed safety (unknown tenant / invalid signature produces no DB writes)

**3) Invariant audits (DB + logs)**
- Tenant isolation spot-check: cross-tenant read/mutation denied
- No duplicates for idempotency keys / deterministic IDs
- PII safety: no raw bodies/addresses/full phone numbers in logs or Event/AuditLog

**4) Sprint doc close-out checklist**
- Update sprint doc with rehearsal status + what was verified
- If any item is deferred, it MUST remain as an unchecked checkbox with clear follow-up
