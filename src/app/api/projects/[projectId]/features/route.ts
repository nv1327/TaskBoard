import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFeatureSchema } from "@/lib/validations";
import { log } from "@/lib/changelog";
import { FeatureStatus } from "@prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as FeatureStatus | null;

  const features = await prisma.feature.findMany({
    where: {
      projectId,
      ...(status && { status }),
    },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: {
      _count: { select: { subtasks: true } },
      subtasks: { where: { status: "DONE" }, select: { id: true } },
    },
  });

  return NextResponse.json(features);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const body = await request.json();
    const data = createFeatureSchema.parse({ ...body, projectId });

    // determine next position in column
    const maxPosition = await prisma.feature.aggregate({
      where: { projectId, status: data.status ?? "BACKLOG" },
      _max: { position: true },
    });

    const feature = await prisma.feature.create({
      data: {
        title: data.title,
        description: data.description,
        spec: data.spec,
        priority: data.priority ?? "MEDIUM",
        status: data.status ?? "BACKLOG",
        position: (maxPosition._max.position ?? -1) + 1,
        branchUrl: data.branchUrl || null,
        prUrl: data.prUrl || null,
        projectId,
      },
    });
    await log({
      action: "FEATURE_CREATED",
      summary: `Feature created: "${feature.title}"`,
      projectId,
      featureId: feature.id,
      featureTitle: feature.title,
      meta: { status: feature.status, priority: feature.priority },
    });
    return NextResponse.json(feature, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create feature" }, { status: 500 });
  }
}
