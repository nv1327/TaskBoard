import { ProjectForm } from "@/components/projects/ProjectForm";
import { ProjectWorkflowHelp } from "@/components/projects/ProjectWorkflowHelp";

export default function NewProjectPage() {
  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-zinc-900">Create project</h1>
        <ProjectWorkflowHelp />
        <ProjectForm />
      </div>
    </div>
  );
}
