import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateFeatureSchema } from "@/lib/validations";
import { log } from "@/lib/changelog";
import { FeatureStatus } from "@prisma/client";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string }> }
) {
  const { projectId, featureId } = await params;
  const feature = await prisma.feature.findFirst({
    where: { id: featureId, projectId },
    include: {
      subtasks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!feature) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(feature);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string }> }
) {
  const { projectId, featureId } = await params;
  try {
    const body = await request.json();
    const data = updateFeatureSchema.parse(body);

    // Fetch current state for changelog comparison
    const before = await prisma.feature.findUnique({ where: { id: featureId } });

    // Handle drag-and-drop reorder (status + position together)
    if (data.status !== undefined && data.position !== undefined) {
      const pos = data.position;
      const status = data.status as FeatureStatus;
      const feature = await prisma.$transaction(async (tx) => {
        await tx.feature.updateMany({
          where: { projectId, status, position: { gte: pos }, id: { not: featureId } },
          data: { position: { increment: 1 } },
        });
        return tx.feature.update({
          where: { id: featureId },
          data: { status, position: pos },
        });
      });
      if (before && before.status !== status) {
        await log({
          action: "STATUS_CHANGED",
          summary: `"${feature.title}" moved from ${before.status} → ${status}`,
          projectId,
          featureId: feature.id,
          featureTitle: feature.title,
          meta: { from: before.status, to: status },
        });
      }
      return NextResponse.json(feature);
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
        ...(data.prUrl !== undefined && { prUrl: data.prUrl || null }),
      },
    });

    if (before) {
      if (data.status && before.status !== data.status) {
        await log({
          action: "STATUS_CHANGED",
          summary: `"${feature.title}" moved from ${before.status} → ${data.status}`,
          projectId,
          featureId: feature.id,
          featureTitle: feature.title,
          meta: { from: before.status, to: data.status },
        });
      }
      if (data.priority && before.priority !== data.priority) {
        await log({
          action: "PRIORITY_CHANGED",
          summary: `"${feature.title}" priority changed from ${before.priority} → ${data.priority}`,
          projectId,
          featureId: feature.id,
          featureTitle: feature.title,
          meta: { from: before.priority, to: data.priority },
        });
      }
      if (data.spec !== undefined && before.spec !== data.spec) {
        await log({
          action: "SPEC_UPDATED",
          summary: `Spec updated for "${feature.title}"`,
          projectId,
          featureId: feature.id,
          featureTitle: feature.title,
        });
      }
    }

    return NextResponse.json(feature);
  } catch {
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string }> }
) {
  const { projectId, featureId } = await params;
  try {
    const feature = await prisma.feature.findUnique({ where: { id: featureId } });
    await prisma.feature.delete({ where: { id: featureId } });
    if (feature) {
      await log({
        action: "FEATURE_DELETED",
        summary: `Feature deleted: "${feature.title}"`,
        projectId,
        featureTitle: feature.title,
        meta: { status: feature.status, priority: feature.priority },
      });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 });
  }
}
