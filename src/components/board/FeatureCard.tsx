"use client";

import Link from "next/link";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PriorityBadge } from "@/components/layout/PriorityBadge";
import { Progress } from "@/components/ui/progress";
import { GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feature } from "@prisma/client";

interface FeatureCardProps {
  feature: Feature & {
    _count: { subtasks: number };
    subtasks: { id: string }[];
  };
  projectId: string;
  overlay?: boolean;
}

export function FeatureCard({ feature, projectId, overlay }: FeatureCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: feature.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const totalSubtasks = feature._count.subtasks;
  const doneSubtasks = feature.subtasks.length;
  const progress = totalSubtasks > 0 ? Math.round((doneSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-zinc-200 bg-white p-3 shadow-sm transition-shadow",
        isDragging && "opacity-40",
        overlay && "rotate-1 shadow-lg"
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-0 cursor-grab rounded-md active:cursor-grabbing"
      />

      {/* Card content — above drag handle via pointer-events */}
      <div className="relative pointer-events-none">
        <Link
          href={`/projects/${projectId}/features/${feature.id}`}
          className="pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-sm font-medium text-zinc-900 leading-snug hover:text-zinc-600 transition-colors">
            {feature.title}
          </p>
        </Link>

        {feature.description && (
          <p className="mt-1 text-xs text-zinc-500 line-clamp-2">{feature.description}</p>
        )}

        <div className="mt-3 flex items-center justify-between gap-2">
          <PriorityBadge priority={feature.priority} />
          {feature.branchUrl && (
            <GitBranch className="h-3 w-3 text-zinc-400" />
          )}
        </div>

        {totalSubtasks > 0 && (
          <div className="mt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-zinc-400">
                {doneSubtasks}/{totalSubtasks} subtasks
              </span>
              <span className="text-[10px] text-zinc-400">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1" />
          </div>
        )}
      </div>
    </div>
  );
}
