"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  closestCenter,
  getFirstCollision,
} from "@dnd-kit/core";
import type { CollisionDetection } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./BoardColumn";
import { FeatureCard } from "./FeatureCard";
import type { Feature, FeatureStatus } from "@prisma/client";

type FullFeature = Feature & {
  _count: { subtasks: number };
  subtasks: { id: string }[];
};

const COLUMNS: { status: FeatureStatus; label: string; color: string }[] = [
  { status: "BACKLOG", label: "Backlog", color: "bg-zinc-400" },
  { status: "TODO", label: "Todo", color: "bg-blue-400" },
  { status: "IN_PROGRESS", label: "In Progress", color: "bg-yellow-400" },
  { status: "IN_REVIEW", label: "In Review", color: "bg-purple-400" },
  { status: "DONE", label: "Done", color: "bg-green-400" },
  { status: "CANCELLED", label: "Cancelled", color: "bg-red-300" },
];

const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

interface BoardViewProps {
  initialFeatures: FullFeature[];
  projectId: string;
}

export function BoardView({ initialFeatures, projectId }: BoardViewProps) {
  const [features, setFeatures] = useState<FullFeature[]>(initialFeatures);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const featuresByStatus = useCallback(
    (status: FeatureStatus) =>
      features
        .filter((f) => f.status === status)
        .sort(
          (a, b) =>
            (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99) ||
            a.position - b.position
        ),
    [features]
  );

  // Custom collision detection: pointer-within wins (works for empty columns),
  // fall back to closest-center for when dragging over cards.
  const collisionDetection: CollisionDetection = useCallback(
    (args) => getFirstCollision([pointerWithin(args), closestCenter(args)]),
    []
  );

  const activeFeature = features.find((f) => f.id === activeId);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeFeatureId = active.id as string;
    const overId = over.id as string;

    const activeFeature = features.find((f) => f.id === activeFeatureId);
    if (!activeFeature) return;

    // Check if dropping over a column (status string)
    const overStatus = COLUMNS.find((c) => c.status === overId)?.status;
    if (overStatus && activeFeature.status !== overStatus) {
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === activeFeatureId ? { ...f, status: overStatus } : f
        )
      );
    }

    // Check if dropping over another card
    const overFeature = features.find((f) => f.id === overId);
    if (overFeature && activeFeature.status !== overFeature.status) {
      setFeatures((prev) =>
        prev.map((f) =>
          f.id === activeFeatureId ? { ...f, status: overFeature.status } : f
        )
      );
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeFeatureId = active.id as string;
    const overId = over.id as string;

    const activeFeature = features.find((f) => f.id === activeFeatureId);
    if (!activeFeature) return;

    const overFeature = features.find((f) => f.id === overId);
    const overColumn = COLUMNS.find((c) => c.status === overId);

    const targetStatus = overFeature?.status ?? overColumn?.status ?? activeFeature.status;

    // Build ordered list for the target column
    const columnFeatures = features
      .filter((f) => f.status === targetStatus)
      .sort((a, b) => a.position - b.position);

    const oldIndex = columnFeatures.findIndex((f) => f.id === activeFeatureId);
    const newIndex = overFeature
      ? columnFeatures.findIndex((f) => f.id === overId)
      : columnFeatures.length - 1;

    let reordered: FullFeature[];
    if (oldIndex !== -1) {
      reordered = arrayMove(columnFeatures, oldIndex, newIndex);
    } else {
      // Moving from another column — insert at target position
      const withoutActive = columnFeatures.filter((f) => f.id !== activeFeatureId);
      const insertAt = overFeature ? columnFeatures.findIndex((f) => f.id === overId) : withoutActive.length;
      reordered = [
        ...withoutActive.slice(0, insertAt),
        { ...activeFeature, status: targetStatus },
        ...withoutActive.slice(insertAt),
      ];
    }

    const updatedPositions = reordered.map((f, i) => ({ ...f, position: i }));
    const targetFeature = updatedPositions.find((f) => f.id === activeFeatureId);
    if (!targetFeature) return;

    setFeatures((prev) =>
      prev.map((f) => {
        const updated = updatedPositions.find((u) => u.id === f.id);
        return updated ?? f;
      })
    );

    // Persist to API
    await fetch(`/api/projects/${projectId}/features/${activeFeatureId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: targetStatus, position: targetFeature.position }),
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-6">
        {COLUMNS.map((col) => (
          <BoardColumn
            key={col.status}
            status={col.status}
            label={col.label}
            color={col.color}
            features={featuresByStatus(col.status)}
            projectId={projectId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeFeature && (
          <FeatureCard
            feature={activeFeature}
            projectId={projectId}
            overlay
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
