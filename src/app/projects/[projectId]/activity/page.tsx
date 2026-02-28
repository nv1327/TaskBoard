import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ActivityFeed } from "@/components/layout/ActivityFeed";
import { dedupeChangeLogs } from "@/lib/changelog-dedupe";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const entries = dedupeChangeLogs(
    await prisma.changeLog.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 200,
    })
  );

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-zinc-900">Activity</h2>
          <p className="mt-1 text-sm text-zinc-500">
            All recorded changes to features, subtasks, and specs in this project.
          </p>
        </div>
        <ActivityFeed entries={entries} projectId={projectId} />
      </div>
    </div>
  );
}
