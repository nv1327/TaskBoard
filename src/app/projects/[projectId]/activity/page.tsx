import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ActivityFeed } from "@/components/layout/ActivityFeed";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 50;

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { projectId } = await params;
  const sp = await searchParams;

  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  const totalEntries = await prisma.changeLog.count({ where: { projectId } });
  const totalPages = Math.max(1, Math.ceil(totalEntries / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const entries = await prisma.changeLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const pageWindow = 2;
  const startPage = Math.max(1, safePage - pageWindow);
  const endPage = Math.min(totalPages, safePage + pageWindow);
  const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-900">Activity</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Full audit log of changes to features, subtasks, and specs in this project.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 bg-white p-3">
          <span className="text-xs text-zinc-500">
            {totalEntries} total entries · page {safePage} of {totalPages}
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Link href={`/projects/${projectId}/activity?page=${Math.max(1, safePage - 1)}`}>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage <= 1}>
                Prev
              </Button>
            </Link>

            {startPage > 1 && (
              <>
                <Link href={`/projects/${projectId}/activity?page=1`}>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">1</Button>
                </Link>
                {startPage > 2 && <span className="px-1 text-xs text-zinc-400">…</span>}
              </>
            )}

            {pages.map((p) => (
              <Link key={p} href={`/projects/${projectId}/activity?page=${p}`}>
                <Button
                  variant={p === safePage ? "default" : "outline"}
                  size="sm"
                  className="h-7 min-w-7 px-2 text-xs"
                >
                  {p}
                </Button>
              </Link>
            ))}

            {endPage < totalPages && (
              <>
                {endPage < totalPages - 1 && <span className="px-1 text-xs text-zinc-400">…</span>}
                <Link href={`/projects/${projectId}/activity?page=${totalPages}`}>
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">{totalPages}</Button>
                </Link>
              </>
            )}

            <Link href={`/projects/${projectId}/activity?page=${Math.min(totalPages, safePage + 1)}`}>
              <Button variant="outline" size="sm" className="h-7 px-2 text-xs" disabled={safePage >= totalPages}>
                Next
              </Button>
            </Link>
          </div>
        </div>

        <ActivityFeed entries={entries} projectId={projectId} />
      </div>
    </div>
  );
}
