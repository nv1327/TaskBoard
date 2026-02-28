import { Priority } from "@prisma/client";
import { cn } from "@/lib/utils";

const CONFIG: Record<Priority, { label: string; className: string }> = {
  URGENT: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-200" },
  HIGH: { label: "High", className: "bg-orange-100 text-orange-700 border-orange-200" },
  MEDIUM: { label: "Medium", className: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  LOW: { label: "Low", className: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  const { label, className: colorClass } = CONFIG[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
