---
paths:
  - "specs/**"
  - ".claude/templates/**"
---

# Template Rules

Enforces template usage for structured deliverables.

## Specs (Primary Planning Artifact)

Before starting any non-trivial feature, hardening, or refactor:
1. Run `/spec` (or `/spec --type hardening` / `/spec --type refactor`).
2. Spec is saved to `specs/<name>.md`.
3. `/codex-cto` + `/staff-review` validate it (convergence loop, capped at 2 rounds — see `.claude/rules/workflow.md`).
4. Implement in the same session or after `/clear` — the spec should be self-contained.

## Work Orders

Before delegating a bounded slice of work to a specialist agent (`bar8-backend-lead`, `bar8-frontend-lead`, etc.):
1. Read `.claude/templates/work-order.md`.
2. Follow the template structure exactly.
3. Include all required sections (Files You May Touch, Requirements, Must-Cover Invariants, Stop Conditions, Proof Commands).

Incomplete work orders missing required sections should be rejected by reviewers.

## Sprint Documents (Optional)

This is a single small app with no fixed sprint cadence — most work is single-slice (`/spec` → implement → PR), so sprint documents are the exception, not the default. If a genuinely multi-slice batch of work needs a shared plan, `.claude/templates/sprint-spec.md` is available as a starting structure; adapt it rather than following it rigidly (its hard-caps and multi-service references were written for a much larger team/codebase than this one).
