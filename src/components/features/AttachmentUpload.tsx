"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attachment } from "@prisma/client";

interface AttachmentUploadProps {
  featureId: string;
  projectId: string;
  onUploaded: (attachment: Attachment) => void;
}

export function AttachmentUpload({ featureId, projectId, onUploaded }: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function uploadFile(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `/api/projects/${projectId}/features/${featureId}/attachments`,
      { method: "POST", body: formData }
    );
    if (res.ok) {
      const attachment = await res.json();
      onUploaded(attachment);
    }
    setUploading(false);
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  return (
    <div
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 p-6 text-center transition-colors",
        dragging && "border-zinc-500 bg-zinc-50",
        uploading && "opacity-60 cursor-wait"
      )}
      onClick={() => inputRef.current?.click()}
      onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <Upload className="mb-2 h-6 w-6 text-zinc-400" />
      <p className="text-sm text-zinc-500">
        {uploading ? "Uploading..." : "Drop files here or click to upload"}
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept="image/*,.pdf,.doc,.docx,.txt,.md"
      />
    </div>
  );
}
