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

```bash
<PM_BOARD_DIR>/scripts/init-project.sh \
  --name "<project name>" \
  --description "<one-line description>" \
  --repo "<github url if known>" \
  --context-file "<path to spec .md if available>" \
  --dir "<path to new project root>"
```

This will:
1. Create the project in PM Board via the API
2. Write a `.pm-board.md` file into the new project directory containing the project ID and context fetch instructions

After running it, confirm to me with the PM Board project URL so I can open it.

---

## Project size and workflow gates

PM Board uses feature statuses as explicit human approval gates. Follow the right workflow for the project size:

### Small / well-defined projects
Jump straight to the [Coding workflow](#coding-workflow) below.

### Large / greenfield projects — use the two-gate model

**Gate 1: Roadmap approval** (before any spec or code is written)

1. Read the full project context including the mission/contextMd.
2. Think through the problem space. Identify the major areas of work and a logical build order.
3. Propose a roadmap: create one feature per proposed work item in `backlog` status, with a title and a one-paragraph description. No spec yet — keep it lightweight enough for the human to scan and edit quickly:
```bash
curl -X POST <PM_BOARD_URL>/api/agent/features \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "<id>",
    "title": "Proposed feature title",
    "description": "One paragraph: what this is, why it matters, rough scope.",
    "priority": "medium",
    "status": "backlog"
  }'
```
4. After creating all proposed features, summarise the roadmap to the human: what you're proposing, the rationale for ordering, and any open questions.
5. **Stop. Wait for Gate 1 approval.** The human will review in the PM Board UI, edit titles/descriptions, reorder, delete features they don't want, and promote approved ones to `todo`. Do not write specs or code until a feature reaches `todo`.

**Gate 2: Code review** (after implementation — see [Coding workflow](#coding-workflow) below)

The human reviews each PR before it merges to `main`. This is the production safety gate.

---

## Starting a session in an existing project

If the current working directory (or any parent) contains a `.pm-board.md` file, load the
project context before doing any work:

```bash
PROJECT_ID=$(grep -m1 "^pm_board_project_id:" .pm-board.md | sed 's/pm_board_project_id:[[:space:]]*//')
curl -s "<PM_BOARD_URL>/api/agent/projects/$PROJECT_ID/context"
```

Read the returned context fully — feature titles, specs, subtask checklists, statuses, branch/PR links — before making any changes.

---

## Coding workflow (follow this for every feature, without being asked)

> For large projects, only implement features that are in `todo` status (human-approved). Do not implement `backlog` features that haven't been through Gate 1.

1. **Pick** the next `todo` feature from the context document. If the feature has no spec yet (the human approved it from the roadmap proposal), write the full spec now and `PATCH` it before starting implementation:
```bash
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"spec": "## Goal\n\n...\n\n## Acceptance criteria\n\n- ...\n\n## Subtasks\n\n- ..."}'
```
2. **Create a branch** named `feat/<short-slug>` from `main`. At this point, before writing any code:
   - Create a `.gitignore` appropriate for the language (`.venv/`, `__pycache__/`, `node_modules/`, build artifacts, etc.)
   - Set up the test environment now (e.g. `python3 -m venv .venv && .venv/bin/pip install pytest`). Do not wait until after implementation — a broken test environment at PR time is a blocker.
   - If this project uses branch-isolated databases, switch to branch DB and auto-apply migrations:
```bash
npm run db:branch
```
3. **Move the feature to `in_progress`** and record the branch URL. Verify the response:
```bash
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress", "branchUrl": "https://github.com/org/repo/tree/feat/<slug>"}'
# Confirm: response should show "status": "IN_PROGRESS" and the branchUrl you set
```
4. **Implement the feature.** As you complete each subtask, mark it done:
```bash
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"subtasks": [{"id": "<subtaskId>", "status": "done"}]}'
```
5. **Before opening a PR — all tests must pass.** Run the full test suite. If any test fails, fix the bug on this branch before proceeding. Do not move to `in_review` with a failing test suite.
5a. **E2E / smoke test** the happy path. For API features, exercise each new endpoint end-to-end (create → read → update → delete). For UI features, verify the core user flow works from the browser. Catch integration issues that unit tests miss.
5b. **Self-learning check** — before moving on, reflect on what you built:
   - Did anything surprise you? (unexpected API behaviour, schema constraints, missing abstractions, workflow gaps)
   - Is anything in `AGENTS.md`, `global-claude.md`, or `global-claude.template.md` now outdated or incomplete given what you learned?
   - Propose specific additions or edits to the human. Do not edit the docs unilaterally — wait for approval, then make the changes.
6. **Open a pull request** against `main`. Record the PR URL and move to `in_review`. Verify the response:
```bash
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "in_review", "prUrl": "https://github.com/org/repo/pull/<number>"}'
# Confirm: response should show "status": "IN_REVIEW" and the prUrl you set
# For local repos not yet on GitHub, use the compare URL as a placeholder:
# "prUrl": "https://github.com/org/repo/compare/main...feat/<slug>"
```
7. **Stop and wait for human review.** Do not merge. Do not start the next feature. Summarise what you implemented, what tests cover, and anything you want the reviewer to focus on.
8. Once the human approves and merges, mark the feature done:
```bash
curl -X PATCH <PM_BOARD_URL>/api/agent/features/<featureId> \
  -H "Content-Type: application/json" \
  -d '{"status": "done"}'
```
8a. **Document human review findings** in the feature spec. Append a `## Review findings` section via `PATCH`, recording what the human changed or corrected, why it mattered, and what future agents should do differently. This is institutional memory — future context fetches will include it.
8b. If this project uses branch-isolated databases, **only after human-approved merge**, run:
```bash
git checkout main
npm run db:cleanup -- --branch feat/<slug> --yes
```

---

## Discovering new work mid-session

If you identify new work that isn't tracked, create a feature for it:

```bash
curl -X POST <PM_BOARD_URL>/api/agent/features \
  -H "Content-Type: application/json" \
  -d '{"projectId": "<id>", "title": "...", "priority": "medium", "status": "backlog"}'
```

---

## Refreshing context

Re-fetch after any update to confirm changes before continuing work.

```bash
# Refresh and save to file
curl -s <PM_BOARD_URL>/api/agent/projects/<projectId>/context > .pm-board-context.md

# Or using the script (reads project ID from .pm-board.md automatically)
<PM_BOARD_DIR>/scripts/load-context.sh

# Show a diff of what changed since the last fetch
<PM_BOARD_DIR>/scripts/load-context.sh --diff
```

**Always refresh context when:**
- You finish a subtask or feature
- You open a PR or get review feedback
- You are resuming after a break
- You are about to start a new feature

---

## PM Board location

- UI:      <PM_BOARD_URL>
- API:     <PM_BOARD_URL>/api/agent
- Scripts: <PM_BOARD_DIR>/scripts/
