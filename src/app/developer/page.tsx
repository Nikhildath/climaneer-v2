"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useSensorStore } from "@/store/sensor-store";
import { emitSocket, getSocket } from "@/lib/socket-client";
import { SOCKET_URL } from "@/lib/env";
import { useToast } from "@/hooks/use-toast";
import {
  Wrench, Bug, SlidersHorizontal, RefreshCw, Send,
  FlaskConical, Radio, FileJson, Activity,
} from "lucide-react";
import { motion } from "framer-motion";

const SENSOR_KEYS = [
  { key: "soil_moisture", label: "Soil Moisture", unit: "%", min: 0, max: 100, step: 0.1 },
  { key: "ph", label: "pH", unit: "", min: 0, max: 14, step: 0.1 },
  { key: "air_humidity", label: "Air Humidity", unit: "%", min: 0, max: 100, step: 0.1 },
  { key: "air_temp", label: "Air Temperature", unit: "°C", min: -10, max: 60, step: 0.1 },
  { key: "water_temp", label: "Water Temperature", unit: "°C", min: -10, max: 60, step: 0.1 },
  { key: "water_level", label: "Water Level", unit: "%", min: 0, max: 100, step: 0.1 },
  { key: "air_quality", label: "Air Quality", unit: "AQI", min: 0, max: 500, step: 1 },
  { key: "flow", label: "Flow Rate", unit: "L/min", min: 0, max: 50, step: 0.1 },
  { key: "battery", label: "Battery", unit: "%", min: 0, max: 100, step: 1 },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

function SensorOverrideRow({ sensorKey, label, unit, min, max, step }: {
  sensorKey: string; label: string; unit: string; min: number; max: number; step: number;
}) {
  const overrides = useSensorStore((s) => s.overrides);
  const effectiveSensors = useSensorStore((s) => s.effectiveSensors);
  const realSensors = useSensorStore((s) => s.realSensors);
  const deviceId = useSensorStore((s) => s.deviceId);
  const { toast } = useToast();

  const override = overrides.find((o) => o.sensor_key === sensorKey);
  const isOverridden = override?.enabled;
  const effectiveValue = effectiveSensors?.[sensorKey as keyof typeof effectiveSensors];
  const realValue = realSensors?.[sensorKey as keyof typeof realSensors];

  const [localValue, setLocalValue] = useState(effectiveValue ?? 0);

  useEffect(() => {
    const val = effectiveValue ?? realValue ?? 0;
    setLocalValue(val);
  }, [effectiveValue, realValue]);

  const toggleOverride = (enabled: boolean) => {
    if (!deviceId) return;
    emitSocket("override_sensor", {
      device_id: deviceId,
      sensor_key: sensorKey,
      value: localValue,
      enabled,
    });
    toast({
      title: enabled ? "Override Enabled" : "Override Disabled",
      description: `${label}: ${enabled ? localValue.toFixed(1) + unit : "real value"}`,
    });
  };

  const applyValue = () => {
    if (!deviceId) return;
    emitSocket("override_sensor", {
      device_id: deviceId,
      sensor_key: sensorKey,
      value: localValue,
      enabled: true,
    });
    toast({
      title: "Override Applied",
      description: `${label} → ${localValue.toFixed(1)}${unit}`,
    });
  };

  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/30 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {isOverridden && (
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-500/10 text-amber-600 border-amber-500/30">
              OVERRIDE
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">Real:</span>
          <span className="text-xs font-mono">{realValue?.toFixed(1) ?? "—"}{unit}</span>
          {isOverridden && (
            <>
              <span className="text-xs text-muted-foreground">Override:</span>
              <span className="text-xs font-mono text-amber-600">{override?.override_value?.toFixed(1)}{unit}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={!!isOverridden} onCheckedChange={toggleOverride} />
        <Input
          type="number"
          min={min}
          max={max}
          step={step}
          value={localValue}
          onChange={(e) => setLocalValue(parseFloat(e.target.value) || 0)}
          className="w-20 h-8 text-xs text-center bg-background border-border/50"
        />
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-border/50" onClick={applyValue} disabled={!deviceId}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

export default function DeveloperPage() {
  const deviceId = useSensorStore((s) => s.deviceId);
  const isTestingMode = useSensorStore((s) => s.isTestingMode);
  const connected = useSensorStore((s) => s.connected);
  const { toast } = useToast();
  const [aiOverride, setAiOverride] = useState("");

  const handleAIOverride = () => {
    if (!deviceId || !aiOverride.trim()) return;
    emitSocket("override_ai", {
      device_id: deviceId,
      recommendation: aiOverride.trim(),
    });
    toast({ title: "AI Override", description: `Recommendation set to: ${aiOverride}` });
  };

  const handleSendRaw = () => {
    if (!deviceId) return;
    emitSocket("command", {
      device_id: deviceId,
      command: "custom",
      params: { message: "Developer test command" },
    });
    toast({ title: "Raw Command", description: "Custom command sent to device" });
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Developer</h2>
          <p className="text-muted-foreground text-sm">Testing, overrides, and debug controls</p>
        </div>
        <Badge variant={connected ? "default" : "secondary"} className={connected ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" : ""}>
          <Activity className="h-3 w-3 mr-1" />
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <motion.div variants={itemVariants}>
        <Card className={`p-4 rounded-xl border-2 ${isTestingMode ? "border-amber-500/30 bg-amber-500/5" : "border-border/50"}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FlaskConical className={`h-5 w-5 ${isTestingMode ? "text-amber-500" : "text-muted-foreground"}`} />
              <div>
                <h3 className="font-semibold text-sm">Testing Mode</h3>
                <p className="text-xs text-muted-foreground">
                  {isTestingMode
                    ? "Override active — sensor values and AI use overridden data"
                    : "No overrides set — all values are real sensor data"}
                </p>
              </div>
            </div>
            {isTestingMode && (
              <Badge className="bg-amber-500 text-white border-0">ACTIVE</Badge>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 border border-border/50 shadow-soft rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Sensor Value Overrides</h3>
            <p className="text-xs text-muted-foreground ml-2">Override real sensor values for testing</p>
          </div>
          <div className="divide-y divide-border/30">
            {SENSOR_KEYS.map((sk) => (
              <SensorOverrideRow key={sk.key} sensorKey={sk.key} label={sk.label} unit={sk.unit} min={sk.min} max={sk.max} step={sk.step} />
            ))}
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 border border-border/50 shadow-soft rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Bug className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">AI Recommendation Override</h3>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter custom AI recommendation..."
              value={aiOverride}
              onChange={(e) => setAiOverride(e.target.value)}
              className="flex-1 bg-background border-border/50"
            />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={handleAIOverride} disabled={!deviceId} className="bg-gradient-to-r from-emerald-600 to-violet-600 hover:from-emerald-500 hover:to-violet-500">
                <Send className="h-4 w-4 mr-2" /> Set
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 border border-border/50 shadow-soft rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <Radio className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Device Commands</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" onClick={handleSendRaw} disabled={!deviceId} className="border-border/50">
                <Send className="h-4 w-4 mr-2" /> Send Custom Command
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" onClick={() => {
                emitSocket("get_overrides", { device_id: deviceId });
                toast({ title: "Requested", description: "Fetching override state from server" });
              }} disabled={!deviceId} className="border-border/50">
                <RefreshCw className="h-4 w-4 mr-2" /> Refresh Overrides
              </Button>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="p-5 border border-border/50 shadow-soft rounded-xl">
          <div className="flex items-center gap-2 mb-4">
            <FileJson className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Connection Info</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono text-muted-foreground">
            <div className="p-3 rounded-xl bg-muted/30"><p className="text-xs text-muted-foreground/70 mb-1">Active Device</p><p className="font-semibold text-foreground/80">{deviceId || "None"}</p></div>
            <div className="p-3 rounded-xl bg-muted/30"><p className="text-xs text-muted-foreground/70 mb-1">Socket Connected</p><p className="font-semibold text-foreground/80">{connected ? "Yes" : "No"}</p></div>
            <div className="p-3 rounded-xl bg-muted/30"><p className="text-xs text-muted-foreground/70 mb-1">Testing Mode</p><p className="font-semibold text-foreground/80">{isTestingMode ? "Active" : "Inactive"}</p></div>
            <div className="p-3 rounded-xl bg-muted/30"><p className="text-xs text-muted-foreground/70 mb-1">Server</p><p className="font-semibold text-foreground/80" style={{ wordBreak: "break-all" }}>{SOCKET_URL}</p></div>
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
