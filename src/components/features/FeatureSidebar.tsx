"use client";

import { useState } from "react";
import { SubtaskList } from "./SubtaskList";
import { AttachmentUpload } from "./AttachmentUpload";
import { AttachmentGrid } from "./AttachmentGrid";
import type { Subtask, Attachment } from "@prisma/client";

interface FeatureSidebarProps {
  subtasks: Subtask[];
  attachments: Attachment[];
  featureId: string;
  projectId: string;
}

export function FeatureSidebar({ subtasks, attachments: initial, featureId, projectId }: FeatureSidebarProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initial);

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-5 space-y-8">
      <SubtaskList subtasks={subtasks} featureId={featureId} projectId={projectId} />

      <div>
        <h3 className="mb-3 text-sm font-medium text-zinc-700">Attachments</h3>
        <AttachmentGrid attachments={attachments} featureId={featureId} projectId={projectId} />
        <div className="mt-3">
          <AttachmentUpload
            featureId={featureId}
            projectId={projectId}
            onUploaded={(att) => setAttachments((prev) => [...prev, att])}
          />
        </div>
      </div>
    </div>
  );
}
