import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar projects={projects} />
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
