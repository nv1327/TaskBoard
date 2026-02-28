---
pm_board_project_id: REPLACE_WITH_PROJECT_ID
pm_board_project_name: REPLACE_WITH_PROJECT_NAME
pm_board_url: http://localhost:3000
---

# PM Board Link

This repository is tracked in **[PM Board](http://localhost:3000)** under the project **REPLACE_WITH_PROJECT_NAME**.

## Loading context

To fetch the current project state into your agent context, run one of the following:

**Save to file (then attach to conversation):**
```bash
curl http://localhost:3000/api/agent/projects/REPLACE_WITH_PROJECT_ID/context \
  -o .pm-board-context.md
```

**Print directly (pipe into claude or another agent):**
```bash
curl -s http://localhost:3000/api/agent/projects/REPLACE_WITH_PROJECT_ID/context
```

**Using the load-context script (from the pm-board repo):**
```bash
# Run from this repo's root — reads pm_board_project_id from this file
/path/to/pm-board/scripts/load-context.sh
```

**Via Claude Code — add to CLAUDE.md:**
```
At the start of each session, load the current project context:
curl -s http://localhost:3000/api/agent/projects/REPLACE_WITH_PROJECT_ID/context
```

## Direct links

- Board: http://localhost:3000/projects/REPLACE_WITH_PROJECT_ID
- Context API: http://localhost:3000/api/agent/projects/REPLACE_WITH_PROJECT_ID/context
- All features (JSON): http://localhost:3000/api/agent/features?projectId=REPLACE_WITH_PROJECT_ID
