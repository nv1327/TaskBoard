import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/projects/ProjectForm";

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) notFound();

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-lg">
        <h2 className="mb-1 text-lg font-semibold text-zinc-900">Project settings</h2>
        <p className="mb-6 text-sm text-zinc-500">
          Update the project name, description, and repository URL.
        </p>
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
