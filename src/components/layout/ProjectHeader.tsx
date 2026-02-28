"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, GitBranch, ExternalLink } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
}

export function ProjectHeader({ project }: { project: Project }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this project and all its features?")) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    router.push("/projects");
    router.refresh();
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-zinc-200 bg-white px-6">
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
    </header>
  );
}
