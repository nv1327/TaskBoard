"use client";

import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { FeatureCard } from "./FeatureCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Feature, FeatureStatus } from "@prisma/client";

interface BoardColumnProps {
  status: FeatureStatus;
  label: string;
  features: Array<
    Feature & {
      _count: { subtasks: number };
      subtasks: { id: string }[];
    }
  >;
  projectId: string;
  color: string;
}

export function BoardColumn({ status, label, features, projectId, color }: BoardColumnProps) {
  const { isOver, setNodeRef } = useDroppable({ id: status });

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg border border-zinc-200 bg-zinc-50">
      {/* Column header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", color)} />
          <span className="text-xs font-semibold text-zinc-700">{label}</span>
          <span className="rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
            {features.length}
          </span>
        </div>
        <Link
          href={`/projects/${projectId}/features/new`}
          className="rounded p-0.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-600"
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 transition-colors",
          isOver && "bg-zinc-100"
        )}
      >
        <ScrollArea className="h-[calc(100vh-10rem)] px-2 py-2">
          <SortableContext
            items={features.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {features.length === 0 ? (
                <div className="flex h-20 items-center justify-center rounded-md border border-dashed border-zinc-200">
                  <p className="text-xs text-zinc-400">No features</p>
                </div>
              ) : (
                features.map((feature) => (
                  <FeatureCard
                    key={feature.id}
                    feature={feature}
                    projectId={projectId}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>
    </div>
  );
}
