import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { features: true } },
      },
    });

    const data = projects.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      repoUrl: p.repoUrl,
      featureCount: p._count.features,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to fetch projects" }, { status: 500 });
  }
}
