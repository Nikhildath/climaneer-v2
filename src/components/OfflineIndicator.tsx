"use client";
import { WifiOff } from "lucide-react";
import { motion } from "framer-motion";

export function OfflineIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className="fixed top-14 sm:top-16 left-0 right-0 z-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 px-3 py-2 rounded-b-lg bg-destructive/5 border-x border-b border-destructive/20 backdrop-blur-md">
          <div className="w-1.5 h-1.5 rounded-full bg-destructive" />
          <span className="text-xs font-medium text-destructive">No connection &mdash; showing cached data</span>
        </div>
      </div>
    </motion.div>
  );
}
