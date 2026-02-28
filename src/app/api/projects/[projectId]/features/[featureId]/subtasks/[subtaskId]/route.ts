import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSubtaskSchema } from "@/lib/validations";
import { log } from "@/lib/changelog";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string; subtaskId: string }> }
) {
  const { projectId, featureId, subtaskId } = await params;
  try {
    const body = await request.json();
    const data = updateSubtaskSchema.parse(body);

    const before = await prisma.subtask.findUnique({ where: { id: subtaskId } });

    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });

    if (before && data.status && before.status !== data.status) {
      const feature = await prisma.feature.findUnique({ where: { id: featureId } });
      const action = data.status === "DONE" ? "SUBTASK_DONE" : "SUBTASK_REOPENED";
      await log({
        action,
        summary:
          data.status === "DONE"
            ? `Subtask completed: "${subtask.title}" in "${feature?.title ?? featureId}"`
            : `Subtask reopened: "${subtask.title}" in "${feature?.title ?? featureId}"`,
        projectId,
        featureId,
        featureTitle: feature?.title,
        subtaskId: subtask.id,
        subtaskTitle: subtask.title,
        meta: { from: before.status, to: data.status },
      });
    }

    return NextResponse.json(subtask);
  } catch {
    return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const { subtaskId } = await params;
  try {
    await prisma.subtask.delete({ where: { id: subtaskId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
  }
}
