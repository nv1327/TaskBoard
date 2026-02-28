#!/usr/bin/env bash
# init-project.sh
#
# Creates a new PM Board project and writes a .pm-board.md link file
# into the target directory. Run this when spinning up any new project.
#
# Usage:
#   ./scripts/init-project.sh --name "My Project" [options]
#
# Options:
#   --name        Project name (required)
#   --description Short description
#   --repo        GitHub repo URL
#   --dir         Target directory to write .pm-board.md (default: current dir)
#   --url         PM Board base URL (default: http://localhost:3000)
#
# Examples:
#   ./scripts/init-project.sh --name "My App" --repo "https://github.com/you/my-app" --dir ~/Projects/my-app
#   ./scripts/init-project.sh --name "New API" --description "REST API service" --dir .

set -euo pipefail

PM_BOARD_URL="${PM_BOARD_URL:-http://localhost:3000}"
PROJECT_NAME=""
PROJECT_DESCRIPTION=""
PROJECT_REPO=""
TARGET_DIR="."

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)        PROJECT_NAME="$2";        shift 2 ;;
    --description) PROJECT_DESCRIPTION="$2"; shift 2 ;;
    --repo)        PROJECT_REPO="$2";        shift 2 ;;
    --dir)         TARGET_DIR="$2";          shift 2 ;;
    --url)         PM_BOARD_URL="$2";        shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

if [[ -z "$PROJECT_NAME" ]]; then
  echo "Error: --name is required"
  echo "Usage: $0 --name \"My Project\" [--description \"...\"] [--repo \"https://...\"] [--dir ./path]"
  exit 1
fi

# Check PM Board is running
if ! curl -sf "$PM_BOARD_URL/api/agent/projects" > /dev/null 2>&1; then
  echo "Error: PM Board is not running at $PM_BOARD_URL"
  echo "Start it with: npm run dev (from the pm-board directory)"
  exit 1
fi

echo "Creating PM Board project: $PROJECT_NAME..."

# Build JSON payload
PAYLOAD=$(printf '{"name":"%s","description":"%s","repoUrl":"%s"}' \
  "$PROJECT_NAME" \
  "$PROJECT_DESCRIPTION" \
  "$PROJECT_REPO")

# Create the project
RESPONSE=$(curl -sf -X POST "$PM_BOARD_URL/api/projects" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

PROJECT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"//;s/"//')

if [[ -z "$PROJECT_ID" ]]; then
  echo "Error: Failed to create project. Response:"
  echo "$RESPONSE"
  exit 1
fi

echo "Created project (ID: $PROJECT_ID)"

# Write .pm-board.md into the target directory
mkdir -p "$TARGET_DIR"
cat > "$TARGET_DIR/.pm-board.md" <<EOF
---
pm_board_project_id: $PROJECT_ID
pm_board_project_name: $PROJECT_NAME
pm_board_url: $PM_BOARD_URL
---

# PM Board Link

This repository is tracked in **[PM Board]($PM_BOARD_URL)** under the project **$PROJECT_NAME**.

## Loading context

\`\`\`bash
# Save context to file
curl -s $PM_BOARD_URL/api/agent/projects/$PROJECT_ID/context -o .pm-board-context.md

# Print to stdout (pipe into an agent)
curl -s $PM_BOARD_URL/api/agent/projects/$PROJECT_ID/context

# Or use the load-context script from the pm-board repo
/path/to/pm-board/scripts/load-context.sh
\`\`\`

## Add to CLAUDE.md for automatic context loading

\`\`\`
At the start of each session, load the current project context:
curl -s $PM_BOARD_URL/api/agent/projects/$PROJECT_ID/context
\`\`\`

## Direct links

- Board: $PM_BOARD_URL/projects/$PROJECT_ID
- Context: $PM_BOARD_URL/api/agent/projects/$PROJECT_ID/context
- Features (JSON): $PM_BOARD_URL/api/agent/features?projectId=$PROJECT_ID
EOF

echo ""
echo "Done."
echo ""
echo "  Project:  $PROJECT_NAME"
echo "  ID:       $PROJECT_ID"
echo "  Board:    $PM_BOARD_URL/projects/$PROJECT_ID"
echo "  Context:  $PM_BOARD_URL/api/agent/projects/$PROJECT_ID/context"
echo "  File:     $TARGET_DIR/.pm-board.md"
echo ""
echo "Next steps:"
echo "  1. Add .pm-board.md to your repo's .gitignore if the ID is sensitive,"
echo "     or commit it to share the project link with your team."
echo "  2. Add the context fetch to your CLAUDE.md for automatic loading."
echo "  3. Open PM Board and start adding features:"
echo "     $PM_BOARD_URL/projects/$PROJECT_ID"
