import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  targetDate: z.string().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const milestones = await prisma.milestone.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        features: {
          orderBy: { position: "asc" },
          include: { subtasks: { select: { id: true, status: true } } },
        },
      },
    });
    return NextResponse.json({ ok: true, data: milestones });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch milestones" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = createSchema.parse(body);

    const max = await prisma.milestone.aggregate({
      where: { projectId },
      _max: { position: true },
    });
    const position = (max._max.position ?? -1) + 1;

    const milestone = await prisma.milestone.create({
      data: {
        name: data.name,
        description: data.description,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        position,
        projectId,
      },
      include: { features: true },
    });

    return NextResponse.json({ ok: true, data: milestone }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to create milestone" }, { status: 500 });
  }
}
