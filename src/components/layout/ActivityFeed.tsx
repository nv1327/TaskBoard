"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ChangeLog } from "@prisma/client";

const ACTION_CONFIG: Record<
  string,
  { label: string; color: string; dot: string }
> = {
  FEATURE_CREATED:  { label: "Created",          color: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-400" },
  FEATURE_DELETED:  { label: "Deleted",           color: "bg-red-50 text-red-700 border-red-200",      dot: "bg-red-400" },
  STATUS_CHANGED:   { label: "Status changed",    color: "bg-violet-50 text-violet-700 border-violet-200", dot: "bg-violet-400" },
  PRIORITY_CHANGED: { label: "Priority changed",  color: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-400" },
  SPEC_UPDATED:     { label: "Spec updated",       color: "bg-zinc-100 text-zinc-600 border-zinc-200",  dot: "bg-zinc-400" },
  SUBTASK_CREATED:  { label: "Subtask added",      color: "bg-zinc-100 text-zinc-600 border-zinc-200",  dot: "bg-zinc-400" },
  SUBTASK_DONE:     { label: "Subtask done",       color: "bg-green-50 text-green-700 border-green-200", dot: "bg-green-400" },
  SUBTASK_REOPENED: { label: "Subtask reopened",   color: "bg-yellow-50 text-yellow-700 border-yellow-200", dot: "bg-yellow-400" },
};

const ALL_FILTERS = ["All", "Features", "Subtasks", "Status", "Spec"] as const;
type Filter = (typeof ALL_FILTERS)[number];

const FILTER_ACTIONS: Record<Filter, string[] | null> = {
  All: null,
  Features: ["FEATURE_CREATED", "FEATURE_DELETED"],
  Subtasks: ["SUBTASK_CREATED", "SUBTASK_DONE", "SUBTASK_REOPENED"],
  Status: ["STATUS_CHANGED", "PRIORITY_CHANGED"],
  Spec: ["SPEC_UPDATED"],
};

interface ActivityFeedProps {
  entries: ChangeLog[];
  projectId: string;
}

export function ActivityFeed({ entries, projectId }: ActivityFeedProps) {
  const [filter, setFilter] = useState<Filter>("All");

  const visible = FILTER_ACTIONS[filter]
    ? entries.filter((e) => FILTER_ACTIONS[filter]!.includes(e.action))
    : entries;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Filter tabs */}
      <div className="mb-6 flex items-center gap-1">
        {ALL_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              filter === f
                ? "bg-zinc-900 text-white"
                : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">
          {visible.length} {visible.length === 1 ? "entry" : "entries"}
        </span>
      </div>

      {/* Feed */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-200 py-16 text-center">
          <p className="text-sm text-zinc-400">No activity yet.</p>
          <p className="mt-1 text-xs text-zinc-300">
            Actions on features and subtasks will appear here.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-200" />

          <div className="space-y-0">
            {visible.map((entry) => {
              const config = ACTION_CONFIG[entry.action] ?? {
                label: entry.action,
                color: "bg-zinc-100 text-zinc-600 border-zinc-200",
                dot: "bg-zinc-300",
              };

              return (
                <div key={entry.id} className="relative flex gap-4 pb-5">
                  {/* Dot */}
                  <div className="relative z-10 mt-1 flex h-4 w-4 shrink-0 items-center justify-center">
                    <span className={cn("h-2 w-2 rounded-full", config.dot)} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          config.color
                        )}
                      >
                        {config.label}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-zinc-700">{entry.summary}</p>

                    {entry.featureId && (
                      <Link
                        href={`/projects/${projectId}/features/${entry.featureId}`}
                        className="mt-1 inline-flex items-center gap-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        {entry.featureTitle ?? entry.featureId}
                        <span className="text-zinc-300">→</span>
                      </Link>
                    )}

                    {/* Meta pills */}
                    {entry.meta && typeof entry.meta === "object" && !Array.isArray(entry.meta) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(entry.meta as Record<string, string>)
                          .filter(([k]) => k !== "source")
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[10px] text-zinc-500"
                            >
                              {k}: {v}
                            </span>
                          ))}
                        {(entry.meta as Record<string, string>).source === "agent" && (
                          <span className="rounded border border-violet-200 bg-violet-50 px-1.5 py-0.5 text-[10px] text-violet-500">
                            via agent
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
