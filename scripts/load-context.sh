#!/usr/bin/env bash
# load-context.sh
#
# Fetches (or refreshes) the PM Board context for the current project and
# writes it to .pm-board-context.md — ready to drop into any agent conversation.
#
# The context endpoint always returns live data, so re-running this script at
# any point gives an up-to-date snapshot of all features, specs, and subtasks.
#
# Usage:
#   ./scripts/load-context.sh              # reads project ID from .pm-board.md
#   ./scripts/load-context.sh <projectId>  # explicit project ID
#   ./scripts/load-context.sh --print      # print to stdout instead of saving
#   ./scripts/load-context.sh --diff       # show what changed since last fetch
#
# Trigger a refresh after:
#   - Completing a subtask or feature
#   - Adding new features or changing priorities
#   - Starting a new agent session mid-project

set -euo pipefail

PM_BOARD_URL="${PM_BOARD_URL:-http://localhost:3000}"
OUTPUT_FILE=".pm-board-context.md"
PRINT_ONLY=false
SHOW_DIFF=false
PROJECT_ID=""

for arg in "$@"; do
  case "$arg" in
    --print) PRINT_ONLY=true ;;
    --diff)  SHOW_DIFF=true ;;
    *)       PROJECT_ID="$arg" ;;
  esac
done

# If no project ID given, read from .pm-board.md in the current directory
if [[ -z "$PROJECT_ID" ]]; then
  if [[ ! -f ".pm-board.md" ]]; then
    echo "Error: No .pm-board.md found in the current directory and no project ID provided."
    echo "  Either run from a directory with a .pm-board.md file, or pass a project ID:"
    echo "  $0 <projectId>"
    exit 1
  fi
  PROJECT_ID=$(grep -m1 "^pm_board_project_id:" .pm-board.md | sed 's/pm_board_project_id:[[:space:]]*//')
  if [[ -z "$PROJECT_ID" ]]; then
    echo "Error: Could not find pm_board_project_id in .pm-board.md"
    exit 1
  fi
fi

CONTEXT_URL="${PM_BOARD_URL}/api/agent/projects/${PROJECT_ID}/context"

if $PRINT_ONLY; then
  curl -sf "$CONTEXT_URL"
  exit 0
fi

# Save previous version for diff
PREV_FILE=""
if $SHOW_DIFF && [[ -f "$OUTPUT_FILE" ]]; then
  PREV_FILE=$(mktemp)
  cp "$OUTPUT_FILE" "$PREV_FILE"
fi

curl -sf "$CONTEXT_URL" -o "$OUTPUT_FILE"

echo "Context refreshed → $OUTPUT_FILE"
echo "Project ID: $PROJECT_ID"
echo "Source:     $CONTEXT_URL"
echo "Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')"

# Show a simple diff if requested and we had a previous version
if $SHOW_DIFF && [[ -n "$PREV_FILE" ]]; then
  echo ""
  echo "Changes since last fetch:"
  diff --unified=1 "$PREV_FILE" "$OUTPUT_FILE" \
    | grep -E "^[+-]" | grep -v "^[+-]{3}" | grep -v "Generated:" \
    || echo "  No changes."
  rm -f "$PREV_FILE"
elif $SHOW_DIFF; then
  echo "(no previous context file to diff against)"
fi
