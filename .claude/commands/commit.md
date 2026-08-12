---
name: commit
description: Create a commit with the project's standard format
---

Create a git commit following these steps:

1. Run `git diff --staged` to see what's being committed
2. If nothing is staged, run `git status` and ask user what to stage
3. Generate commit message in this format:
   ```
   type: short description

   - What changed
   - Why it was needed

   🤖 Generated with Claude Code

   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
4. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
5. **Ask user to confirm** before running `git commit`
6. Use HEREDOC format for the commit message to preserve formatting

**Do NOT:**
- Push to remote (unless explicitly asked)
- Amend previous commits (unless explicitly asked)
- Skip pre-commit hooks
