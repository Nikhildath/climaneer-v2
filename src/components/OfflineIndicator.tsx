import { WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function OfflineIndicator() {
  return (
    <div className="fixed top-32 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
      <Alert variant="destructive" className="border-2 shadow-lg">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>No Internet Connection</AlertTitle>
        <AlertDescription>
          You&apos;re viewing cached data. Changes won&apos;t be saved until you&apos;re back online.
        </AlertDescription>
      </Alert>
    </div>
  );
}
