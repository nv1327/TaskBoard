"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SnippetProps {
  snippetKey: string;
  code: string;
  wrap?: boolean;
  copied: string | null;
  onCopy: (key: string, text: string) => void;
}

function Snippet({ snippetKey, code, wrap = false, copied, onCopy }: SnippetProps) {
  return (
    <div className="mt-1">
      <div className="mb-1 flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-6 px-2 text-[10px]"
          onClick={() => onCopy(snippetKey, code)}
        >
          {copied === snippetKey ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre
        className={`overflow-x-auto rounded bg-zinc-900 p-2 text-[11px] text-zinc-100 ${
          wrap ? "whitespace-pre-wrap" : ""
        }`}
      >
        {code}
      </pre>
    </div>
  );
}

interface ProjectWorkflowHelpProps {
  projectId?: string;
}

export function ProjectWorkflowHelp({ projectId }: ProjectWorkflowHelpProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const resolvedProjectId = projectId ?? "<PROJECT_ID_AFTER_CREATE>";

  const linkSnippet = `cat > .pm-board.md <<'EOF'\n---\npm_board_project_id: ${resolvedProjectId}\npm_board_url: http://localhost:3000\n---\nEOF`;

  const contextSnippet = `curl -s http://localhost:3000/api/agent/projects/${resolvedProjectId}/context -o .pm-board-context.md`;

  const agentPromptSnippet = `You are working on this repository with PM Board tracking enabled.\n\n1) Read PM Board docs in the pm-board repository to understand workflow and API usage.\n2) Fetch live project context now:\n   curl -s http://localhost:3000/api/agent/projects/${resolvedProjectId}/context\n3) Propose a work plan as features + subtasks.\n4) While implementing, keep PM Board status/subtask updates in sync via /api/agent/features.`;

  const initProjectSnippet = `/path/to/pm-board/scripts/init-project.sh \\
  --name "<Project Name>" \\
  --description "<Short one-line summary>" \\
  --repo "<https://github.com/org/repo>" \\
  --context-file "</absolute/path/to/spec.md>" \\
  --dir "</absolute/path/to/new-project-root>"`;

  const refreshSnippet = `/path/to/pm-board/scripts/load-context.sh`;

  async function copySnippet(key: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied((curr) => (curr === key ? null : curr)), 1500);
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">Getting started (step-by-step, non-technical)</h3>
          <p className="mt-1 text-xs text-zinc-600">Choose one path below. Every step is copy/paste friendly.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide guide" : "Show guide"}
        </Button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 text-xs text-zinc-700">
          <div className="rounded border border-zinc-200 bg-white p-3">
            <p className="font-medium text-zinc-900">Path A — You already created the project in the UI</p>
            <ol className="mt-2 list-decimal space-y-2 pl-4">
              <li>Open the root folder of your code project in Terminal.</li>
              <li>
                To create a link file so the repo on your filesystem points to this PM Board project, paste and run:
                <Snippet snippetKey="link" code={linkSnippet} copied={copied} onCopy={copySnippet} />
              </li>
              <li>
                Save the latest PM Board context to a local file in that same repo:
                <Snippet snippetKey="context" code={contextSnippet} copied={copied} onCopy={copySnippet} />
              </li>
              <li>
                Paste this exact instruction to your coding agent:
                <Snippet snippetKey="agent-prompt" code={agentPromptSnippet} wrap copied={copied} onCopy={copySnippet} />
              </li>
              <li>
                As work progresses, the agent should follow this loop for each feature:
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-500">
                  <li>
                    Create a branch{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5">feat/&lt;slug&gt;</code>, move feature to{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5">in_progress</code>, record branch URL.
                  </li>
                  <li>Implement. Mark subtasks done as each is completed.</li>
                  <li>
                    Run all tests. Then E2E smoke-test the happy path. Then do a{" "}
                    <strong>self-learning check</strong>: did anything surprise you? Should any workflow docs be
                    updated? Propose changes — don&apos;t edit docs unilaterally.
                  </li>
                  <li>
                    Open a PR against <code className="rounded bg-zinc-100 px-1 py-0.5">main</code>, move feature to{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5">in_review</code>, record PR URL.
                  </li>
                  <li>
                    <strong>Stop and wait for your review.</strong> Agent should not merge or continue until you approve.
                  </li>
                  <li>
                    After you merge, agent marks feature{" "}
                    <code className="rounded bg-zinc-100 px-1 py-0.5">done</code>.
                  </li>
                  <li>
                    Agent appends a <code className="rounded bg-zinc-100 px-1 py-0.5">## Review findings</code> section
                    to the feature spec — recording what you changed and why. Institutional memory for future sessions.
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          <div className="rounded border border-zinc-200 bg-white p-3">
            <p className="font-medium text-zinc-900">
              Path B — You want the agent to create a new project from a spec markdown file
            </p>
            <ol className="mt-2 list-decimal space-y-2 pl-4">
              <li>
                Write your project spec as a markdown file (for example:
                <code className="rounded bg-zinc-100 px-1 py-0.5"> spec.md </code>).
              </li>
              <li>
                From the PM Board repo, run:
                <Snippet snippetKey="init" code={initProjectSnippet} copied={copied} onCopy={copySnippet} />
              </li>
              <li>
                This creates the PM Board project and writes a
                <code className="rounded bg-zinc-100 px-1 py-0.5"> .pm-board.md </code>
                link file in your new project folder.
              </li>
              <li>
                In that new project folder, refresh context at the start of each session:
                <Snippet snippetKey="refresh" code={refreshSnippet} copied={copied} onCopy={copySnippet} />
              </li>
            </ol>
          </div>

          <div className="rounded border border-zinc-200 bg-white p-3">
            <p className="font-medium text-zinc-900">Plain-language file guide</p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-zinc-600">
              <li>
                <code className="rounded bg-zinc-100 px-1 py-0.5">.pm-board.md</code> = link file (which PM Board
                project this repo belongs to).
              </li>
              <li>
                <code className="rounded bg-zinc-100 px-1 py-0.5">.pm-board-context.md</code> = latest downloaded
                context snapshot for your agent.
              </li>
              <li>
                <code className="rounded bg-zinc-100 px-1 py-0.5">contextMd</code> = the long mission/spec markdown
                stored centrally in PM Board.
              </li>
            </ul>
          </div>

          <p className="text-[11px] text-zinc-500">
            Recommended layout: keep PM Board in the same parent folder as your projects (example:
            <code className="rounded bg-zinc-100 px-1 py-0.5"> ~/Desktop/Projects/pm-board </code>) so script paths
            are easy.
          </p>
        </div>
      )}
    </div>
  );
}
