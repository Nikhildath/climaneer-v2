"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useState, useMemo } from "react";
import { useSensorStore, type DeviceInfo } from "@/store/sensor-store";
import { useDeviceStore } from "@/store/device-store";
import { emitSocket } from "@/lib/socket-client";
import { useToast } from "@/hooks/use-toast";
import {
  Cpu, Wifi, WifiOff, Search, RefreshCw, Power, Clock, HardDrive, Server, Zap,
} from "lucide-react";
import { motion } from "framer-motion";

function DeviceCard({ device }: { device: DeviceInfo }) {
  const { toast } = useToast();
  const online = !!device.online_status;

  const handleCommand = (command: string) => {
    emitSocket("command", { device_id: device.device_id, command, params: {} });
    toast({ title: "Command Sent", description: `${command} → ${device.device_name}` });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -2 }}
    >
      <div className="panel rounded-lg px-4 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${online ? "bg-emerald-500/10" : "bg-muted/50"}`}>
              <Cpu className={`h-4 w-4 ${online ? "text-emerald-500" : "text-muted-foreground"}`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{device.device_name || device.device_id}</h3>
              <p className="text-[11px] text-muted-foreground font-mono">{device.device_id}</p>
            </div>
          </div>
          <Badge variant={online ? "default" : "secondary"} className={online ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:border-emerald-800 text-[10px] px-2 py-0.5" : "text-[10px] px-2 py-0.5"}>
            {online ? <><Wifi className="h-3 w-3 mr-1" /> Online</> : <><WifiOff className="h-3 w-3 mr-1" /> Offline</>}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <HardDrive className="h-3 w-3" />
            <span>FW: {device.firmware_version || "N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Server className="h-3 w-3" />
            <span>{device.board_type || "ESP32"}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
            <Clock className="h-3 w-3" />
            <span>Last seen: {device.last_seen ? new Date(device.last_seen + "Z").toLocaleString() : "Never"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/30">
          {[
            { label: "Sync", icon: RefreshCw, cmd: "sync" },
            { label: "Status", icon: Zap, cmd: "status_update" },
            { label: "Restart", icon: Power, cmd: "restart", danger: true },
          ].map(({ label, icon: Icon, cmd, danger }) => (
            <motion.div key={cmd} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCommand(cmd)}
                disabled={!online}
                className={`h-7 text-[11px] px-2 rounded-md border-border/40 ${danger ? "text-destructive border-destructive/20 hover:bg-destructive/5" : ""}`}
              >
                <Icon className="h-3 w-3 mr-1" /> {label}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default function DevicesPage() {
  const devices = useSensorStore((s) => s.devices);
  const { searchQuery, setSearchQuery, showOffline, setShowOffline, deviceFilter, setDeviceFilter } = useDeviceStore();

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!d.device_id.toLowerCase().includes(q) && !d.device_name?.toLowerCase().includes(q)) return false;
      }
      if (!showOffline && !d.online_status) return false;
      if (deviceFilter === "online" && !d.online_status) return false;
      if (deviceFilter === "offline" && d.online_status) return false;
      return true;
    });
  }, [devices, searchQuery, showOffline, deviceFilter]);

  const onlineCount = devices.filter((d) => d.online_status).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Devices</h2>
          <p className="text-xs text-muted-foreground">{devices.length} device{devices.length !== 1 ? "s" : ""} &middot; {onlineCount} online</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search by name or ID..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm bg-card border-border/40 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
            <Switch checked={showOffline} onCheckedChange={setShowOffline} className="scale-75" />
            Show offline
          </label>
          <select className="h-9 rounded-lg border border-border/40 bg-card px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20" value={deviceFilter} onChange={(e) => setDeviceFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel rounded-lg p-10 text-center">
          <Cpu className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="text-sm font-semibold mb-1">No Devices Found</h3>
          <p className="text-xs text-muted-foreground">{devices.length === 0 ? "Connect an ESP32 device to see it here" : "Try adjusting your search or filters"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((device) => <DeviceCard key={device.device_id} device={device} />)}
        </div>
      )}
    </div>
  );
}
