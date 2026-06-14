import { Skeleton } from "@/components/ui/skeleton";

export default function ReviewLoading() {
  return (
    <div>
      <div className="mb-10 space-y-2">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="mx-auto max-w-2xl">
        <Skeleton className="mb-8 h-1.5 w-full rounded-full" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
