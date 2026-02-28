import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentCreateFeatureSchema, agentFeaturesQuerySchema } from "@/lib/validations";
import { log } from "@/lib/changelog";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = agentFeaturesQuerySchema.parse({
      projectId: searchParams.get("projectId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      q: searchParams.get("q") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    });

    const features = await prisma.feature.findMany({
      where: {
        ...(query.projectId && { projectId: query.projectId }),
        ...(query.status && { status: query.status }),
        ...(query.priority && { priority: query.priority }),
        ...(query.q && {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { description: { contains: query.q, mode: "insensitive" } },
            { spec: { contains: query.q, mode: "insensitive" } },
          ],
        }),
      },
      orderBy: [{ status: "asc" }, { priority: "asc" }, { position: "asc" }],
      take: query.limit,
      include: {
        _count: { select: { subtasks: true } },
        subtasks: { select: { id: true, title: true, status: true } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: features, count: features.length });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Invalid query params", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to fetch features" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = agentCreateFeatureSchema.parse(body);

    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: data.projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const maxPosition = await prisma.feature.aggregate({
      where: { projectId: data.projectId, status: data.status ?? "BACKLOG" },
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
        projectId: data.projectId,
      },
    });

    // Auto-create subtasks
    if (data.subtasks && data.subtasks.length > 0) {
      await prisma.subtask.createMany({
        data: data.subtasks.map((title, i) => ({
          title,
          featureId: feature.id,
          position: i,
        })),
      });
    }

    await log({
      action: "FEATURE_CREATED",
      summary: `Feature created: "${feature.title}"`,
      projectId: data.projectId,
      featureId: feature.id,
      featureTitle: feature.title,
      source: "agent",
      meta: { status: feature.status, priority: feature.priority },
    });

    const fullFeature = await prisma.feature.findUnique({
      where: { id: feature.id },
      include: {
        subtasks: { orderBy: { position: "asc" } },
        project: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ ok: true, data: fullFeature }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to create feature" }, { status: 500 });
  }
}
