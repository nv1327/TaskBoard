import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectWorkflowHelp } from "@/components/projects/ProjectWorkflowHelp";
import { ProjectAgentLinkCard } from "@/components/projects/ProjectAgentLinkCard";

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
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h2 className="mb-1 text-lg font-semibold text-zinc-900">Project settings</h2>
          <p className="text-sm text-zinc-500">
            Update metadata and keep a living markdown mission/context for this project.
          </p>
        </div>
        <ProjectWorkflowHelp projectId={project.id} />
        <ProjectAgentLinkCard projectId={project.id} />
        <ProjectForm project={project} />
      </div>
    </div>
  );
}
