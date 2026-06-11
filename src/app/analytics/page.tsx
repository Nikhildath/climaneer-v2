"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

export default function AnalyticsPage() {
  const { sensorTrends } = useApp();
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");

  const chartData = useMemo(() => {
    if (!sensorTrends || sensorTrends.length === 0) return [];
    const now = Date.now();
    let cutoffTime = now - 24 * 60 * 60 * 1000;
    if (timeRange === "7d") cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    if (timeRange === "30d") cutoffTime = now - 30 * 24 * 60 * 60 * 1000;
    return sensorTrends
      .filter((s) => new Date(s.timestamp).getTime() > cutoffTime)
      .map((s) => ({
        timestamp: new Date(s.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        moisture: s.soilMoisture, humidity: s.airHumidity, airTemp: s.airTemperature,
        waterTemp: s.waterTemperature, ph: (s.pH ?? 0).toFixed(1), waterLevel: s.waterLevel,
        flow: s.flowRate, aqi: s.airQuality,
      }));
  }, [sensorTrends, timeRange]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avgMoisture: 0, avgTemp: 0, avgHumidity: 0, avgPh: 0, totalFlow: 0 };
    const m = chartData.map((d) => d.moisture);
    const t = chartData.map((d) => d.airTemp);
    const h = chartData.map((d) => d.humidity);
    const p = chartData.map((d) => parseFloat(d.ph));
    const f = chartData.map((d) => d.flow);
    return {
      avgMoisture: (m.reduce((a, b) => a + b, 0) / m.length).toFixed(1),
      avgTemp: (t.reduce((a, b) => a + b, 0) / t.length).toFixed(1),
      avgHumidity: (h.reduce((a, b) => a + b, 0) / h.length).toFixed(1),
      avgPh: (p.reduce((a, b) => a + b, 0) / p.length).toFixed(1),
      totalFlow: (f.reduce((a, b) => a + b, 0)).toFixed(1),
    };
  }, [chartData]);

  const charts = [
    {
      title: "Moisture & Humidity", id: "chart-moisture-humidity",
      chart: (data: any[]) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Line type="monotone" dataKey="moisture" stroke="#10b981" strokeWidth={1.5} name="Soil Moisture (%)" dot={false} />
          <Line type="monotone" dataKey="humidity" stroke="#f43f5e" strokeWidth={1.5} name="Air Humidity (%)" dot={false} />
        </LineChart>
      ),
    },
    {
      title: "Temperature", id: "chart-temperature-comparison",
      chart: (data: any[]) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Line type="monotone" dataKey="airTemp" stroke="#f59e0b" strokeWidth={1.5} name="Air Temp (°C)" dot={false} />
          <Line type="monotone" dataKey="waterTemp" stroke="#06b6d4" strokeWidth={1.5} name="Water Temp (°C)" dot={false} />
        </LineChart>
      ),
    },
    {
      title: "pH Level", id: "chart-ph-trends",
      chart: (data: any[]) => (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis domain={[6, 8]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
          <Area type="monotone" dataKey="ph" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPh)" name="pH Level" strokeWidth={1.5} />
        </AreaChart>
      ),
    },
    {
      title: "Water Level & Flow", id: "chart-water-level-flow",
      chart: (data: any[]) => (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          <Line yAxisId="left" type="monotone" dataKey="waterLevel" stroke="#10b981" strokeWidth={1.5} name="Water Level (%)" dot={false} />
          <Line yAxisId="right" type="monotone" dataKey="flow" stroke="#f43f5e" strokeWidth={1.5} name="Flow Rate (L/min)" dot={false} />
        </LineChart>
      ),
    },
    {
      title: "Air Quality (AQI)", id: "chart-air-quality",
      chart: (data: any[]) => (
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="timestamp" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: "12px" }} />
          <Area type="monotone" dataKey="aqi" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAqi)" name="AQI" strokeWidth={1.5} />
        </AreaChart>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-xs text-muted-foreground">Sensor trends and historical data</p>
        </div>
        <div className="flex gap-1 p-0.5 rounded-lg bg-muted/50" data-testid="time-range-selector">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <Button key={range} variant={timeRange === range ? "default" : "ghost"} size="sm" onClick={() => setTimeRange(range)} data-testid={`button-${range}`}
              className={`h-7 text-xs px-3 rounded-md ${timeRange === range ? "bg-foreground text-background" : "text-muted-foreground"}`}>
              {range}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {charts.map(({ title, id, chart }) => (
          <motion.div key={id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="p-4 sm:p-5 border-0 shadow-none bg-card rounded-lg" data-testid={id}>
              <h3 className="text-sm font-semibold mb-3">{title}</h3>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  {chart(chartData)}
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                  <p className="text-xs text-muted-foreground">No data available for {timeRange}</p>
                </div>
              )}
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Avg Soil Moisture", value: `${stats.avgMoisture}%` },
          { label: "Avg Temperature", value: `${stats.avgTemp}°C` },
          { label: "Avg Humidity", value: `${stats.avgHumidity}%` },
          { label: "Avg pH Level", value: stats.avgPh },
          { label: "Total Flow", value: `${stats.totalFlow} L` },
        ].map((stat) => (
          <div key={stat.label} className="panel rounded-lg px-3 py-3">
            <p className="stat-label text-muted-foreground mb-0.5">{stat.label}</p>
            <p className="text-lg font-bold gradient-text">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
