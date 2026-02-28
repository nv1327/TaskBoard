import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dedupeChangeLogs } from "@/lib/changelog-dedupe";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;
  const { searchParams } = new URL(request.url);

  const limitParam = searchParams.get("limit");
  const pageParam = searchParams.get("page");
  const pageSizeParam = searchParams.get("pageSize");
  const dedupeParam = searchParams.get("dedupe");

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, Number.parseInt(pageSizeParam ?? limitParam ?? "50", 10) || 50)
  );
  const dedupe = dedupeParam === "true";

  try {
    const total = await prisma.changeLog.count({ where: { projectId } });
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    const entries = await prisma.changeLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * pageSize,
      take: pageSize,
    });

    const data = dedupe ? dedupeChangeLogs(entries) : entries;

    return NextResponse.json({
      ok: true,
      data,
      count: data.length,
      page: safePage,
      pageSize,
      total,
      totalPages,
      deduped: dedupe,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch changelog" }, { status: 500 });
  }
}
