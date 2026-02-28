<div align="center">

# PM Board

**A Linear-inspired project management tool built for developers and AI agents.**

Track features, write specs, manage subtasks, and give your AI agents structured access to your project context — all from a local-first Kanban board.

<br />

![Next.js](https://img.shields.io/badge/Next.js_16-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_5-2D3748?style=flat-square&logo=prisma)

</div>

---

## Overview

PM Board is a single-user, locally-hosted project management tool designed around two workflows:

1. **Human workflow** — A clean Kanban board with drag-and-drop columns, rich markdown feature specs, file attachments, and subtask tracking.
2. **Agent workflow** — A flat REST API (`/api/agent/*`) that lets Claude Code and other AI agents read your project context, create features, update statuses, and mark subtasks complete — without touching the UI.

Built for developers who want Linear-style project management without the SaaS overhead, and who want their AI tools to stay in sync with what they're actually building.

---

## Features

### Kanban Board
- Six status columns: **Backlog → Todo → In Progress → In Review → Done → Cancelled**
- Drag-and-drop reordering within and across columns (powered by dnd-kit)
- Position persistence — survives reloads

### Feature Cards
- Priority badges with color coding (Urgent / High / Medium / Low)
- Subtask progress bar (done/total)
- Branch URL linking
- One-click navigation to full detail view

### Feature Detail
- Inline status and priority selectors (save on change)
- Full **markdown spec editor** with live preview (`@uiw/react-md-editor`)
- **Copy spec** to clipboard in one click
- **Export spec** as a `.md` file (named after the feature title)
- Branch URL with external link

### Subtasks
- Add, toggle, and delete subtasks inline
- GFM-style checklist (`- [x]`) in markdown exports
- Progress tracked on the Kanban card

### Attachments
- Drag-and-drop file upload zone
- Image thumbnails / file type icons
- Files stored in `public/uploads/` and served directly by Next.js

### Agent API
- Flat REST namespace at `/api/agent/*`
- Lowercase enum input coercion (`"in_progress"`, `"high"`, etc.)
- Consistent `{ ok, data }` response envelope
- Full-text search across title, description, and spec
- Create features with auto-created subtasks in a single request
- **Project context endpoint** — returns a full formatted markdown snapshot of any project
- See [`AGENTS.md`](./AGENTS.md) for the full reference

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | PostgreSQL 16 (Homebrew) |
| ORM | Prisma 5 |
| Styling | Tailwind CSS v4 + shadcn/ui (zinc theme) |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Markdown | @uiw/react-md-editor |
| Data fetching | @tanstack/react-query |
| Validation | Zod v4 |
| Icons | Lucide React |

---

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 16

```bash
# Install PostgreSQL via Homebrew (macOS)
brew install postgresql@16
brew services start postgresql@16
```

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/your-username/pm-board.git
cd pm-board

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and set your DATABASE_URL:
# DATABASE_URL="postgresql://<user>@localhost:5432/pm_board?schema=public"

# 4. Create the database
psql -U <user> -c "CREATE DATABASE pm_board;" postgres

# 5. Run migrations and generate Prisma client
npx prisma migrate dev

# 6. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it will redirect to the project list.

### Branch-isolated local Postgres workflow (recommended)

To prevent feature-branch Prisma migrations from affecting your main dev database,
PM Board includes two scripts:

```bash
# Show which DB you're currently using (sanity check)
npm run db:which

# On a feature branch: create/switch to branch DB + apply migrations
npm run db:branch

# After human-approved merge to main: restore main DB + apply merged migrations + drop branch DB
git checkout main
npm run db:cleanup -- --branch feat/<slug> --yes
```

Notes:
- Uses local PostgreSQL (no Docker required)
- Stores canonical main connection in `.env` as `DATABASE_URL_MAIN`
- Cleanup script only runs on `main`/`master` as a safety check

---

## Project Structure

```
pm-board/
├── prisma/
│   └── schema.prisma          # DB schema (Project, Feature, Subtask, Attachment)
├── public/
│   └── uploads/               # User-uploaded files (gitignored)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── projects/      # UI REST API
│   │   │   └── agent/         # Agent REST API (/api/agent/*)
│   │   └── projects/          # App pages (board, feature detail, forms)
│   ├── components/
│   │   ├── board/             # BoardView, BoardColumn, FeatureCard
│   │   ├── features/          # FeatureDetail, FeatureForm, SpecEditor,
│   │   │                      # SubtaskList, AttachmentUpload, AttachmentGrid
│   │   ├── layout/            # Sidebar, ProjectHeader, PriorityBadge
│   │   └── ui/                # shadcn components
│   └── lib/
│       ├── prisma.ts           # Singleton PrismaClient
│       ├── validations.ts      # Zod schemas (UI + agent with enum coercion)
│       └── utils.ts            # cn(), formatDate(), formatDateTime()
├── AGENTS.md                  # Agent API reference + Claude Code integration guide
└── AGENT_API.md               # Full agent API documentation with curl examples
```

---

## Database Schema

```
Project  ──< Feature ──< Subtask
                    ──< Attachment
```

| Model | Key fields |
|---|---|
| `Project` | name, description, contextMd (markdown mission/context), repoUrl |
| `Feature` | title, description, spec (markdown), priority, status, position, branchUrl |
| `Subtask` | title, status (OPEN/DONE), position |
| `Attachment` | filename, originalName, mimeType, size, url |

---

## API Reference

### UI API

```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id

GET    /api/projects/:id/features
POST   /api/projects/:id/features
GET    /api/projects/:id/features/:fid
PATCH  /api/projects/:id/features/:fid          # includes drag-drop reorder
DELETE /api/projects/:id/features/:fid

GET    /api/projects/:id/features/:fid/export   # download spec as .md file

POST   /api/projects/:id/features/:fid/subtasks
PATCH  /api/projects/:id/features/:fid/subtasks/:sid
DELETE /api/projects/:id/features/:fid/subtasks/:sid

POST   /api/projects/:id/features/:fid/attachments
DELETE /api/projects/:id/features/:fid/attachments?id=:aid
```

### Agent API

```
GET   /api/agent/projects
GET   /api/agent/projects/:id
PATCH /api/agent/projects/:id
GET   /api/agent/projects/:id/context              # full project snapshot as markdown
GET   /api/agent/features?projectId=&status=&priority=&q=&limit=
POST  /api/agent/features
GET   /api/agent/features/:id
PATCH /api/agent/features/:id
```

All agent endpoints return `{ ok: boolean, data: ... }`. Enum values accept lowercase input. See [`AGENTS.md`](./AGENTS.md) for full documentation with examples.

---

## Agent Integration

### Automatically creating a PM Board project when spinning up a new repo

The fastest way to wire up every new project from day one — run this once when you create the directory:

```bash
/path/to/pm-board/scripts/init-project.sh \
  --name "My New Project" \
  --description "What it does" \
  --repo "https://github.com/you/my-new-project" \
  --dir ~/Projects/my-new-project
```

This will:
1. Hit `POST /api/projects` to register the project in PM Board
2. Write a `.pm-board.md` link file into the project directory with the project ID baked in
3. Print the PM Board URL so you can open it straight away

**To make this fully automatic with Claude Code**, use the provided template to generate a personalised config and append it to your global `~/.claude/CLAUDE.md`. After that, any time you ask Claude Code to scaffold a new project it will register it in PM Board and drop the `.pm-board.md` file without being asked.

```bash
# 1. Copy the template and fill in your local paths
cp scripts/global-claude.template.md scripts/global-claude.md
# Edit scripts/global-claude.md — replace <PM_BOARD_DIR> and <PM_BOARD_URL>

# 2. Append to your global Claude config
cat scripts/global-claude.md >> ~/.claude/CLAUDE.md
```

> `scripts/global-claude.md` is gitignored — your local paths stay private.

---

### Linking a project repo to PM Board

Each of your software repos can declare which PM Board project it belongs to by adding a `.pm-board.md` file to its root. Copy the template and fill in your project ID (visible in the PM Board URL or via the API):

```bash
# Get your project ID
curl -s http://localhost:3000/api/agent/projects | jq -r '.data[] | "\(.id)  \(.name)"'

# Copy the template into your repo
cp /path/to/pm-board/scripts/pm-board.template.md /path/to/your-repo/.pm-board.md
# Then edit it and replace REPLACE_WITH_PROJECT_ID
```

The `.pm-board.md` file looks like this:

```markdown
---
pm_board_project_id: cmm5uqb6u0000y0n9j07pqt7n
pm_board_url: http://localhost:3000
---
```

`pm_board_project_id` is the canonical link key (project names can change).

### Loading context at the start of a session

**Option 1 — Direct curl (paste into any agent conversation):**

```bash
curl -s http://localhost:3000/api/agent/projects/<projectId>/context
```

Returns a fully-formatted markdown document with all features, specs, subtasks, and a status summary — ready to paste or pipe anywhere.

**Option 2 — Save to a file and attach:**

```bash
# From within your project repo (reads .pm-board.md automatically)
/path/to/pm-board/scripts/load-context.sh

# Saves .pm-board-context.md in the current directory
# Then attach that file to your Claude or agent conversation
```

**Option 3 — Pipe directly into Claude Code:**

```bash
/path/to/pm-board/scripts/load-context.sh --print | claude
```

**Option 4 — Add to `CLAUDE.md` for automatic loading:**

```markdown
## Project context

This project is tracked in PM Board. At the start of each session, load current tasks:

curl -s http://localhost:3000/api/agent/projects/<projectId>/context
```

### What the context document contains

```
# Project Context: My Project

## Summary
| Status       | Count |
|---|---|
| In Progress  | 2     |
| Todo/Backlog | 5     |
| Done         | 3     |

## Features

### In Progress (2)

#### Add OAuth login
- Priority: HIGH
- ID: `cmm5v5a250001z5p1yt0v9q6g`
  - [ ] Create OAuth app
  - [x] Implement callback handler

  **Spec:**
  ## OAuth Login
  Implement GitHub OAuth using NextAuth...
```

The document includes a self-referencing fetch URL at the top so agents always know where to get a fresh copy mid-session.

### Updating features from an agent

```bash
# Move a feature to in_review
curl -X PATCH http://localhost:3000/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review"}'

# Mark a subtask done
curl -X PATCH http://localhost:3000/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"subtasks": [{"id": "<subtaskId>", "status": "done"}]}'
```

See [`AGENTS.md`](./AGENTS.md) for the complete reference.

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |

Create a `.env` file at the project root (never committed):

```
DATABASE_URL="postgresql://<user>@localhost:5432/pm_board?schema=public"
```

---

## Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run context      # Load project context from .pm-board.md → .pm-board-context.md
npm run init-project # Register a new project in PM Board (pass args via --)

# Examples
npm run init-project -- --name "My Project" --dir ~/Projects/my-project
npm run context                         # load context from .pm-board.md in current dir

# One-time global Claude Code setup
cp scripts/global-claude.template.md scripts/global-claude.md
# (edit scripts/global-claude.md with your local paths, then:)
cat scripts/global-claude.md >> ~/.claude/CLAUDE.md

npx prisma studio                       # Open Prisma Studio (visual DB browser)
npx prisma migrate dev --name <name>    # Create and apply a new migration
```

---

## Roadmap

- [ ] Multi-project Kanban switcher
- [ ] Feature labels / tags
- [ ] Due dates and timeline view
- [ ] Webhook support for agent notifications
- [ ] MCP server wrapper for native Claude tool use

---

<div align="center">

Built for local use. No auth, no cloud, no nonsense.

</div>
