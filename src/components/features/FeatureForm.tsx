"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SpecEditor } from "./SpecEditor";
import type { Feature, Priority, FeatureStatus } from "@prisma/client";

interface FeatureFormProps {
  projectId: string;
  feature?: Feature;
  onSuccess?: () => void;
}

const PRIORITIES: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const STATUSES: FeatureStatus[] = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELLED"];

const STATUS_LABELS: Record<FeatureStatus, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export function FeatureForm({ projectId, feature, onSuccess }: FeatureFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: feature?.title ?? "",
    description: feature?.description ?? "",
    spec: feature?.spec ?? "",
    priority: feature?.priority ?? "MEDIUM" as Priority,
    status: feature?.status ?? "BACKLOG" as FeatureStatus,
    branchUrl: feature?.branchUrl ?? "",
    prUrl: feature?.prUrl ?? "",
  });

  const isEdit = !!feature;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = isEdit
        ? `/api/projects/${projectId}/features/${feature.id}`
        : `/api/projects/${projectId}/features`;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, projectId }),
      });
      if (!res.ok) throw new Error("Failed to save feature");
      const data = await res.json();
      if (onSuccess) {
        onSuccess();
      } else {
        router.push(`/projects/${projectId}/features/${data.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Feature title"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Short description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Brief summary shown on the Kanban card"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={(v) => setForm((f) => ({ ...f, priority: v as Priority }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.charAt(0) + p.slice(1).toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((f) => ({ ...f, status: v as FeatureStatus }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="branchUrl">Branch URL</Label>
        <Input
          id="branchUrl"
          type="url"
          value={form.branchUrl}
          onChange={(e) => setForm((f) => ({ ...f, branchUrl: e.target.value }))}
          placeholder="https://github.com/org/repo/tree/feat/my-feature"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="prUrl">Pull Request URL</Label>
        <Input
          id="prUrl"
          type="url"
          value={form.prUrl}
          onChange={(e) => setForm((f) => ({ ...f, prUrl: e.target.value }))}
          placeholder="https://github.com/org/repo/pull/123"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Full specification (Markdown)</Label>
        <SpecEditor
          value={form.spec}
          onChange={(v) => setForm((f) => ({ ...f, spec: v }))}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Create feature"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
