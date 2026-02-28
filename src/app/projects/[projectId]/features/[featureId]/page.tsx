import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FeatureDetail } from "@/components/features/FeatureDetail";
import { FeatureSidebar } from "@/components/features/FeatureSidebar";

export default async function FeaturePage({
  params,
}: {
  params: Promise<{ projectId: string; featureId: string }>;
}) {
  const { projectId, featureId } = await params;

  const feature = await prisma.feature.findFirst({
    where: { id: featureId, projectId },
    include: {
      subtasks: { orderBy: { position: "asc" } },
      attachments: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!feature) notFound();

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <FeatureDetail feature={feature} projectId={projectId} />
      </div>
      <FeatureSidebar
        subtasks={feature.subtasks}
        attachments={feature.attachments}
        featureId={featureId}
        projectId={projectId}
      />
    </div>
  );
}
