import { ProjectForm } from "@/components/projects/ProjectForm";

export default function NewProjectPage() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-xl font-semibold text-zinc-900">Create project</h1>
        <ProjectForm />
      </div>
    </div>
  );
}
