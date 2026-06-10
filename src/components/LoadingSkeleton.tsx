import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SensorCardSkeleton() {
  return (
    <Card className="p-6 space-y-4 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-muted" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
        <div className="h-4 w-4 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-4 w-20 bg-muted rounded" />
      </div>
      <div className="h-20 w-full bg-muted rounded" />
    </Card>
  );
}

export function StatusCardSkeleton() {
  return (
    <Card className="p-6 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted" />
            <div className="h-4 w-24 bg-muted rounded" />
          </div>
          <div className="h-8 w-20 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
        <div className="h-14 w-14 rounded-lg bg-muted" />
      </div>
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatusCardSkeleton key={i} />
        ))}
      </div>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <SensorCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-6 space-y-4 animate-pulse", className)}>
      <div className="h-6 w-32 bg-muted rounded" />
      <div className="h-64 w-full bg-muted rounded" />
    </Card>
  );
}
