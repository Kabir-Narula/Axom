import Link from "next/link";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/** Deep-link into a course's Resources tab with a pre-filled query. */
export function ResearchLink({
  courseId,
  query,
  className,
  compact = false,
}: {
  courseId: string;
  query: string;
  className?: string;
  compact?: boolean;
}) {
  const href = `/courses/${courseId}?tab=resources&q=${encodeURIComponent(query)}`;

  if (compact) {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground",
          className
        )}
      >
        <Globe className="size-3" strokeWidth={1.75} />
        Research online
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-[#3f3f46] hover:text-foreground",
        className
      )}
    >
      <Globe className="size-3.5" strokeWidth={1.75} />
      Research online
    </Link>
  );
}
