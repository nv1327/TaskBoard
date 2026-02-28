import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");

export async function POST(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() ?? "bin";
    const filename = `${uuidv4()}.${ext}`;
    const bytes = await file.arrayBuffer();
    await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes));

    const attachment = await prisma.attachment.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: `/uploads/${filename}`,
        featureId,
      },
    });
    return NextResponse.json(attachment, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ featureId: string }> }
) {
  const { featureId } = await params;
  const { searchParams } = new URL(request.url);
  const attachmentId = searchParams.get("id");
  if (!attachmentId) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await prisma.attachment.deleteMany({
      where: { id: attachmentId, featureId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
