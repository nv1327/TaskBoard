"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import { Trash2, FileText, ExternalLink } from "lucide-react";
import type { Attachment } from "@prisma/client";

interface AttachmentGridProps {
  attachments: Attachment[];
  featureId: string;
  projectId: string;
}

export function AttachmentGrid({ attachments: initial, featureId, projectId }: AttachmentGridProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initial);

  async function deleteAttachment(id: string) {
    if (!confirm("Delete this attachment?")) return;
    await fetch(
      `/api/projects/${projectId}/features/${featureId}/attachments?id=${id}`,
      { method: "DELETE" }
    );
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  if (attachments.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {attachments.map((att) => {
        const isImage = att.mimeType.startsWith("image/");
        return (
          <div
            key={att.id}
            className="group relative overflow-hidden rounded-lg border border-zinc-200 bg-white"
          >
            {isImage ? (
              <img
                src={att.url}
                alt={att.originalName}
                className="h-32 w-full object-cover"
              />
            ) : (
              <div className="flex h-32 items-center justify-center bg-zinc-50">
                <FileText className="h-8 w-8 text-zinc-400" />
              </div>
            )}
            <div className="p-2">
              <p className="truncate text-xs font-medium text-zinc-700">{att.originalName}</p>
              <p className="text-[10px] text-zinc-400">{formatDate(att.createdAt)}</p>
            </div>
            <div className="absolute right-1 top-1 hidden gap-1 group-hover:flex">
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded bg-white/80 p-1 text-zinc-600 hover:bg-white hover:text-zinc-900 backdrop-blur-sm"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                className="rounded bg-white/80 p-1 text-zinc-600 hover:bg-white hover:text-red-600 backdrop-blur-sm"
                onClick={() => deleteAttachment(att.id)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
