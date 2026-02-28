import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentUpdateFeatureSchema } from "@/lib/validations";
import { log } from "@/lib/changelog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  try {
    const feature = await prisma.feature.findUnique({
      where: { id: featureId },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        attachments: { orderBy: { createdAt: "asc" } },
        project: { select: { id: true, name: true } },
      },
    });
    if (!feature) {
      return NextResponse.json({ ok: false, error: "Feature not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: feature });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch feature" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  try {
    const body = await request.json();
    const data = agentUpdateFeatureSchema.parse(body);

    const before = await prisma.feature.findUnique({ where: { id: featureId } });

    // Update subtask statuses and log each change
    if (data.subtasks && data.subtasks.length > 0) {
      const subtasksBefore = await prisma.subtask.findMany({
        where: { id: { in: data.subtasks.map((s) => s.id) } },
      });
      await Promise.all(
        data.subtasks.map((s) =>
          prisma.subtask.update({ where: { id: s.id }, data: { status: s.status } })
        )
      );
      if (before) {
        for (const s of data.subtasks) {
          const prev = subtasksBefore.find((sb) => sb.id === s.id);
          if (prev && prev.status !== s.status) {
            const action = s.status === "DONE" ? "SUBTASK_DONE" : "SUBTASK_REOPENED";
            await log({
              action,
              summary:
                s.status === "DONE"
                  ? `Subtask completed: "${prev.title}" in "${before.title}"`
                  : `Subtask reopened: "${prev.title}" in "${before.title}"`,
              projectId: before.projectId,
              featureId,
              featureTitle: before.title,
              subtaskId: s.id,
              subtaskTitle: prev.title,
              source: "agent",
              meta: { from: prev.status, to: s.status },
            });
          }
        }
      }
    }

    const feature = await prisma.feature.update({
      where: { id: featureId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.spec !== undefined && { spec: data.spec }),
        ...(data.priority !== undefined && { priority: data.priority }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.branchUrl !== undefined && { branchUrl: data.branchUrl || null }),
      },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        project: { select: { id: true, name: true } },
      },
    });

    if (before) {
      if (data.status && before.status !== data.status) {
        await log({
          action: "STATUS_CHANGED",
          summary: `"${feature.title}" moved from ${before.status} → ${data.status}`,
          projectId: before.projectId,
          featureId,
          featureTitle: feature.title,
          source: "agent",
          meta: { from: before.status, to: data.status },
        });
      }
      if (data.priority && before.priority !== data.priority) {
        await log({
          action: "PRIORITY_CHANGED",
          summary: `"${feature.title}" priority changed from ${before.priority} → ${data.priority}`,
          projectId: before.projectId,
          featureId,
          featureTitle: feature.title,
          source: "agent",
          meta: { from: before.priority, to: data.priority },
        });
      }
      if (data.spec !== undefined && before.spec !== data.spec) {
        await log({
          action: "SPEC_UPDATED",
          summary: `Spec updated for "${feature.title}"`,
          projectId: before.projectId,
          featureId,
          featureTitle: feature.title,
          source: "agent",
        });
      }
    }

    return NextResponse.json({ ok: true, data: feature });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update feature" }, { status: 500 });
  }
}
