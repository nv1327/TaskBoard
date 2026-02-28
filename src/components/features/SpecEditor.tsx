"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse rounded-md bg-zinc-100" />,
});

interface SpecEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function SpecEditor({ value, onChange }: SpecEditorProps) {
  const [preview, setPreview] = useState<"edit" | "live" | "preview">("live");

  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        preview={preview}
        height={400}
        toolbarBottom={false}
        extraCommands={[]}
      />
      <div className="mt-2 flex gap-2">
        {(["edit", "live", "preview"] as const).map((mode) => (
          <Button
            key={mode}
            type="button"
            variant={preview === mode ? "default" : "outline"}
            size="sm"
            onClick={() => setPreview(mode)}
            className="text-xs capitalize"
          >
            {mode}
          </Button>
        ))}
      </div>
    </div>
  );
}
