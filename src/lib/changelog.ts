import { prisma } from "@/lib/prisma";

export type ChangeAction =
  | "PROJECT_CREATED"
  | "FEATURE_CREATED"
  | "FEATURE_UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "SPEC_UPDATED"
  | "SUBTASK_CREATED"
  | "SUBTASK_DONE"
  | "SUBTASK_REOPENED"
  | "ATTACHMENT_ADDED"
  | "FEATURE_DELETED";

interface LogParams {
  action: ChangeAction;
  summary: string;
  projectId: string;
  featureId?: string;
  featureTitle?: string;
  subtaskId?: string;
  subtaskTitle?: string;
  source?: "agent" | "ui";
  meta?: Record<string, string>;
}

export async function log(params: LogParams) {
  try {
    const meta = {
      ...(params.meta ?? {}),
      source: params.source ?? params.meta?.source ?? "ui",
    };

    await prisma.$transaction(async (tx) => {
      const lockKey = [
        params.projectId,
        params.action,
        params.featureId ?? "",
        params.subtaskId ?? "",
      ].join("|");

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

      const latest = await tx.changeLog.findFirst({
        where: {
          projectId: params.projectId,
          action: params.action,
          featureId: params.featureId ?? null,
          subtaskId: params.subtaskId ?? null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (latest) {
        const withinWindow = Date.now() - latest.createdAt.getTime() < 5000;
        const sameSummary = latest.summary === params.summary;
        const sameMeta = JSON.stringify(latest.meta ?? null) === JSON.stringify(meta ?? null);

        if (withinWindow && sameSummary && sameMeta) {
          return;
        }
      }

      await tx.changeLog.create({
        data: {
          action: params.action,
          summary: params.summary,
          projectId: params.projectId,
          featureId: params.featureId,
          featureTitle: params.featureTitle,
          subtaskId: params.subtaskId,
          subtaskTitle: params.subtaskTitle,
          meta,
        },
      });
    });
  } catch {
    // Non-fatal — never let changelog writes break the main operation
  }
}
