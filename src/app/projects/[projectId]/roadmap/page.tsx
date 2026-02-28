import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RoadmapView } from "@/components/roadmap/RoadmapView";

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const [project, milestones, features] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId } }),
    prisma.milestone.findMany({
      where: { projectId },
      orderBy: { position: "asc" },
      include: {
        features: {
          orderBy: { position: "asc" },
          include: { subtasks: { select: { id: true, status: true } } },
        },
      },
    }),
    prisma.feature.findMany({
      where: { projectId },
      orderBy: [{ position: "asc" }],
      include: { subtasks: { select: { id: true, status: true } } },
    }),
  ]);

  if (!project) notFound();

  // Serialise dates for client component
  const serialisedMilestones = milestones.map((m) => ({
    ...m,
    targetDate: m.targetDate ? m.targetDate.toISOString() : null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    features: m.features.map((f) => ({
      id: f.id,
      title: f.title,
      status: f.status as string,
      priority: f.priority as string,
      branchUrl: f.branchUrl,
      prUrl: f.prUrl,
      milestoneId: f.milestoneId,
      subtasks: f.subtasks.map((s) => ({ id: s.id, status: s.status as string })),
    })),
  }));

  const serialisedFeatures = features.map((f) => ({
    id: f.id,
    title: f.title,
    status: f.status as string,
    priority: f.priority as string,
    branchUrl: f.branchUrl,
    prUrl: f.prUrl,
    milestoneId: f.milestoneId,
    subtasks: f.subtasks.map((s) => ({ id: s.id, status: s.status as string })),
  }));

  return (
    <RoadmapView
      projectId={projectId}
      initialMilestones={serialisedMilestones}
      initialFeatures={serialisedFeatures}
    />
  );
}
