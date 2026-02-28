"use client";

import Link from "next/link";
import { formatDate } from "@/lib/utils";
import { GitBranch, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  repoUrl: string | null;
  createdAt: string;
  _count: { features: number };
}

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group rounded-lg border border-zinc-200 bg-white p-5 transition-all hover:border-zinc-300 hover:shadow-sm cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-600" />
            <h3 className="font-semibold text-zinc-900 truncate">{project.name}</h3>
          </div>
          <span className="shrink-0 text-xs text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">
            {project._count.features} feature{project._count.features !== 1 ? "s" : ""}
          </span>
        </div>
        {project.description && (
          <p className="mt-2 text-sm text-zinc-500 line-clamp-2">{project.description}</p>
        )}
        <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
          <span>Created {formatDate(project.createdAt)}</span>
          {project.repoUrl && (
            <span className="flex items-center gap-1">
              <GitBranch className="h-3 w-3" />
              Repo linked
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
