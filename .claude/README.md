<!-- This file is human-facing onboarding documentation.
     It is NOT auto-loaded by Claude Code.
     Agent behavior is governed by CLAUDE.md + .claude/rules/*.md -->

# Claude Code Setup — bar8

## Overview

This repository uses **Claude Code** with automation to enforce quality, security, and consistency for a Next.js 16 + Supabase app:
- **30 custom commands** for spec-driven development, review, and workflow automation
- **Automatic quality gates** via git pre-commit/pre-push hooks (lint, typecheck, unit tests, build)
- **Specialist agent personas** (`bar8-cto`, `bar8-backend-lead`, `bar8-frontend-lead`, `bar8-qa-eng`, `bar8-security-eng`, `bar8-devops-eng`)
- **Guard hooks**: block accidental `git checkout main`, log agent telemetry

---

## Custom Commands

Everything under `.claude/commands/` is invoked as a slash command (`/spec`, `/review`, etc). Full list, grouped by purpose:

### Spec & Planning
| Command | Purpose |
|---------|---------|
| `/spec` | Explore + research + interview → write a spec to `specs/<name>.md` |
| `/sprint-init` | Skeleton for a multi-slice batch of work (rarely needed — see `.claude/rules/templates.md`) |
| `/sprint-cohesion` / `/codex-sprint-cohesion` | Cross-slice wiring check for multi-slice batches |
| `/sprint-closeout` | Close-out gate for a multi-slice batch |
| `/execute-plan` | Run a locked spec/plan as a self-verifying implementation loop |

### Review & Quality
| Command | Purpose |
|---------|---------|
| `/review` | Compliance check against CLAUDE.md / `.claude/rules/` |
| `/audit` | Combined quality check on branch changes |
| `/audit-full` | Full audit on the entire codebase |
| `/security` | Security checklist (Supabase RLS, auth, PII, secrets) |
| `/grill` | Adversarial pre-PR review |
| `/staff-review` | Senior-engineer-style review of a plan |
| `/check-consistency` | Cross-file consistency checks |
| `/codex-code-review` / `/codex-pr-review` / `/codex-spec-review` / `/codex-cto` / `/codex-cto-parallel` / `/codex-audit-runtime-prompt` | Codex-plugin-backed adversarial reviews (spec, code, PR) — cross-model second opinion |

### Development Workflow
| Command | Purpose |
|---------|---------|
| `/tdd-workflow` | RED-phase test writing (invoke via Skill tool, don't hand-roll) |
| `/test-gen` | Generate test cases mapped to invariants |
| `/commit` | Create a standardized git commit |
| `/fix` | Targeted bug fix flow |
| `/bugfix` | Fuller bug investigation + fix flow |
| `/pr` | Automated commit → push → review-fix loop → PR |
| `/pr-babysitter` | Watch an open PR through CI/review |
| `/ship` | Final merge-readiness gate |
| `/ingest-review` | Parse review findings into actionable items |
| `/check-pr-overlap` (+ `check-pr-overlap.sh`) | Detect file-overlap conflicts between open PRs |

### Documentation & Misc
| Command | Purpose |
|---------|---------|
| `/explain` | Explain code with diagrams |
| `/backlog` | Add an item to the backlog |
| `/council` | Multi-perspective deliberation on a decision |

---

## Automation

### Git Hooks (Automatic)

Installed via `npm run prepare` (also runs automatically on `npm install` — see `package.json`'s `prepare` script), which copies `scripts/git-hooks/*` into `.git/hooks/`:

**`pre-commit`** — runs on every `git commit`:
- `npm run lint`
- `npx tsc --noEmit`
- `npm test` (vitest)

Budget: ~15s. Blocks the commit on any failure.

**`pre-push`** — runs on every `git push`:
- `npm run build`

### Claude Code Hooks (`.claude/settings.json`)

- **PreToolUse (Bash):** `.claude/hooks/block-checkout-main.sh` — blocks `git checkout main` / `git switch main` from a feature branch.
- **PostToolUse:** `.claude/hooks/log-agent-telemetry.sh` — logs tool calls to `.claude/telemetry/agent.jsonl` for later review. Failures are silent; telemetry never blocks a tool call.
- **Enabled plugins:** `frontend-design`, `context7`, `codex` (see `.claude/settings.json`).

---

## Agents

Specialist personas under `.claude/agents/` (see `.claude/agents/README.md` for the full org chart and model-tiering doctrine):

| Agent | Model | Purpose |
|-------|-------|---------|
| `bar8-cto` | opus | Architecture decisions, work-order dispatch, process enforcement |
| `bar8-backend-lead` | opus | Route Handlers/Server Actions, Supabase/RLS-aware queries, Zod schemas |
| `bar8-frontend-lead` | sonnet | React Server/Client Components, Tailwind design system, accessibility |
| `bar8-qa-eng` | sonnet | TDD verification, vitest/Playwright coverage, quality gates |
| `bar8-security-eng` | opus | RLS review, auth review, PII/secrets audit |
| `bar8-devops-eng` | sonnet | Cost review, Vercel deploys, Supabase migrations |

---

## Rules (`.claude/rules/`)

Loaded automatically based on the `paths:` frontmatter in each file:

- `code-patterns.md` — RSC-by-default, Supabase RLS patterns, Zod schema sharing, fixture-accessor pattern, RSVP provider abstraction
- `security.md` — service-role key isolation, RLS column-escalation, PII handling, private storage buckets, fail-closed auth
- `testing.md` — vitest + Playwright conventions, mutation-resistant assertions, TDD
- `test-cleanup.md` — cleanup rules for tests that touch a real Supabase project
- `workflow.md` — commit discipline, spec-driven development, branch discipline, gate discipline
- `landmines.md` — specific "looks like X, is Y" traps in this codebase
- `templates.md` — when to use `specs/`, work orders, and (rarely) sprint documents

---

## File Locations

```
.git/hooks/pre-commit, pre-push        # Installed by `npm run prepare`
scripts/git-hooks/pre-commit, pre-push # Source of truth for the hooks above
.claude/settings.json                  # Claude Code hooks + enabled plugins
.claude/hooks/*.sh                     # Guard/telemetry scripts
.claude/rules/*.md                     # Scoped rules (loaded by path match)
.claude/agents/*.md                    # Specialist agent personas
.claude/commands/*.md                  # Slash command definitions
.claude/templates/work-order.md        # Work order template
.claude/templates/sprint-spec.md       # Sprint doc template (rarely needed)
CLAUDE.md                              # Project standards (points at AGENTS.md)
AGENTS.md                              # Next.js 16 API-drift warning — read before framework code
```

---

## Support

- Project standards: `CLAUDE.md` → `AGENTS.md`, `.claude/rules/*.md`
- Product spec: `docs/BRIEF.md`
- Stack/scripts overview: `README.md`
