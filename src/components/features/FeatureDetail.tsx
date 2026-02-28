"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { formatDateTime } from "@/lib/utils";
import { PriorityBadge } from "@/components/layout/PriorityBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { GitBranch, ExternalLink, Edit2, Trash2, Copy, Check, Download } from "lucide-react";
import type { Feature, Subtask, Attachment, Priority, FeatureStatus } from "@prisma/client";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
const MarkdownPreview = dynamic(() => import("@uiw/react-md-editor").then((m) => m.default.Markdown), { ssr: false });

type FullFeature = Feature & { subtasks: Subtask[]; attachments: Attachment[] };

interface MilestoneSummary {
  id: string;
  name: string;
}

const STATUS_LABELS: Record<FeatureStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const STATUSES: FeatureStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];
const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export function FeatureDetail({
  feature: initial,
  projectId,
  milestones = [],
}: {
  feature: FullFeature & { milestoneId?: string | null };
  projectId: string;
  milestones?: MilestoneSummary[];
}) {
  const router = useRouter();
  const [feature, setFeature] = useState(initial);
  const [editingSpec, setEditingSpec] = useState(false);
  const [spec, setSpec] = useState(initial.spec ?? "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(initial.title);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySpec = useCallback(async () => {
    if (!feature.spec) return;
    await navigator.clipboard.writeText(feature.spec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [feature.spec]);

  async function patch(data: Partial<Feature>) {
    setSaving(true);
    const res = await fetch(`/api/projects/${projectId}/features/${feature.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const updated = await res.json();
    setFeature((f) => ({ ...f, ...updated }));
    setSaving(false);
    router.refresh();
  }

  async function saveSpec() {
    await patch({ spec });
    setEditingSpec(false);
  }

  async function deleteFeature() {
    if (!confirm("Delete this feature?")) return;
    await fetch(`/api/projects/${projectId}/features/${feature.id}`, { method: "DELETE" });
    router.push(`/projects/${projectId}`);
    router.refresh();
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="border-b border-zinc-200 bg-white px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          {editingTitle ? (
            <input
              autoFocus
              className="w-full rounded border border-zinc-300 px-2 py-0.5 text-xl font-semibold text-zinc-900 focus:border-zinc-400 focus:outline-none"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={async () => {
                setEditingTitle(false);
                const trimmed = titleDraft.trim();
                if (trimmed && trimmed !== feature.title) await patch({ title: trimmed });
                else setTitleDraft(feature.title);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") { setTitleDraft(feature.title); setEditingTitle(false); }
              }}
            />
          ) : (
            <h1
              className="cursor-text text-xl font-semibold text-zinc-900 hover:text-zinc-600"
              title="Click to edit title"
              onClick={() => { setTitleDraft(feature.title); setEditingTitle(true); }}
            >
              {feature.title}
            </h1>
          )}
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-zinc-400">Saving...</span>}
            <Button
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-red-500 hover:text-red-700"
              onClick={deleteFeature}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          <PriorityBadge priority={feature.priority} />

          <Select
            value={feature.status}
            onValueChange={(v) => patch({ status: v as FeatureStatus })}
          >
            <SelectTrigger className="h-6 w-32 border-0 bg-zinc-100 px-2 py-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={feature.priority}
            onValueChange={(v) => patch({ priority: v as Priority })}
          >
            <SelectTrigger className="h-6 w-28 border-0 bg-zinc-100 px-2 py-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {milestones.length > 0 && (
            <Select
              value={feature.milestoneId ?? "__none__"}
              onValueChange={(v) => patch({ milestoneId: v === "__none__" ? null : v } as Partial<Feature>)}
            >
              <SelectTrigger className="h-6 w-36 border-0 bg-zinc-100 px-2 py-0 text-xs">
                <SelectValue placeholder="Unscheduled" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" className="text-xs">Unscheduled</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={m.id} className="text-xs">
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <span className="text-xs text-zinc-400">
            Updated {formatDateTime(feature.updatedAt)}
          </span>
        </div>

        {(feature.branchUrl || feature.prUrl) && (
          <div className="mt-2 flex flex-wrap gap-3">
            {feature.branchUrl && (
              <a
                href={feature.branchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <GitBranch className="h-3 w-3" />
                Branch
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            {feature.prUrl && (
              <a
                href={feature.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-1 text-xs text-violet-600 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Pull Request
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-8">
        {feature.description && (
          <p className="mb-6 text-sm text-zinc-600">{feature.description}</p>
        )}

        <Separator className="mb-6" />

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-700">Specification</h2>
            {!editingSpec ? (
              <div className="flex items-center gap-1">
                {feature.spec && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      onClick={copySpec}
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <a
                      href={`/api/projects/${projectId}/features/${feature.id}/export`}
                      download
                    >
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        <Download className="h-3 w-3" />
                        .md
                      </Button>
                    </a>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setEditingSpec(true)}
                >
                  <Edit2 className="mr-1 h-3 w-3" />
                  Edit spec
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" className="text-xs" onClick={saveSpec}>
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => { setSpec(feature.spec ?? ""); setEditingSpec(false); }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
          {editingSpec ? (
            <div data-color-mode="light">
              <MDEditor value={spec} onChange={(v) => setSpec(v ?? "")} height={400} preview="live" />
            </div>
          ) : feature.spec ? (
            <div
              data-color-mode="light"
              className="rounded-md border border-zinc-200 p-4"
            >
              <MarkdownPreview source={feature.spec} style={{ background: "transparent" }} />
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-zinc-300 p-6 text-center">
              <p className="text-sm text-zinc-400">No specification yet.</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => setEditingSpec(true)}
              >
                Write spec
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
