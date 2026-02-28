"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FolderOpen, Plus, LayoutGrid } from "lucide-react";

interface Project {
  id: string;
  name: string;
}

interface SidebarProps {
  projects: Project[];
}

export function Sidebar({ projects }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const currentProjectId = params?.projectId as string | undefined;

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900">
      {/* Logo */}
      <div className="flex h-12 items-center border-b border-zinc-800 px-4">
        <span className="text-sm font-semibold text-white">PM Board</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* All projects link */}
        <Link
          href="/projects"
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
            pathname === "/projects"
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          All Projects
        </Link>

        {/* Projects list */}
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between px-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Projects
            </span>
            <Link
              href="/projects/new"
              className="rounded p-0.5 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <Plus className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-0.5">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors",
                  currentProjectId === project.id
                    ? "bg-zinc-700 text-white"
                    : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                )}
              >
                <FolderOpen className="h-3 w-3 shrink-0" />
                <span className="truncate">{project.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </aside>
  );
}
