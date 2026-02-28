# PM Board Agent API

A flat REST API for AI agents to query and update features programmatically.

**Base URL:** `http://localhost:3000/api/agent`

All responses use the `{ ok: boolean, data: ... }` envelope format.

---

## Endpoints

### GET /api/agent/projects

List all projects.

**Response:**
```json
{
  "ok": true,
  "data": [
    {
      "id": "cuid",
      "name": "My Project",
      "description": "...",
      "repoUrl": "https://github.com/org/repo",
      "featureCount": 12,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:3000/api/agent/projects
```

---

### GET /api/agent/projects/:id

Get one project.

**Example:**
```bash
curl http://localhost:3000/api/agent/projects/PROJECT_ID
```

### PATCH /api/agent/projects/:id

Update project metadata.

**Request body (all optional):**
```json
{
  "name": "New project name",
  "description": "Updated description",
  "repoUrl": "https://github.com/org/new-repo"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/api/agent/projects/PROJECT_ID \
  -H "Content-Type: application/json" \
  -d '{"name":"Renamed Project","repoUrl":"https://github.com/org/repo"}'
```

---

### GET /api/agent/features

List features with optional filters.

**Query params:**
- `projectId` — filter by project
- `status` — filter by status (case-insensitive: `backlog`, `todo`, `in_progress`, `in_review`, `done`, `cancelled`)
- `priority` — filter by priority (case-insensitive: `low`, `medium`, `high`, `urgent`)
- `q` — full-text search across title, description, spec
- `limit` — max results (default: 50, max: 100)

**Response:**
```json
{
  "ok": true,
  "count": 2,
  "data": [
    {
      "id": "cuid",
      "title": "Feature title",
      "description": "Short description",
      "priority": "HIGH",
      "status": "IN_PROGRESS",
      "branchUrl": "https://github.com/org/repo/tree/feat/name",
      "project": { "id": "...", "name": "My Project" },
      "subtasks": [{ "id": "...", "title": "...", "status": "OPEN" }],
      "_count": { "subtasks": 3 }
    }
  ]
}
```

**Examples:**
```bash
# All features
curl http://localhost:3000/api/agent/features

# Filter by project and status
curl "http://localhost:3000/api/agent/features?projectId=cuid&status=in_progress"

# Search
curl "http://localhost:3000/api/agent/features?q=authentication&limit=10"
```

---

### POST /api/agent/features

Create a feature with optional subtasks.

**Request body:**
```json
{
  "projectId": "cuid",
  "title": "Feature title",
  "description": "Short preview text",
  "spec": "## Full markdown spec\n\nDetailed requirements...",
  "priority": "high",
  "status": "todo",
  "branchUrl": "https://github.com/org/repo/tree/feat/name",
  "subtasks": ["Design the UI", "Implement backend", "Write tests"]
}
```

All enum values accept lowercase strings. Only `projectId` and `title` are required.

**Response (201):**
```json
{
  "ok": true,
  "data": {
    "id": "cuid",
    "title": "Feature title",
    "status": "TODO",
    "priority": "HIGH",
    "subtasks": [
      { "id": "...", "title": "Design the UI", "status": "OPEN", "position": 0 }
    ]
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/api/agent/features \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "YOUR_PROJECT_ID",
    "title": "Add OAuth login",
    "spec": "## OAuth Login\n\nImplement GitHub OAuth...",
    "priority": "high",
    "status": "todo",
    "subtasks": ["Create OAuth app", "Implement callback handler", "Store session"]
  }'
```

---

### GET /api/agent/features/:id

Get a single feature with all details.

**Response:**
```json
{
  "ok": true,
  "data": {
    "id": "cuid",
    "title": "...",
    "spec": "## Full spec...",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "subtasks": [...],
    "attachments": [...],
    "project": { "id": "...", "name": "..." }
  }
}
```

**Example:**
```bash
curl http://localhost:3000/api/agent/features/FEATURE_ID
```

---

### PATCH /api/agent/features/:id

Update a feature's fields and/or subtask statuses.

**Request body (all fields optional):**
```json
{
  "title": "Updated title",
  "description": "New description",
  "spec": "## Updated spec...",
  "priority": "urgent",
  "status": "in_review",
  "branchUrl": "https://github.com/org/repo/tree/feat/updated",
  "subtasks": [
    { "id": "subtask-id-1", "status": "done" },
    { "id": "subtask-id-2", "status": "open" }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "data": { ... }
}
```

**Examples:**
```bash
# Move feature to done
curl -X PATCH http://localhost:3000/api/agent/features/FEATURE_ID \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'

# Update spec and mark subtasks done
curl -X PATCH http://localhost:3000/api/agent/features/FEATURE_ID \
  -H "Content-Type: application/json" \
  -d '{
    "spec": "## Updated spec\n\nImplementation complete.",
    "status": "in_review",
    "subtasks": [{"id": "SUBTASK_ID", "status": "done"}]
  }'
```

---

## Error Responses

All errors return `{ ok: false, error: string }`:

```json
{ "ok": false, "error": "Feature not found" }
{ "ok": false, "error": "Validation failed", "details": { ... } }
{ "ok": false, "error": "Project not found" }
```

---

## Enum Reference

**Priority** (case-insensitive input): `low`, `medium`, `high`, `urgent`

**FeatureStatus** (case-insensitive, hyphens/spaces allowed): `backlog`, `todo`, `in_progress` (or `in-progress`), `in_review` (or `in-review`), `done`, `cancelled`

**SubtaskStatus**: `open`, `done`
