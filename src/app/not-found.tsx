import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Leaf } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md mx-auto border border-border/50 shadow-soft rounded-xl">
        <CardContent className="pt-8 pb-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-violet-500/10 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Page Not Found</h1>
          <p className="text-sm text-muted-foreground mb-6">
            The page you&apos;re looking for doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-violet-600 text-white text-sm font-medium hover:from-emerald-500 hover:to-violet-500 transition-all shadow-lg shadow-emerald-500/20"
          >
            <Leaf className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
