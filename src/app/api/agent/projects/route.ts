import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { agentCreateProjectSchema } from "@/lib/validations";

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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = agentCreateProjectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        contextMd: data.contextMd,
        repoUrl: data.repoUrl || null,
      },
    });

    return NextResponse.json({ ok: true, data: project }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ ok: false, error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Failed to create project" }, { status: 500 });
  }
}
