import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSubtaskSchema } from "@/lib/validations";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  const subtasks = await prisma.subtask.findMany({
    where: { featureId },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(subtasks);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  try {
    const body = await request.json();
    const data = createSubtaskSchema.parse(body);

    const max = await prisma.subtask.aggregate({
      where: { featureId },
      _max: { position: true },
    });

    const subtask = await prisma.subtask.create({
      data: {
        title: data.title,
        featureId,
        position: (max._max.position ?? -1) + 1,
      },
    });
    return NextResponse.json(subtask, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
  }
}
