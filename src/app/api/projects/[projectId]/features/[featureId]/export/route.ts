import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string }> }
) {
  const { projectId, featureId } = await params;

  const feature = await prisma.feature.findFirst({
    where: { id: featureId, projectId },
    include: {
      project: { select: { name: true } },
      subtasks: { orderBy: { position: "asc" } },
    },
  });

  if (!feature) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const subtasksMd =
    feature.subtasks.length > 0
      ? `\n## Subtasks\n\n${feature.subtasks
          .map((s) => `- [${s.status === "DONE" ? "x" : " "}] ${s.title}`)
          .join("\n")}\n`
      : "";

  const branchMd = feature.branchUrl
    ? `\n**Branch:** [${feature.branchUrl}](${feature.branchUrl})\n`
    : "";

  const md = `# ${feature.title}

**Project:** ${feature.project.name}
**Status:** ${feature.status.replace(/_/g, " ")}
**Priority:** ${feature.priority}${branchMd}
${feature.description ? `\n> ${feature.description}\n` : ""}
---
${feature.spec ? `\n${feature.spec}\n` : "\n_No specification written yet._\n"}${subtasksMd}
---
_Exported from PM Board — ${new Date().toISOString()}_
`;

  const slug = feature.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(md, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slug}.md"`,
    },
  });
}
