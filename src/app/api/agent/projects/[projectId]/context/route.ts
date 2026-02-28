import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dedupeChangeLogs } from "@/lib/changelog-dedupe";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") ?? "markdown"; // markdown | json

  const ACTIVITY_LIMIT = 5;

  const [project, milestones, recentChangesRaw] = await Promise.all([
    prisma.project.findUnique({
      where: { id: projectId },
      include: {
        features: {
          orderBy: [{ status: "asc" }, { position: "asc" }],
          include: {
            subtasks: { orderBy: { position: "asc" } },
          },
        },
      },
    }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
    }),
    prisma.changeLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  const recentChanges = dedupeChangeLogs(recentChangesRaw).slice(0, ACTIVITY_LIMIT);

  if (format === "json") {
    return NextResponse.json({ ok: true, data: project });
  }

  // Group features by status
  const groups: Record<string, typeof project.features> = {};
  for (const feature of project.features) {
    if (!groups[feature.status]) groups[feature.status] = [];
    groups[feature.status].push(feature);
  }

  const STATUS_ORDER = ["IN_PROGRESS", "IN_REVIEW", "TODO", "BACKLOG", "DONE", "CANCELLED"];
  const STATUS_LABELS: Record<string, string> = {
    IN_PROGRESS: "In Progress",
    IN_REVIEW: "In Review",
    TODO: "Todo",
    BACKLOG: "Backlog",
    DONE: "Done",
    CANCELLED: "Cancelled",
  };

  const featuresSections = STATUS_ORDER.filter((s) => groups[s]?.length)
    .map((status) => {
      const features = groups[status];
      const header = `### ${STATUS_LABELS[status]} (${features.length})`;
      const items = features
        .map((f) => {
          const subtaskLines =
            f.subtasks.length > 0
              ? "\n" +
                f.subtasks
                  .map((s) => `  - [${s.status === "DONE" ? "x" : " "}] ${s.title}`)
                  .join("\n")
              : "";

          const specBlock = f.spec
            ? `\n\n  **Spec:**\n${f.spec
                .split("\n")
                .map((l) => `  ${l}`)
                .join("\n")}`
            : "";

          const branch = f.branchUrl ? `\n  Branch: ${f.branchUrl}` : "";
          const pr = (f as typeof f & { prUrl?: string | null }).prUrl ? `\n  PR: ${(f as typeof f & { prUrl?: string | null }).prUrl}` : "";

          return `#### ${f.title}\n- Priority: ${f.priority}\n- ID: \`${f.id}\`${branch}${pr}${subtaskLines}${specBlock}`;
        })
        .join("\n\n");

      return `${header}\n\n${items}`;
    })
    .join("\n\n---\n\n");

  const total = project.features.length;
  const inProgress = groups["IN_PROGRESS"]?.length ?? 0;
  const done = groups["DONE"]?.length ?? 0;
  const todo = (groups["TODO"]?.length ?? 0) + (groups["BACKLOG"]?.length ?? 0);

  const refreshUrl = `${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/projects/${project.id}/context`;

  const md = `# Project Context: ${project.name}

> **This is a live snapshot.** Re-fetch at any time to get the latest state.
> \`\`\`
> curl -s "${refreshUrl}" > .pm-board-context.md
> \`\`\`

## Project

- **Name:** ${project.name}
- **ID:** \`${project.id}\`${project.description ? `\n- **Description:** ${project.description}` : ""}${project.repoUrl ? `\n- **Repository:** ${project.repoUrl}` : ""}
- **Generated:** ${new Date().toISOString()}

## Mission / Context

${project.contextMd ? project.contextMd : "_No project mission/context markdown yet. Add it in Project Settings or via API (`contextMd`)._"}

## Summary

| Status | Count |
|---|---|
| In Progress | ${inProgress} |
| Todo / Backlog | ${todo} |
| Done | ${done} |
| **Total** | **${total}** |

## Milestones

${
  milestones.length === 0
    ? "_No milestones yet. Create them via the Roadmap view or API._"
    : milestones
        .map((m) => {
          const mFeatures = project!.features.filter(
            (f) => (f as typeof f & { milestoneId?: string | null }).milestoneId === m.id
          );
          const date = m.targetDate
            ? ` · ${new Date(m.targetDate).toISOString().slice(0, 10)}`
            : "";
          const counts = mFeatures.length
            ? ` (${mFeatures.length} feature${mFeatures.length === 1 ? "" : "s"})`
            : " (empty)";
          const featureList = mFeatures.length
            ? mFeatures
                .map((f) => `  - [${f.status}] ${f.title} · \`${f.id}\``)
                .join("\n")
            : "  _No features assigned_";
          return `### ${m.name}${date}${counts}\n\`${m.id}\`\n${featureList}`;
        })
        .join("\n\n")
}

## Features

${featuresSections || "_No features yet._"}

---

## Recent activity

${
  recentChanges.length === 0
    ? "_No activity recorded yet._"
    : recentChanges
        .map((c) => {
          const ts = new Date(c.createdAt).toISOString().replace("T", " ").slice(0, 16);
          const link = c.featureId ? ` · feature \`${c.featureId}\`` : "";
          return `- \`${ts}\` ${c.summary}${link}`;
        })
        .join("\n")
}

---

## Agent instructions

### Coding workflow (follow this for every feature)

1. Pick the next \`todo\` or \`backlog\` feature from this document.
2. Create a branch named after the feature: \`feat/<short-slug>\`
3. Move the feature to \`in_progress\` and record the branch URL:
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"status": "in_progress", "branchUrl": "https://github.com/org/repo/tree/feat/<slug>"}'
\`\`\`
4. Implement the feature. Mark subtasks done as you complete them:
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"subtasks": [{"id": "<subtaskId>", "status": "done"}]}'
\`\`\`
5. Open a pull request against \`main\`. Record the PR URL and move the feature to \`in_review\`:
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"status": "in_review", "prUrl": "https://github.com/org/repo/pull/<number>"}'
\`\`\`
6. **Stop and wait for human review.** Do not merge. Do not start the next feature until the human approves or requests changes.
7. Once merged, mark the feature done:
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"status": "done"}'
\`\`\`

### Other useful commands

**Refresh context** (do this at session start and after any update):
\`\`\`bash
curl -s "${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/projects/${project.id}/context"
\`\`\`

**Create a new feature (optionally assign to a milestone):**
\`\`\`bash
curl -X POST ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": "${project.id}", "title": "...", "priority": "medium", "status": "backlog", "milestoneId": "<milestoneId>"}'
\`\`\`

**Create a milestone:**
\`\`\`bash
curl -X POST ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/projects/${project.id}/milestones \\
  -H "Content-Type: application/json" \\
  -d '{"name": "v1.0", "description": "Initial release"}'
\`\`\`

After any update, re-fetch this document to confirm the change is reflected.

_Generated by PM Board · ${new Date().toISOString()}_
`;

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
