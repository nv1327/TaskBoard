# Using PM Board with AI Agents

PM Board exposes a flat REST API at `/api/agent/*` designed for AI agents (Claude Code, custom agents, scripts) to read and update project features without touching the UI.

**Base URL (local):** `http://localhost:3000`

---

## Quick start for Claude Code

Add this to your `CLAUDE.md` to automatically load active work at the start of each session:

```markdown
## Project context

Before starting work, fetch in-progress features from PM Board:

​```bash
curl -s "http://localhost:3000/api/agent/features?status=in_progress" | \
  jq -r '.data[] | "[\(.project.name)] \(.title)\n\(.spec // "No spec")\n"'
​```
```

Or fetch a specific project's backlog:

```bash
curl -s "http://localhost:3000/api/agent/features?projectId=<id>&status=backlog"
```

---

## Endpoints

### List projects
```bash
curl http://localhost:3000/api/agent/projects
```

### Create / get / update a project
```bash
# Create with mission/context markdown
curl -X POST http://localhost:3000/api/agent/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","contextMd":"## Mission\n..."}'

# Get one project
curl http://localhost:3000/api/agent/projects/<projectId>

# Rename project / update repo URL / mission markdown
curl -X PATCH http://localhost:3000/api/agent/projects/<projectId> \
  -H "Content-Type: application/json" \
  -d '{"name":"Renamed Project","repoUrl":"https://github.com/org/repo","contextMd":"## Updated mission\n..."}'
```

### Search features
```bash
# All in-progress features
curl "http://localhost:3000/api/agent/features?status=in_progress"

# By project + priority
curl "http://localhost:3000/api/agent/features?projectId=<id>&priority=high"

# Full-text search across title, description, and spec
curl "http://localhost:3000/api/agent/features?q=authentication&limit=10"
```

### Get a single feature (full spec + subtasks)
```bash
curl http://localhost:3000/api/agent/features/<featureId>
```

### Create a feature with subtasks
```bash
curl -X POST http://localhost:3000/api/agent/features \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<id>",
    "title": "Add rate limiting",
    "spec": "## Rate Limiting\n\nLimit API calls to 100/min per IP...",
    "priority": "high",
    "status": "todo",
    "subtasks": ["Add Redis client", "Implement sliding window", "Write tests"]
  }'
```

### Update a feature (status, spec, subtasks)
```bash
# Move to in_review
curl -X PATCH http://localhost:3000/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review"}'

# Update spec and mark subtasks done
curl -X PATCH http://localhost:3000/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{
    "status": "done",
    "subtasks": [{"id": "<subtaskId>", "status": "done"}]
  }'
```

---

## Export a feature as a Markdown file

```bash
curl http://localhost:3000/api/projects/<projectId>/features/<featureId>/export > feature.md
```

This produces a formatted `.md` file with metadata, the full spec, and subtasks as a GFM checklist. Useful for passing to models as context or saving alongside code.

---

## Enum values

All enums accept **lowercase input** in the agent API.

| Field | Values |
|---|---|
| `priority` | `low` `medium` `high` `urgent` |
| `status` | `backlog` `todo` `in_progress` `in_review` `done` `cancelled` |
| `subtask.status` | `open` `done` |

---

## Response format

All agent endpoints return `{ ok: boolean, data: ... }`.

Errors return `{ ok: false, error: string }` with an appropriate HTTP status code.

---

## Typical agent workflow

1. **Start of session** — fetch `?status=in_progress` to load current work as context
2. **During work** — `PATCH` the feature spec as understanding grows
3. **Completing tasks** — `PATCH` subtask statuses to `done` as each is finished
4. **End of session** — move feature to `in_review` or `done`
