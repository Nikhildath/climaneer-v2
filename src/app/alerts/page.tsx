"use client";
import { useApp } from "@/context/AppContext";
import { AlertNotification } from "@/components/AlertNotification";
import { Button } from "@/components/ui/button";
import { Trash2, BellOff } from "lucide-react";

export default function AlertsPage() {
  const { alerts, handleAlertDismiss, handleAlertMarkRead, handleClearAllAlerts } = useApp();
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">System Alerts</h2>
          <p className="text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All alerts read"}</p>
        </div>
        {alerts.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleClearAllAlerts} data-testid="button-clear-all">
            <Trash2 className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Clear All</span>
          </Button>
        )}
      </div>

      <div className="space-y-3" data-testid="alerts-list">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
              <BellOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No alerts</h3>
            <p className="text-sm text-muted-foreground">Your system is running smoothly</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <AlertNotification key={alert.id} alert={alert} onDismiss={handleAlertDismiss} onMarkRead={handleAlertMarkRead} />
          ))
        )}
      </div>
    </div>
  );
}
