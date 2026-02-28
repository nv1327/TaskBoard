"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  ExternalLink,
  GitBranch,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type SubtaskSummary = { id: string; status: string };

type Feature = {
  id: string;
  title: string;
  status: string;
  priority: string;
  branchUrl: string | null;
  prUrl: string | null;
  milestoneId: string | null;
  subtasks: SubtaskSummary[];
};

type Milestone = {
  id: string;
  name: string;
  description: string | null;
  targetDate: string | null;
  position: number;
  features: Feature[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "Backlog",
  TODO: "Todo",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-zinc-100 text-zinc-600",
  TODO: "bg-blue-50 text-blue-700",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  IN_REVIEW: "bg-violet-50 text-violet-700",
  DONE: "bg-green-50 text-green-700",
  CANCELLED: "bg-zinc-100 text-zinc-400 line-through",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "text-zinc-400",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-600",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Low",
  MEDIUM: "Med",
  HIGH: "High",
  URGENT: "Urgent",
};

// ── Feature row ───────────────────────────────────────────────────────────────

function FeatureRow({
  feature,
  projectId,
  milestones,
  onStatusChange,
  onMilestoneChange,
}: {
  feature: Feature;
  projectId: string;
  milestones: { id: string; name: string }[];
  onStatusChange: (featureId: string, status: string) => void;
  onMilestoneChange: (featureId: string, milestoneId: string | null) => void;
}) {
  const done = feature.subtasks.filter((s) => s.status === "DONE").length;
  const total = feature.subtasks.length;

  return (
    <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-0 hover:bg-zinc-50 transition-colors">
      {/* Title */}
      <Link
        href={`/projects/${projectId}/features/${feature.id}`}
        className="min-w-0 flex-1 truncate text-sm text-zinc-800 hover:text-zinc-900 hover:underline"
      >
        {feature.title}
      </Link>

      {/* Subtask progress */}
      {total > 0 && (
        <span className="shrink-0 text-xs text-zinc-400">
          {done}/{total}
        </span>
      )}

      {/* Priority */}
      <span className={cn("shrink-0 text-xs font-medium", PRIORITY_COLORS[feature.priority])}>
        {PRIORITY_LABELS[feature.priority]}
      </span>

      {/* Branch / PR links */}
      <div className="flex shrink-0 items-center gap-1">
        {feature.branchUrl && (
          <a href={feature.branchUrl} target="_blank" rel="noopener noreferrer" title="Branch">
            <GitBranch className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600" />
          </a>
        )}
        {feature.prUrl && (
          <a href={feature.prUrl} target="_blank" rel="noopener noreferrer" title="Pull Request">
            <ExternalLink className="h-3.5 w-3.5 text-violet-400 hover:text-violet-600" />
          </a>
        )}
      </div>

      {/* Inline milestone select */}
      <select
        value={feature.milestoneId ?? "__none__"}
        onChange={(e) => onMilestoneChange(feature.id, e.target.value === "__none__" ? null : e.target.value)}
        className="shrink-0 cursor-pointer rounded border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-500 focus:ring-1 focus:ring-zinc-300"
      >
        <option value="__none__">Unscheduled</option>
        {milestones.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Inline status select */}
      <select
        value={feature.status}
        onChange={(e) => onStatusChange(feature.id, e.target.value)}
        className={cn(
          "shrink-0 cursor-pointer rounded border-0 px-2 py-0.5 text-xs font-medium ring-0 focus:ring-1 focus:ring-zinc-300",
          STATUS_COLORS[feature.status]
        )}
      >
        {Object.entries(STATUS_LABELS).map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Milestone card (sortable) ─────────────────────────────────────────────────

function MilestoneCard({
  milestone,
  projectId,
  milestones,
  onUpdate,
  onDelete,
  onStatusChange,
  onMilestoneChange,
}: {
  milestone: Milestone;
  projectId: string;
  milestones: { id: string; name: string }[];
  onUpdate: (id: string, name: string, description: string, targetDate: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onStatusChange: (featureId: string, status: string) => void;
  onMilestoneChange: (featureId: string, milestoneId: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(milestone.name);
  const [editDesc, setEditDesc] = useState(milestone.description ?? "");
  const [editDate, setEditDate] = useState(
    milestone.targetDate ? milestone.targetDate.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: milestone.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function saveEdit() {
    setSaving(true);
    await onUpdate(milestone.id, editName, editDesc, editDate);
    setSaving(false);
    setEditing(false);
  }

  const featureCount = milestone.features.length;
  const doneCount = milestone.features.filter((f) => f.status === "DONE").length;

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="shrink-0 cursor-grab touch-none text-zinc-300 hover:text-zinc-500 active:cursor-grabbing"
          aria-label="Drag to reorder milestone"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 text-zinc-400 hover:text-zinc-600"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {editing ? (
          <div className="flex flex-1 items-center gap-2">
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="h-7 flex-1 text-sm font-semibold"
              placeholder="Milestone name"
              autoFocus
            />
            <Input
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="h-7 flex-1 text-xs text-zinc-500"
              placeholder="Description (optional)"
            />
            <Input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="h-7 w-36 text-xs"
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={saveEdit} disabled={saving || !editName.trim()}>
              <Check className="h-3.5 w-3.5 text-green-600" />
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(false)}>
              <X className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <span className="font-semibold text-zinc-900 text-sm">{milestone.name}</span>
              {milestone.description && (
                <span className="truncate text-xs text-zinc-400">{milestone.description}</span>
              )}
              {milestone.targetDate && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-zinc-400">
                  <CalendarDays className="h-3 w-3" />
                  {milestone.targetDate.slice(0, 10)}
                </span>
              )}
            </div>
            <span className="shrink-0 text-xs text-zinc-400">
              {doneCount}/{featureCount} done
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5"
              onClick={() => setEditing(true)}
              aria-label="Edit milestone"
            >
              <Pencil className="h-3 w-3 text-zinc-400" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-1.5"
              onClick={() => {
                if (confirm(`Delete milestone "${milestone.name}"? Features will become unscheduled.`))
                  onDelete(milestone.id);
              }}
              aria-label="Delete milestone"
            >
              <Trash2 className="h-3 w-3 text-zinc-400 hover:text-red-500" />
            </Button>
          </>
        )}
      </div>

      {/* Feature rows */}
      {!collapsed && (
        <div className="border-t border-zinc-100">
          {featureCount === 0 ? (
            <p className="px-4 py-3 text-xs text-zinc-400 italic">No features assigned to this milestone.</p>
          ) : (
            milestone.features.map((f) => (
              <FeatureRow
                key={f.id}
                feature={f}
                projectId={projectId}
                milestones={milestones}
                onStatusChange={onStatusChange}
                onMilestoneChange={onMilestoneChange}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Unscheduled section ───────────────────────────────────────────────────────

function UnscheduledSection({
  features,
  projectId,
  milestones,
  onStatusChange,
  onMilestoneChange,
}: {
  features: Feature[];
  projectId: string;
  milestones: { id: string; name: string }[];
  onStatusChange: (featureId: string, status: string) => void;
  onMilestoneChange: (featureId: string, milestoneId: string | null) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="shrink-0 text-zinc-400 hover:text-zinc-600"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <span className="flex-1 text-sm font-medium text-zinc-500">Unscheduled</span>
        <span className="text-xs text-zinc-400">{features.length} feature{features.length !== 1 ? "s" : ""}</span>
      </div>
      {!collapsed && features.length > 0 && (
        <div className="border-t border-zinc-200">
          {features.map((f) => (
            <FeatureRow
              key={f.id}
              feature={f}
              projectId={projectId}
              milestones={milestones}
              onStatusChange={onStatusChange}
              onMilestoneChange={onMilestoneChange}
            />
          ))}
        </div>
      )}
      {!collapsed && features.length === 0 && (
        <p className="border-t border-zinc-200 px-4 py-3 text-xs italic text-zinc-400">
          All features are assigned to a milestone.
        </p>
      )}
    </div>
  );
}

// ── Add milestone form ────────────────────────────────────────────────────────

function AddMilestoneForm({
  onAdd,
  onCancel,
}: {
  onAdd: (name: string, description: string, targetDate: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    await onAdd(name.trim(), description.trim(), targetDate);
    setSaving(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2.5 shadow-sm"
    >
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Milestone name (e.g. v1.0, MVP)"
        className="h-7 flex-1 text-sm"
        autoFocus
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (optional)"
        className="h-7 flex-1 text-xs"
      />
      <Input
        type="date"
        value={targetDate}
        onChange={(e) => setTargetDate(e.target.value)}
        className="h-7 w-36 text-xs"
      />
      <Button type="submit" size="sm" className="h-7 px-3 text-xs" disabled={saving || !name.trim()}>
        Add
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2" onClick={onCancel}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </form>
  );
}

// ── Main RoadmapView ──────────────────────────────────────────────────────────

export function RoadmapView({
  projectId,
  initialMilestones,
  initialFeatures,
}: {
  projectId: string;
  initialMilestones: Milestone[];
  initialFeatures: Feature[];
}) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const [showAddForm, setShowAddForm] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Features not assigned to any milestone
  const milestoneIds = new Set(milestones.map((m) => m.id));
  const unscheduled = features.filter((f) => !f.milestoneId || !milestoneIds.has(f.milestoneId));

  // ── Milestone drag-to-reorder ──

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = milestones.findIndex((m) => m.id === active.id);
    const newIndex = milestones.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(milestones, oldIndex, newIndex);

    setMilestones(reordered);

    // Persist positions
    await Promise.all(
      reordered.map((m, i) =>
        fetch(`/api/projects/${projectId}/milestones/${m.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        })
      )
    );
  }

  // ── Milestone CRUD ──

  const handleAddMilestone = useCallback(
    async (name: string, description: string, targetDate: string) => {
      const res = await fetch(`/api/projects/${projectId}/milestones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, targetDate: targetDate || undefined }),
      });
      const { data } = await res.json();
      setMilestones((prev) => [...prev, { ...data, features: [] }]);
      setShowAddForm(false);
    },
    [projectId]
  );

  const handleUpdateMilestone = useCallback(
    async (id: string, name: string, description: string, targetDate: string) => {
      const res = await fetch(`/api/projects/${projectId}/milestones/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || null,
          targetDate: targetDate || null,
        }),
      });
      const { data } = await res.json();
      setMilestones((prev) => prev.map((m) => (m.id === id ? { ...data, features: m.features } : m)));
    },
    [projectId]
  );

  const handleDeleteMilestone = useCallback(
    async (id: string) => {
      await fetch(`/api/projects/${projectId}/milestones/${id}`, { method: "DELETE" });
      // Move features from deleted milestone to unscheduled
      setFeatures((prev) =>
        prev.map((f) => (f.milestoneId === id ? { ...f, milestoneId: null } : f))
      );
      setMilestones((prev) => prev.filter((m) => m.id !== id));
    },
    [projectId]
  );

  // ── Inline feature status change ──

  const handleStatusChange = useCallback(
    async (featureId: string, status: string) => {
      setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, status } : f)));
      setMilestones((prev) =>
        prev.map((m) => ({
          ...m,
          features: m.features.map((f) => (f.id === featureId ? { ...f, status } : f)),
        }))
      );
      await fetch(`/api/projects/${projectId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    },
    [projectId]
  );

  // ── Inline feature milestone change ──

  const handleMilestoneChange = useCallback(
    async (featureId: string, milestoneId: string | null) => {
      // Update flat features list
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, milestoneId } : f))
      );
      // Move the feature between milestone.features arrays
      setMilestones((prev) => {
        const feature = prev.flatMap((m) => m.features).find((f) => f.id === featureId)
          ?? features.find((f) => f.id === featureId);
        if (!feature) return prev;
        const updatedFeature = { ...feature, milestoneId };
        return prev.map((m) => {
          const withoutFeature = m.features.filter((f) => f.id !== featureId);
          if (m.id === milestoneId) {
            return { ...m, features: [...withoutFeature, updatedFeature] };
          }
          return { ...m, features: withoutFeature };
        });
      });
      await fetch(`/api/projects/${projectId}/features/${featureId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ milestoneId }),
      });
    },
    [projectId, features]
  );

  return (
    <div className="space-y-4 p-6">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-500">
          {milestones.length} milestone{milestones.length !== 1 ? "s" : ""} · drag to reorder
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-xs"
          onClick={() => setShowAddForm(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Add milestone
        </Button>
      </div>

      {showAddForm && (
        <AddMilestoneForm
          onAdd={handleAddMilestone}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Sortable milestones */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={milestones.map((m) => m.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {milestones.length === 0 && !showAddForm && (
              <div className="rounded-lg border border-dashed border-zinc-200 py-12 text-center">
                <p className="text-sm text-zinc-400">No milestones yet.</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Add a milestone to start organising your roadmap.
                </p>
              </div>
            )}
            {milestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                projectId={projectId}
                milestones={milestones}
                onUpdate={handleUpdateMilestone}
                onDelete={handleDeleteMilestone}
                onStatusChange={handleStatusChange}
                onMilestoneChange={handleMilestoneChange}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Unscheduled */}
      <UnscheduledSection
        features={unscheduled}
        projectId={projectId}
        milestones={milestones}
        onStatusChange={handleStatusChange}
        onMilestoneChange={handleMilestoneChange}
      />
    </div>
  );
}
