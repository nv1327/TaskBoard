"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MarkdownPreview = dynamic(() => import("@uiw/react-md-editor").then((m) => m.default.Markdown), {
  ssr: false,
});

interface ProjectFormProps {
  project?: {
    id: string;
    name: string;
    description: string | null;
    contextMd: string | null;
    repoUrl: string | null;
  };
  onSuccess?: (project: { id: string }) => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const contextFileRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    contextMd: project?.contextMd ?? "",
    repoUrl: project?.repoUrl ?? "",
  });

  const isEdit = !!project;

  async function handleContextFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setForm((f) => ({ ...f, contextMd: text }));
    } catch {
      setError("Failed to read markdown file");
    } finally {
      e.target.value = "";
    }
  }

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
        <Label htmlFor="description">Short description</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="One-line summary for cards/lists"
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="contextMd">Project mission / context (Markdown)</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? "Hide preview" : "Show preview"}
            </Button>
            <>
              <input
                ref={contextFileRef}
                type="file"
                accept=".md,text/markdown,text/plain"
                className="hidden"
                onChange={handleContextFileChange}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => contextFileRef.current?.click()}
              >
                Upload .md
              </Button>
            </>
          </div>
        </div>

        <div className={showPreview ? "grid gap-3 lg:grid-cols-2" : ""}>
          <Textarea
            id="contextMd"
            value={form.contextMd}
            onChange={(e) => setForm((f) => ({ ...f, contextMd: e.target.value }))}
            placeholder="# Mission\n\nPaste detailed project context here..."
            rows={14}
            className="font-mono text-xs"
          />

          {showPreview && (
            <div data-color-mode="light" className="rounded-md border border-zinc-200 p-3">
              {form.contextMd.trim() ? (
                <MarkdownPreview source={form.contextMd} style={{ background: "transparent" }} />
              ) : (
                <p className="text-xs text-zinc-400">Markdown preview will appear here.</p>
              )}
            </div>
          )}
        </div>
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
