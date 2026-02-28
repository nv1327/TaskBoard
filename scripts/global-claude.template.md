# Agent Instructions — PM Board Integration

## Setup

Copy this file and fill in your local paths:

```bash
cp scripts/global-claude.template.md scripts/global-claude.md
# Edit scripts/global-claude.md and replace the two placeholders below:
#   PM_BOARD_DIR  →  absolute path to your pm-board clone
#   PM_BOARD_URL  →  base URL (default: http://localhost:3000)

# Then append it to your global Claude config:
cat scripts/global-claude.md >> ~/.claude/CLAUDE.md
```

---

## Creating new projects

Whenever you scaffold or initialise a new software project for me, **always** register it
in PM Board immediately after creating the project directory. Do this without being asked.

Run the following:

```bash
<PM_BOARD_DIR>/scripts/init-project.sh \
  --name "<project name>" \
  --description "<one-line description>" \
  --repo "<github url if known>" \
  --dir "<path to new project root>"
```

This will:
1. Create the project in PM Board via the API
2. Write a `.pm-board.md` file into the new project directory containing the project ID and context fetch instructions

After running it, confirm to me with the PM Board project URL so I can open it.

## Starting a session in an existing project

If the current working directory (or any parent) contains a `.pm-board.md` file, load the
project context before doing any work:

```bash
# Read the project ID from .pm-board.md
PROJECT_ID=$(grep -m1 "^pm_board_project_id:" .pm-board.md | sed 's/pm_board_project_id:[[:space:]]*//')

# Fetch and display context
curl -s "<PM_BOARD_URL>/api/agent/projects/$PROJECT_ID/context"
```

Use the returned context — feature titles, specs, subtask checklists, statuses — to understand
what is in progress before making any changes.

## Updating PM Board during a session

- When you complete a subtask, mark it done via the API
- When a feature is finished or ready for review, update its status
- If new work is discovered during a session, create a feature for it

```bash
# Mark feature in review
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review"}'

# Mark a subtask done
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"subtasks": [{"id": "<subtaskId>", "status": "done"}]}'

# Create a new feature
curl -X POST <PM_BOARD_URL>/api/agent/features \
  -H "Content-Type: application/json" \
  -d '{"projectId": "<id>", "title": "...", "priority": "medium", "status": "backlog"}'
```

## PM Board location

- UI:      <PM_BOARD_URL>
- API:     <PM_BOARD_URL>/api/agent
- Scripts: <PM_BOARD_DIR>/scripts/
