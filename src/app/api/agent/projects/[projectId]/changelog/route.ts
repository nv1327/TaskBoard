import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dedupeChangeLogs } from "@/lib/changelog-dedupe";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);

  try {
    const entries = await prisma.changeLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const deduped = dedupeChangeLogs(entries);
    return NextResponse.json({ ok: true, data: deduped, count: deduped.length });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch changelog" }, { status: 500 });
  }
}
