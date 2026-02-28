"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    description: string | null;
    repoUrl: string | null;
  };
  onSuccess?: (project: { id: string }) => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    repoUrl: project?.repoUrl ?? "",
  });

  const isEdit = !!project;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const url = isEdit ? `/api/projects/${project.id}` : "/api/projects";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save project");
      const data = await res.json();
      if (onSuccess) {
        onSuccess(data);
      } else {
        router.push(`/projects/${data.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Project name *</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="My awesome project"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="What are you building?"
          rows={3}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="repoUrl">GitHub repo URL</Label>
        <Input
          id="repoUrl"
          type="url"
          value={form.repoUrl}
          onChange={(e) => setForm((f) => ({ ...f, repoUrl: e.target.value }))}
          placeholder="https://github.com/org/repo"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : isEdit ? "Save changes" : "Create project"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
