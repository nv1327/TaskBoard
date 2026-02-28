import { z } from "zod";
import { Priority, FeatureStatus, SubtaskStatus } from "@prisma/client";

// ── Project ──────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  description: z.string().optional(),
  repoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export const updateProjectSchema = createProjectSchema.partial();

// ── Feature ───────────────────────────────────────────────────────────────────

export const createFeatureSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional(),
  spec: z.string().optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(FeatureStatus).optional(),
  position: z.number().int().optional(),
  branchUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  projectId: z.string().cuid(),
});

export const updateFeatureSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  spec: z.string().optional().nullable(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(FeatureStatus).optional(),
  position: z.number().int().optional(),
  branchUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// ── Subtask ───────────────────────────────────────────────────────────────────

export const createSubtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  position: z.number().int().optional(),
});

export const updateSubtaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  status: z.nativeEnum(SubtaskStatus).optional(),
  position: z.number().int().optional(),
});

// ── Agent API ─────────────────────────────────────────────────────────────────

// Agent enum coercion (accepts lowercase strings)
const agentPriority = z
  .string()
  .transform((v) => v.toUpperCase())
  .pipe(z.nativeEnum(Priority));

const agentFeatureStatus = z
  .string()
  .transform((v) => v.toUpperCase().replace(/ /g, "_").replace(/-/g, "_"))
  .pipe(z.nativeEnum(FeatureStatus));

const agentSubtaskStatus = z
  .string()
  .transform((v) => v.toUpperCase())
  .pipe(z.nativeEnum(SubtaskStatus));

export const agentCreateFeatureSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  spec: z.string().optional(),
  priority: agentPriority.optional(),
  status: agentFeatureStatus.optional(),
  branchUrl: z.string().url().optional().or(z.literal("")),
  subtasks: z.array(z.string().min(1)).optional(),
});

export const agentUpdateFeatureSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  spec: z.string().optional().nullable(),
  priority: agentPriority.optional(),
  status: agentFeatureStatus.optional(),
  branchUrl: z.string().url().optional().nullable().or(z.literal("")),
  subtasks: z
    .array(
      z.object({
        id: z.string(),
        status: agentSubtaskStatus,
      })
    )
    .optional(),
});

export const agentFeaturesQuerySchema = z.object({
  projectId: z.string().optional(),
  status: agentFeatureStatus.optional(),
  priority: agentPriority.optional(),
  q: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});
