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
| `Project` | name, description, repoUrl |
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
GET  /api/agent/projects
GET  /api/agent/features?projectId=&status=&priority=&q=&limit=
POST /api/agent/features
GET  /api/agent/features/:id
PATCH /api/agent/features/:id
```

All agent endpoints return `{ ok: boolean, data: ... }`. Enum values accept lowercase input. See [`AGENTS.md`](./AGENTS.md) for full documentation with examples.

---

## Agent Integration

The fastest way to give Claude Code context from your board:

```bash
# Load all in-progress features into a session
claude "$(curl -s 'http://localhost:3000/api/agent/features?status=in_progress' \
  | jq -r '.data[] | "## \(.title)\n\(.spec // "")\n"')"
```

Or add to `CLAUDE.md` for automatic context loading:

```markdown
At the start of each session, fetch active work:
curl -s "http://localhost:3000/api/agent/features?status=in_progress"
```

See [`AGENTS.md`](./AGENTS.md) for the complete guide including create, update, and export workflows.

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
npm run dev        # Start development server (Turbopack)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint

npx prisma studio  # Open Prisma Studio (visual DB browser)
npx prisma migrate dev --name <name>  # Create and apply a new migration
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
