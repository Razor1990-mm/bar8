#!/usr/bin/env bash
# Logs Agent tool calls + Bash calls to .claude/telemetry/agent.jsonl.
# Stdin is the PostToolUse hook input (JSON). Failures are silent — telemetry
# must never block tool execution.

set -uo pipefail

input=$(cat)

repo_root=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
log_dir="$repo_root/.claude/telemetry"
log_file="$log_dir/agent.jsonl"
mkdir -p "$log_dir" 2>/dev/null || exit 0

if ! command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$input" >> "$log_file" 2>/dev/null
  exit 0
fi

ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
printf '%s' "$input" | jq -c --arg ts "$ts" '{
  ts: $ts,
  tool: .tool_name,
  subagent_type: (.tool_input.subagent_type // null),
  description: (.tool_input.description // null),
  bash_command: (if .tool_name == "Bash" then (.tool_input.command // null) else null end),
  duration_ms: (.duration_ms // null),
  session_id: (.session_id // null)
}' >> "$log_file" 2>/dev/null

exit 0
