"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { ChartSkeleton } from "@/components/LoadingSkeleton";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

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
        moisture: s.soilMoisture,
        humidity: s.airHumidity,
        airTemp: s.airTemperature,
        waterTemp: s.waterTemperature,
        ph: (s.pH ?? 0).toFixed(1),
        waterLevel: s.waterLevel,
        flow: s.flowRate,
        aqi: s.airQuality,
      }));
  }, [sensorTrends, timeRange]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return { avgMoisture: 0, avgTemp: 0, avgHumidity: 0, avgPh: 0, totalFlow: 0 };
    const moisture = chartData.map((d) => d.moisture);
    const temp = chartData.map((d) => d.airTemp);
    const humidity = chartData.map((d) => d.humidity);
    const ph = chartData.map((d) => parseFloat(d.ph));
    const flow = chartData.map((d) => d.flow);
    return {
      avgMoisture: (moisture.reduce((a, b) => a + b, 0) / moisture.length).toFixed(1),
      avgTemp: (temp.reduce((a, b) => a + b, 0) / temp.length).toFixed(1),
      avgHumidity: (humidity.reduce((a, b) => a + b, 0) / humidity.length).toFixed(1),
      avgPh: (ph.reduce((a, b) => a + b, 0) / ph.length).toFixed(1),
      totalFlow: (flow.reduce((a, b) => a + b, 0)).toFixed(1),
    };
  }, [chartData]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Sensor trends and historical data</p>
        </div>
        <div className="flex gap-2" data-testid="time-range-selector">
          <Button variant={timeRange === "24h" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("24h")} data-testid="button-24h">24H</Button>
          <Button variant={timeRange === "7d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("7d")} data-testid="button-7d">7D</Button>
          <Button variant={timeRange === "30d" ? "default" : "outline"} size="sm" onClick={() => setTimeRange("30d")} data-testid="button-30d">30D</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6" data-testid="chart-moisture-humidity">
          <h3 className="text-lg font-semibold mb-4">Moisture & Humidity Levels</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="moisture" stroke="#10b981" name="Soil Moisture (%)" />
                <Line type="monotone" dataKey="humidity" stroke="#06b6d4" name="Air Humidity (%)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data available for {timeRange}</p>
            </div>
          )}
        </Card>

        <Card className="p-6" data-testid="chart-temperature-comparison">
          <h3 className="text-lg font-semibold mb-4">Temperature Comparison</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="airTemp" stroke="#f59e0b" name="Air Temp (°C)" />
                <Line type="monotone" dataKey="waterTemp" stroke="#06b6d4" name="Water Temp (°C)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data available for {timeRange}</p>
            </div>
          )}
        </Card>

        <Card className="p-6" data-testid="chart-ph-trends">
          <h3 className="text-lg font-semibold mb-4">pH Level Trends</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPh" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis domain={[6, 8]} />
                <Tooltip />
                <Area type="monotone" dataKey="ph" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorPh)" name="pH Level" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data available for {timeRange}</p>
            </div>
          )}
        </Card>

        <Card className="p-6" data-testid="chart-water-level-flow">
          <h3 className="text-lg font-semibold mb-4">Water Level & Flow Rate</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="waterLevel" stroke="#10b981" name="Water Level (%)" />
                <Line yAxisId="right" type="monotone" dataKey="flow" stroke="#06b6d4" name="Flow Rate (L/min)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data available for {timeRange}</p>
            </div>
          )}
        </Card>

        <Card className="p-6" data-testid="chart-air-quality">
          <h3 className="text-lg font-semibold mb-4">Air Quality Index (AQI)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="timestamp" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="aqi" stroke="#f59e0b" fillOpacity={1} fill="url(#colorAqi)" name="AQI" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-80 flex items-center justify-center bg-muted/30 rounded-lg">
              <p className="text-muted-foreground">No data available for {timeRange}</p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4"><p className="text-sm text-muted-foreground mb-1">Avg Soil Moisture</p><p className="text-2xl font-bold gradient-text">{stats.avgMoisture}%</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground mb-1">Avg Temperature</p><p className="text-2xl font-bold gradient-text">{stats.avgTemp}°C</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground mb-1">Avg Humidity</p><p className="text-2xl font-bold gradient-text">{stats.avgHumidity}%</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground mb-1">Avg pH Level</p><p className="text-2xl font-bold gradient-text">{stats.avgPh}</p></Card>
        <Card className="p-4"><p className="text-sm text-muted-foreground mb-1">Total Flow</p><p className="text-2xl font-bold gradient-text">{stats.totalFlow} L</p></Card>
      </div>
    </div>
  );
}
