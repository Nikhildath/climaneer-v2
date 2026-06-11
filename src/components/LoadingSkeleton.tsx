import { cn } from "@/lib/utils";

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-lg", className)} />;
}

export function SensorCardSkeleton() {
  return (
    <div className="panel rounded-lg px-4 py-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Shimmer className="h-7 w-7 rounded-lg" />
        <Shimmer className="h-3 w-20" />
      </div>
      <Shimmer className="h-7 w-24" />
      <Shimmer className="h-16 w-full" />
    </div>
  );
}

export function StatusCardSkeleton() {
  return (
    <div className="panel rounded-lg px-4 py-3.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Shimmer className="h-1.5 w-1.5 rounded-full" />
        <Shimmer className="h-3 w-16" />
      </div>
      <Shimmer className="h-6 w-20" />
      <Shimmer className="h-3 w-28" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-4 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <StatusCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => <SensorCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("panel rounded-lg p-5 space-y-4", className)}>
      <Shimmer className="h-5 w-28" />
      <Shimmer className="h-60 w-full" />
    </div>
  );
}
