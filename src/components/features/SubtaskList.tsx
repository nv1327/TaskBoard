"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2 } from "lucide-react";
import type { Subtask } from "@prisma/client";

interface SubtaskListProps {
  subtasks: Subtask[];
  featureId: string;
  projectId: string;
}

export function SubtaskList({ subtasks: initial, featureId, projectId }: SubtaskListProps) {
  const [subtasks, setSubtasks] = useState<Subtask[]>(initial);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function toggleSubtask(subtask: Subtask) {
    const newStatus = subtask.status === "DONE" ? "OPEN" : "DONE";
    const res = await fetch(
      `/api/projects/${projectId}/features/${featureId}/subtasks/${subtask.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );
    if (res.ok) {
      const updated = await res.json();
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? updated : s)));
    }
  }

  async function deleteSubtask(id: string) {
    await fetch(`/api/projects/${projectId}/features/${featureId}/subtasks/${id}`, {
      method: "DELETE",
    });
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  }

  async function addSubtask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    const res = await fetch(`/api/projects/${projectId}/features/${featureId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setSubtasks((prev) => [...prev, created]);
      setNewTitle("");
      setShowForm(false);
    }
    setAdding(false);
  }

  const done = subtasks.filter((s) => s.status === "DONE").length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-zinc-700">
          Subtasks
          {subtasks.length > 0 && (
            <span className="ml-2 text-xs font-normal text-zinc-400">
              {done}/{subtasks.length} done
            </span>
          )}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      <div className="space-y-1.5">
        {subtasks.map((subtask) => (
          <div
            key={subtask.id}
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50"
          >
            <Checkbox
              checked={subtask.status === "DONE"}
              onCheckedChange={() => toggleSubtask(subtask)}
              className="h-3.5 w-3.5"
            />
            <span
              className={`flex-1 text-sm ${subtask.status === "DONE" ? "text-zinc-400 line-through" : "text-zinc-700"}`}
            >
              {subtask.title}
            </span>
            <button
              className="hidden text-zinc-300 hover:text-red-500 group-hover:block"
              onClick={() => deleteSubtask(subtask.id)}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="flex gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Subtask title"
            className="h-8 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); addSubtask(); }
              if (e.key === "Escape") { setShowForm(false); setNewTitle(""); }
            }}
            autoFocus
          />
          <Button size="sm" className="h-8 text-xs" onClick={addSubtask} disabled={adding}>
            {adding ? "..." : "Add"}
          </Button>
        </div>
      )}
    </div>
  );
}
