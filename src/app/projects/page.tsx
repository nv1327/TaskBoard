import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { features: true } } },
  });

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Projects</h1>
            <p className="mt-1 text-sm text-zinc-500">Manage your software projects</p>
          </div>
          <Link href="/projects/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New project
            </Button>
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-12 text-center">
            <p className="text-zinc-500">No projects yet.</p>
            <Link href="/projects/new">
              <Button className="mt-4 gap-2" variant="outline">
                <Plus className="h-4 w-4" />
                Create your first project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={{
                ...project,
                createdAt: project.createdAt.toISOString(),
              }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
