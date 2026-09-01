import { Skeleton, TableSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-36" />
          <Skeleton className="mt-2 h-4 w-28" />
        </div>
        <Skeleton className="h-11 w-32 rounded-[6px]" />
      </div>
      <Skeleton className="mt-6 h-11 w-full rounded-[6px]" />
      <div className="mt-3 flex gap-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="mt-4 overflow-hidden rounded-[10px] border border-line bg-surface">
        <TableSkeleton rows={6} />
      </div>
    </div>
  );
}
