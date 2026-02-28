import { FeatureForm } from "@/components/features/FeatureForm";

export default async function NewFeaturePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">Create feature</h1>
        <FeatureForm projectId={projectId} />
      </div>
    </div>
  );
}
