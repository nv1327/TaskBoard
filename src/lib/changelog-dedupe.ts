import type { ChangeLog } from "@prisma/client";

const DEDUPE_WINDOW_MS = 5000;

function metaString(meta: unknown): string {
  return JSON.stringify(meta ?? null);
}

function entryKey(entry: ChangeLog): string {
  return [
    entry.projectId,
    entry.action,
    entry.featureId ?? "",
    entry.subtaskId ?? "",
    entry.summary,
    metaString(entry.meta),
  ].join("|");
}

export function dedupeChangeLogs(entries: ChangeLog[]): ChangeLog[] {
  const newestTimestampByKey = new Map<string, number>();
  const deduped: ChangeLog[] = [];

  for (const entry of entries) {
    const key = entryKey(entry);
    const ts = entry.createdAt.getTime();
    const newest = newestTimestampByKey.get(key);

    if (newest !== undefined && newest - ts < DEDUPE_WINDOW_MS) {
      continue;
    }

    newestTimestampByKey.set(key, ts);
    deduped.push(entry);
  }

  return deduped;
}
