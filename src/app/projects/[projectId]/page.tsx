import { prisma } from "@/lib/prisma";
import { BoardView } from "@/components/board/BoardView";
import { notFound } from "next/navigation";

export default async function ProjectBoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const features = await prisma.feature.findMany({
    where: { projectId },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    include: {
      _count: { select: { subtasks: true } },
      subtasks: { where: { status: "DONE" }, select: { id: true } },
    },
  });

  return (
    <div className="h-full overflow-hidden">
      <BoardView initialFeatures={features} projectId={projectId} />
    </div>
  );
}
