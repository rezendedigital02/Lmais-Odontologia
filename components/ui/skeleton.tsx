export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="bg-card rounded-lg border border-border p-5 space-y-3">
      <Skeleton className="h-4 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
