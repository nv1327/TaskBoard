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

  const [project, recentChangesRaw] = await Promise.all([
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
    prisma.changeLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!project) {
    return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  }

  const recentChanges = dedupeChangeLogs(recentChangesRaw).slice(0, 10);

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

          return `#### ${f.title}\n- Priority: ${f.priority}\n- ID: \`${f.id}\`${branch}${subtaskLines}${specBlock}`;
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

## Summary

| Status | Count |
|---|---|
| In Progress | ${inProgress} |
| Todo / Backlog | ${todo} |
| Done | ${done} |
| **Total** | **${total}** |

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

**Refresh this context** whenever any of the following happen:
- You complete a subtask or finish a feature
- You identify new work that should be tracked
- You are mid-session and want to confirm current state before continuing

**To update a feature status:**
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"status": "done"}'
\`\`\`

**To mark a subtask complete:**
\`\`\`bash
curl -X PATCH ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features/<featureId> \\
  -H "Content-Type: application/json" \\
  -d '{"subtasks": [{"id": "<subtaskId>", "status": "done"}]}'
\`\`\`

**To create a new feature:**
\`\`\`bash
curl -X POST ${process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000"}/api/agent/features \\
  -H "Content-Type: application/json" \\
  -d '{"projectId": "${project.id}", "title": "...", "priority": "medium", "status": "backlog"}'
\`\`\`

After any update, re-fetch this document to confirm the change is reflected.

_Generated by PM Board · ${new Date().toISOString()}_
`;

  return new NextResponse(md, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
