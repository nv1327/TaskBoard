import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createProjectSchema } from "@/lib/validations";

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { features: true } },
      },
    });
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = createProjectSchema.parse(body);
    const project = await prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        repoUrl: data.repoUrl || null,
      },
    });
    return NextResponse.json(project, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Validation failed", details: error }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
