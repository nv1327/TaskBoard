import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentUpdateFeatureSchema } from "@/lib/validations";

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

    // Update subtask statuses if provided
    if (data.subtasks && data.subtasks.length > 0) {
      await Promise.all(
        data.subtasks.map((s) =>
          prisma.subtask.update({
            where: { id: s.id },
            data: { status: s.status },
          })
        )
      );
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

    return NextResponse.json({ ok: true, data: feature });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update feature" }, { status: 500 });
  }
}
