"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyKind = "id" | "context" | "linkfile" | "refresh";

export function ProjectAgentLinkCard({ projectId }: { projectId: string }) {
  const [copied, setCopied] = useState<CopyKind | null>(null);

  async function copy(text: string, kind: CopyKind) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(null), 1500);
  }

  const contextCmd = `curl -s http://localhost:3000/api/agent/projects/${projectId}/context`;
  const linkFileCmd = `cat > .pm-board.md <<'EOF'\n---\npm_board_project_id: ${projectId}\npm_board_url: http://localhost:3000\n---\nEOF`;
  const refreshCmd = `/path/to/pm-board/scripts/load-context.sh`;

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-zinc-900">Agent onboarding (copy/paste)</h3>
      <p className="mt-1 text-xs text-zinc-600">
        To link an external repo to this PM Board project, create a <code className="rounded bg-zinc-100 px-1 py-0.5">.pm-board.md</code>
        in that repo root, then fetch context from PM Board each session.
      </p>

      <div className="mt-3 space-y-2">
        <div className="rounded border border-zinc-200 bg-zinc-50 p-2">
          <p className="text-[10px] uppercase tracking-wide text-zinc-500">Project ID</p>
          <p className="font-mono text-xs text-zinc-800">{projectId}</p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy(projectId, "id")}>
            {copied === "id" ? "Copied ID" : "Copy project ID"}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy(contextCmd, "context")}>
            {copied === "context" ? "Copied command" : "Copy context command"}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy(linkFileCmd, "linkfile")}>
            {copied === "linkfile" ? "Copied command" : "Copy .pm-board.md command"}
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => copy(refreshCmd, "refresh")}>
            {copied === "refresh" ? "Copied command" : "Copy refresh script command"}
          </Button>
        </div>

        <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-zinc-600">
          <li>In your target repo root, run the copied <span className="font-medium">.pm-board.md command</span>.</li>
          <li>Fetch context using the copied context command (or the refresh script).</li>
          <li>Ask your agent to keep PM Board statuses/subtasks synced while coding.</li>
        </ol>
      </div>
    </div>
  );
}
