"use client";
import { useApp } from "@/context/AppContext";
import { AlertNotification } from "@/components/AlertNotification";
import { Button } from "@/components/ui/button";
import { Trash2, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AlertsPage() {
  const { alerts, handleAlertDismiss, handleAlertMarkRead, handleClearAllAlerts } = useApp();
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">System Alerts</h2>
          <p className="text-xs text-muted-foreground">{unreadCount > 0 ? `${unreadCount} unread alert${unreadCount > 1 ? "s" : ""}` : "All alerts read"}</p>
        </div>
        {alerts.length > 0 && (
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="sm" onClick={handleClearAllAlerts} data-testid="button-clear-all" className="h-8 text-xs border-border/40 rounded-lg">
              <Trash2 className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Clear All</span>
            </Button>
          </motion.div>
        )}
      </div>

      <div className="space-y-2" data-testid="alerts-list">
        <AnimatePresence mode="popLayout">
          {alerts.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
              <motion.div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted/50 mb-3" animate={{ rotate: [0, -5, 5, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <BellOff className="h-6 w-6 text-muted-foreground" />
              </motion.div>
              <h3 className="text-sm font-semibold mb-1">No alerts</h3>
              <p className="text-xs text-muted-foreground">Your system is running smoothly</p>
            </motion.div>
          ) : (
            alerts.map((alert) => (
              <motion.div key={alert.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                <AlertNotification alert={alert} onDismiss={handleAlertDismiss} onMarkRead={handleAlertMarkRead} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
