import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
  position: z.number().int().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const { projectId, milestoneId } = await params;
  try {
    const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ ok: false, error: "Milestone not found" }, { status: 404 });
    }

    const body = await request.json();
    const data = updateMilestoneSchema.parse(body);

    const milestone = await prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.targetDate !== undefined && {
          targetDate: data.targetDate ? new Date(data.targetDate) : null,
        }),
        ...(data.position !== undefined && { position: data.position }),
      },
      include: {
        features: {
          select: { id: true, title: true, status: true, priority: true },
          orderBy: { position: "asc" },
        },
      },
    });

    return NextResponse.json({ ok: true, data: milestone });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to update milestone" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; milestoneId: string }> }
) {
  const { projectId, milestoneId } = await params;
  try {
    const existing = await prisma.milestone.findUnique({ where: { id: milestoneId } });
    if (!existing || existing.projectId !== projectId) {
      return NextResponse.json({ ok: false, error: "Milestone not found" }, { status: 404 });
    }

    // Features become unscheduled (milestoneId → null) via ON DELETE SET NULL
    await prisma.milestone.delete({ where: { id: milestoneId } });

    return NextResponse.json({ ok: true, data: { id: milestoneId } });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to delete milestone" }, { status: 500 });
  }
}
