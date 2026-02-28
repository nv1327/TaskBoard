#!/usr/bin/env bash
# load-context.sh
#
# Fetches the PM Board context for the current project and writes it to
# .pm-board-context.md — ready to drop into any agent conversation.
#
# Usage:
#   ./scripts/load-context.sh              # reads project ID from .pm-board.md
#   ./scripts/load-context.sh <projectId>  # explicit project ID
#   ./scripts/load-context.sh --print      # print to stdout instead of file

set -euo pipefail

PM_BOARD_URL="${PM_BOARD_URL:-http://localhost:3000}"
OUTPUT_FILE=".pm-board-context.md"
PRINT_ONLY=false
PROJECT_ID=""

for arg in "$@"; do
  if [[ "$arg" == "--print" ]]; then
    PRINT_ONLY=true
  else
    PROJECT_ID="$arg"
  fi
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
else
  curl -sf "$CONTEXT_URL" -o "$OUTPUT_FILE"
  echo "Context saved to $OUTPUT_FILE"
  echo "Project ID: $PROJECT_ID"
  echo "Source: $CONTEXT_URL"
fi
