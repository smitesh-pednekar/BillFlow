import { CardsSkeleton, Skeleton, TableSkeleton } from "@/components/states";

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      <div className="mt-6">
        <CardsSkeleton />
      </div>
      <div className="mt-6 rounded-[10px] border border-line bg-surface p-5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-[240px] w-full" />
      </div>
      <div className="mt-6 overflow-hidden rounded-[10px] border border-line bg-surface">
        <TableSkeleton rows={5} />
      </div>
    </div>
  );
}
