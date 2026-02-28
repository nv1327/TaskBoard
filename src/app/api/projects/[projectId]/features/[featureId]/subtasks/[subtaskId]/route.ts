import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateSubtaskSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ subtaskId: string }> }
) {
  const { subtaskId } = await params;
  try {
    const body = await request.json();
    const data = updateSubtaskSchema.parse(body);
    const subtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.position !== undefined && { position: data.position }),
      },
    });
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
