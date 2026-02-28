import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateFeatureSchema } from "@/lib/validations";
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

    // Handle drag-and-drop reorder
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
      },
    });
    return NextResponse.json(feature);
  } catch {
    return NextResponse.json({ error: "Failed to update feature" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; featureId: string }> }
) {
  const { featureId } = await params;
  try {
    await prisma.feature.delete({ where: { id: featureId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete feature" }, { status: 500 });
  }
}
