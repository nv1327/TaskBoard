"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type CopyKind = "id" | "context" | "linkfile" | "refresh" | "bootstrap";

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
  const bootstrapPrompt = `Before doing anything else:\n1) Load PM Board context: ${contextCmd}\n2) Never code on main. Create/use a feature branch unless I explicitly tell you otherwise.\n3) Implement only todo features (not backlog), unless I explicitly override.\n4) Keep PM Board synced: set in_progress + branchUrl, update subtasks, then in_review + prUrl.\n5) Stop at in_review and wait for human approval before merge.`;

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
          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs sm:col-span-2" onClick={() => copy(bootstrapPrompt, "bootstrap")}>
            {copied === "bootstrap" ? "Copied bootstrap prompt" : "Copy new-session/model-switch bootstrap prompt"}
          </Button>
        </div>

        <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-zinc-600">
          <li>In your target repo root, run the copied <span className="font-medium">.pm-board.md command</span>.</li>
          <li>At every new agent session or model switch, run the context command (or refresh script).</li>
          <li>Paste the <span className="font-medium">bootstrap prompt</span> so the agent re-locks to workflow rules.</li>
          <li>Core rule: feature work happens on feature branches — never on <code className="rounded bg-zinc-100 px-1 py-0.5">main</code> unless explicitly instructed.</li>
        </ol>
      </div>
    </div>
  );
}
