import { Skeleton } from "@/components/ui/skeleton";

export default function CourseLoading() {
  return (
    <div>
      <Skeleton className="mb-6 h-4 w-24" />
      <div className="mb-9 flex items-center gap-3.5">
        <Skeleton className="size-2.5 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="mb-8 flex gap-4 border-b border-border pb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-20" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
