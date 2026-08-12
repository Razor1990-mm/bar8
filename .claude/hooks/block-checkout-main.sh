#!/bin/bash
# Block `git checkout main` when on a feature branch.
# PreToolUse hook for Bash tool. Exit 2 = block action.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Check if the command is a direct git checkout/switch to main or master
# Exclude: commit messages, grep/echo containing the string, heredocs
if echo "$COMMAND" | grep -qE '^git\s+(checkout|switch)\s+(main|master)'; then
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

  if [ "$BRANCH" != "main" ] && [ "$BRANCH" != "master" ]; then
    echo "BLOCKED: Cannot checkout main from feature branch ($BRANCH). Stay on your branch. Ask the user if they want to switch." >&2
    exit 2
  fi
fi

exit 0
