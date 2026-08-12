# bar8 Agent Organization

> **SUPERSEDED IN PART (2026-07-07).** The mandatory-CTO-chain routing below is a fossil. Current doctrine: `.claude/rules/workflow.md` § "Model Doctrine — Subagent Tiering" — the session lead supervises and assigns tiers (haiku scouts / sonnet standard impl / opus hard impl); the CTO chain runs only when the founder explicitly asks ("CTO this", "full workflow"). Agent personas below remain valid as `subagent_type` choices.

Specialized agents forming an engineering team. Each agent is a **single-purpose persona** — identity only, no duplicated patterns or code examples. All patterns inherited from `CLAUDE.md` + `.claude/rules/`.

---

## Org Chart

```
                    Founder (User)
                         │
                    ┌────┴────┐
                    │   CTO   │  opus — strategic decisions, dispatch, process enforcement
                    └────┬────┘
          ┌──────────┬───┴───┬──────────┬──────────┐
          │          │       │          │          │
    Backend Lead  Frontend  QA Eng   Security   DevOps
      (opus)      Lead    (sonnet)    Eng      Eng
                (sonnet)             (opus)   (sonnet)
```

## Agent Summary

| Agent | Model | Purpose | Blocking Power |
|-------|-------|---------|----------------|
| **CTO** | opus | Orchestrate, architect, delegate, enforce process | Rejects work without TDD proof |
| **Backend Lead** | opus | Route Handlers/Server Actions, Supabase data access, TDD | None (escalates to CTO) |
| **Frontend Lead** | sonnet | React Server Components, design system, accessibility | None (escalates to CTO) |
| **QA Eng** | sonnet | Quality gates, TDD verification, test generation | Blocks commit on gate failure |
| **Security Eng** | opus | RLS review, auth, PII handling | Blocks PR on P0 findings |
| **DevOps Eng** | sonnet | Cost review, deployment, migrations | Blocks PR on P0 resource issues |

## Model Selection Rationale

| Agent | Model | Rationale |
|-------|-------|-----------|
| CTO | opus | Architecture decisions, strategic trade-offs |
| Backend Lead | opus | Data access design, RLS-aware query patterns, business rules |
| Security Eng | opus | Judgment calls on vulnerabilities, RLS/auth patterns |
| Frontend Lead | sonnet | Pattern-following React/UI implementation |
| QA Eng | sonnet | Test generation follows established patterns |
| DevOps Eng | sonnet | Procedural infrastructure/cost checks |
| Plan agents | opus | Architecture design (always pass `model: "opus"`) |
| Codex spawners | sonnet | Mechanical: compose prompt, invoke the Codex plugin companion (`codex-companion.mjs task`), show output. No reasoning needed. |
| Composite skills | sonnet | Orchestration: invoke sub-skills sequentially. No reasoning needed. |

Agent frontmatter (`model:` field in agent .md files) sets the default.

**Skill model rule:** If Claude's job is just to compose a prompt and run an external tool (Codex CLI), or orchestrate sub-skills, use sonnet. Reserve opus for skills requiring independent judgment (grill, self-review, staff-review, bug-squash, quality-design, test-gen).

## When to Spawn Which Agent

| Situation | Spawn |
|-----------|-------|
| Feature request, sprint slice, "build X" | CTO first (MANDATORY) |
| Route Handler/Server Action/data implementation (from CTO work order) | Backend Lead |
| UI/component implementation (from CTO work order) | Frontend Lead |
| Test generation, quality gates, pre-commit | QA Eng |
| Security review, pre-PR audit | Security Eng |
| Cost review, deployment | DevOps Eng |
| Codebase exploration (read-only) | `Task(subagent_type="Explore")` |

## Phase Flow

```
Phase 0: Strategic Debate
  Founder ↔ CTO — clarify scope, pick approach

Phase 1: Task Start
  CTO → reads codebase → creates work orders → delegates

Phase 1.5: Plan Review
  CTO → /staff-review (Claude: complexity, scope, patterns)
  CTO → /codex-cto (Codex: feasibility against real code, invariants)

Phase 2: Development
  Backend/Frontend Lead → TDD (invoke /tdd-workflow) → implement

Phase 2.5: Implementation Review
  CTO → /codex-cto review (Codex: plan adherence, test quality)
  Security Eng → RLS/auth review on data-access changes
  QA Eng → /test-gen for test cases

Phase 3: Verification
  QA Eng → /done → /verify → /self-review → /commit

Phase 4: Pre-PR
  Security Eng → /grill + /audit
  DevOps Eng → /cost
  CTO → reviews, creates PR
```

## Context Flow

Agents inherit `CLAUDE.md` + all `.claude/rules/` files automatically. Agent `.md` files contain **identity only** — persona, responsibilities, boundaries, skills, escalation.

CTO injects **specific context** via Task() prompts: work order details, relevant files, constraints. Specialists don't need 400-line system prompts because shared rules are inherited.

```
CLAUDE.md (always loaded)
  + .claude/rules/security.md (loaded when touching auth/middleware/data-access code)
  + .claude/rules/testing.md (loaded when touching test files)
  + .claude/rules/code-patterns.md (always loaded)
  + .claude/rules/workflow.md (always loaded)
  + Agent .md file (~30-55 lines of identity)
  + CTO's Task() prompt (targeted context for this specific work)
```

## Skill → Agent Mapping

| Skill | Primary Agent | Auto-Triggered? |
|-------|--------------|-----------------|
| `/tdd-workflow` | Backend Lead, Frontend Lead | No — invoked during RED phase |
| `/test-gen` | QA Eng | Auto-suggested on edits without a test file |
| `/security` | Security Eng | Auto on auth/RLS file edits |
| `/done` | QA Eng | Suggested when "done" / "complete" |
| `/verify` | QA Eng | After `/done` passes |
| `/self-review` | QA Eng | After `/verify` passes |
| `/pre-commit` | QA Eng | Auto when "commit" |
| `/grill` | Security Eng | During `/pre-pr` |
| `/audit` | Security Eng / CTO | During `/pre-pr` |
| `/cost` | DevOps Eng | During `/pre-pr` |
| `/staff-review` | CTO | Auto before ExitPlanMode |
| `/codex-cto` | CTO (via Codex) | Auto before ExitPlanMode for complex/high-risk plans (alongside /staff-review) |
| `/codex-cto review` | CTO (via Codex) | After implementation, risk-based before /pre-commit |
| `/sprint-review` | CTO | Mid-sprint, before demos |

## Key Rules

1. **CTO first for features** — Never implement features directly. CTO creates work orders.
2. **TDD required** — Every specialist invokes `/tdd-workflow` for RED phase. No exceptions.
3. **Skills via Skill tool** — Never manually replicate what a skill does.
4. **Existing tests are sacred** — Never modify tests to make code pass. Report as BLOCKER.
5. **Scope boundaries** — Only touch files listed in work order. Report blockers for others.
