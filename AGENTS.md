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

## Workflow gates

PM Board feature statuses act as explicit human approval checkpoints:

| Status | Meaning | Gate |
|---|---|---|
| `backlog` | Proposed — not yet approved or specced | — |
| `todo` | Human-approved — ready to spec and implement | ← **Gate 1: roadmap approval** |
| `in_progress` | Agent implementing on a branch | — |
| `in_review` | PR open, waiting for human review | ← **Gate 2: code review** |
| `done` | Merged to main | — |

## Recommended workflow by project size

### Small / well-defined projects
Skip to the coding workflow below.

### Large / greenfield projects

**Gate 1 — Roadmap proposal (before any spec or code):**
1. Read the project context and mission (`contextMd`).
2. Think through the problem space and a logical build order.
3. Create one `backlog` feature per proposed work item — title and one-paragraph description only, no spec. Keep it scannable.
4. Summarise the proposed roadmap to the human and wait for their approval.
5. The human reviews in the PM Board UI: edits, reorders, deletes, promotes approved items to `todo`.
6. **Do not write specs or code until a feature is in `todo`.**

**Gate 2 — Code review (per feature, see below):**
The human reviews each PR before merging to `main`. Required for production code.

## Coding workflow (per approved `todo` feature)

1. **Start of session** — fetch project context to load current work, branch/PR state, and mission.
2. **Pick** the next `todo` feature. If it has no spec yet (approved from roadmap but not yet specced), write the full spec via `PATCH` before starting implementation.
3. **Create a branch** `feat/<short-slug>` from `main`. Before writing any code: create `.gitignore` and set up the test environment (venv, install deps). Do this early — a broken test environment at PR time blocks the whole flow.
4. Move feature to `in_progress` and record the branch URL via `PATCH`. Verify the response confirms the update.
5. **Implement** the feature. Mark each subtask `done` as you go.
6. **Run the full test suite. All tests must pass before opening a PR.** If tests catch a bug, fix it on the branch.
6a. **E2E / smoke test** the happy path. For API features, exercise each new endpoint (create → read → update → delete). For UI features, verify the core user flow in the browser.
6b. **Self-learning check** — reflect on what you built. Did anything surprise you? Is anything in the workflow docs now outdated? Propose specific edits to the human and wait for approval before changing any `.md` file.
7. **Open a PR** against `main`. Move feature to `in_review` and record the PR URL via `PATCH`. Verify the response. For local repos not yet on GitHub, use `<repo>/compare/main...<branch>` as the `prUrl` placeholder.
8. **Stop and wait for human review.** Summarise what you built, what the tests cover, and what you want reviewed. Do not merge or start the next feature.
9. After human approves and merges, move feature to `done`.
9a. **Document human review findings** in the feature spec — append a `## Review findings` section recording what the human corrected, why it mattered, and what future agents should do differently. This becomes part of the permanent project record and is surfaced in future context fetches.
