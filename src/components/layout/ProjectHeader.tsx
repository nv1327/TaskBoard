"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch, ExternalLink, Kanban, Activity, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
}

export function ProjectHeader({ project }: { project: Project }) {
  const router = useRouter();
  const pathname = usePathname();

  const isActivity = pathname.endsWith("/activity");
  const isSettings = pathname.endsWith("/settings");

  async function handleDelete() {
    if (!confirm("Delete this project and all its features?")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      {/* Top bar */}
      <div className="flex h-12 items-center justify-between px-6">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="font-semibold text-zinc-900 truncate">{project.name}</h1>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <GitBranch className="h-3 w-3" />
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
          >
            Delete project
          </Button>
          <Link href={`/projects/${project.id}/features/new`}>
            <Button size="sm" className="gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" />
              New feature
            </Button>
          </Link>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4">
        <Link
          href={`/projects/${project.id}`}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            !isActivity && !isSettings
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Kanban className="h-3.5 w-3.5" />
          Board
        </Link>
        <Link
          href={`/projects/${project.id}/activity`}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            isActivity
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Activity className="h-3.5 w-3.5" />
          Activity
        </Link>
        <Link
          href={`/projects/${project.id}/settings`}
          className={cn(
            "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
            isSettings
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-400 hover:text-zinc-600"
          )}
        >
          <Settings className="h-3.5 w-3.5" />
          Settings
        </Link>
      </div>
    </header>
  );
}
