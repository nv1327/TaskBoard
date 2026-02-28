import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectHeader } from "@/components/layout/ProjectHeader";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });
  if (!project) notFound();

  return (
    <div className="flex h-full flex-col">
      <ProjectHeader project={project} />
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
