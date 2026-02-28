import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentUpdateProjectSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { features: true } } },
    });

    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      data: {
        id: project.id,
        name: project.name,
        description: project.description,
        repoUrl: project.repoUrl,
        featureCount: project._count.features,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const body = await request.json();
    const data = agentUpdateProjectSchema.parse(body);

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.repoUrl !== undefined && { repoUrl: data.repoUrl || null }),
      },
    });

    return NextResponse.json({ ok: true, data: project });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update project" }, { status: 500 });
  }
}
