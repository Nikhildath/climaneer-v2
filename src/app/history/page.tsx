"use client";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Download, Search, FileSpreadsheet, FileJson } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function HistoryPage() {
  const { history } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredHistory = history.filter((entry) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      entry.timestamp.toLowerCase().includes(searchLower) ||
      entry.sensors.soilMoisture.toString().includes(searchLower)
    );
  });

  const escapeCsvValue = (value: any): string => {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const exportAsCSV = () => {
    if (filteredHistory.length === 0) {
      toast({ title: "No Data", description: "There is no history data to export", variant: "destructive" });
      return;
    }
    const headers = ["Timestamp", "Soil Moisture (%)", "Air Humidity (%)", "Temperature (°C)", "pH Level", "Water Level (%)", "Air Quality", "Water Temperature (°C)", "Flow Rate (L/min)", "Battery (%)"];
    const rows = filteredHistory.map((entry) => [
      escapeCsvValue(entry.timestamp), escapeCsvValue(entry.sensors.soilMoisture),
      escapeCsvValue(entry.sensors.airHumidity), escapeCsvValue(entry.sensors.airTemperature),
      escapeCsvValue(entry.sensors.pH ?? 0), escapeCsvValue(entry.sensors.waterLevel),
      escapeCsvValue(entry.sensors.airQuality), escapeCsvValue(entry.sensors.waterTemperature),
      escapeCsvValue(entry.sensors.flowRate), escapeCsvValue(entry.sensors.battery),
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `climaneer-history-${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredHistory.length} entries as CSV` });
  };

  const exportAsJSON = () => {
    if (filteredHistory.length === 0) {
      toast({ title: "No Data", description: "There is no history data to export", variant: "destructive" });
      return;
    }
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: filteredHistory.length,
      history: filteredHistory.map((entry) => ({
        id: entry.id, timestamp: entry.timestamp,
        sensors: {
          soilMoisture: entry.sensors.soilMoisture, airHumidity: entry.sensors.airHumidity,
          airTemperature: entry.sensors.airTemperature, pH: entry.sensors.pH ?? 0,
          waterLevel: entry.sensors.waterLevel, airQuality: entry.sensors.airQuality,
          waterTemperature: entry.sensors.waterTemperature, flowRate: entry.sensors.flowRate,
          battery: entry.sensors.battery,
        },
      })),
    };
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `climaneer-history-${Date.now()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredHistory.length} entries as JSON` });
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Data History</h2>
          <p className="text-muted-foreground">{history.length} recorded entries</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-gradient-to-r from-emerald-600 to-emerald-500" data-testid="button-export-data">
              <Download className="h-4 w-4 mr-2" /> Export Data
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={exportAsCSV} data-testid="export-csv">
              <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-500" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsJSON} data-testid="export-json">
              <FileJson className="h-4 w-4 mr-2 text-cyan-500" /> Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" data-testid="input-search-history" />
      </div>

      <Card className="hidden lg:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Soil Moisture</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Air Humidity</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Temperature</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">pH Level</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Water Level</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Air Quality</th>
              </tr>
            </thead>
            <tbody data-testid="history-table">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                    {searchQuery ? "No matching records found" : "No history data available"}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((entry) => (
                  <tr key={entry.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors" data-testid={`history-row-${entry.id}`}>
                    <td className="px-4 py-3 text-sm">{format(new Date(entry.timestamp), "MMM d, h:mm a")}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sensors.soilMoisture}%</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sensors.airHumidity}%</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sensors.airTemperature}°C</td>
                    <td className="px-4 py-3 text-sm font-medium">{(entry.sensors.pH ?? 0).toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sensors.waterLevel}%</td>
                    <td className="px-4 py-3 text-sm font-medium">{entry.sensors.airQuality}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="lg:hidden space-y-3" data-testid="history-cards">
        {filteredHistory.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            {searchQuery ? "No matching records found" : "No history data available"}
          </Card>
        ) : (
          filteredHistory.map((entry) => (
            <Card key={entry.id} className="p-4 space-y-3" data-testid={`history-card-${entry.id}`}>
              <div className="flex items-center justify-between gap-2 pb-2 border-b">
                <span className="text-sm font-semibold">{format(new Date(entry.timestamp), "MMM d, yyyy")}</span>
                <span className="text-sm text-muted-foreground">{format(new Date(entry.timestamp), "h:mm a")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Soil Moisture</p><p className="font-semibold">{entry.sensors.soilMoisture}%</p></div>
                <div><p className="text-muted-foreground">Air Humidity</p><p className="font-semibold">{entry.sensors.airHumidity}%</p></div>
                <div><p className="text-muted-foreground">Temperature</p><p className="font-semibold">{entry.sensors.airTemperature}°C</p></div>
                <div><p className="text-muted-foreground">pH Level</p><p className="font-semibold">{(entry.sensors.pH ?? 0).toFixed(1)}</p></div>
                <div><p className="text-muted-foreground">Water Level</p><p className="font-semibold">{entry.sensors.waterLevel}%</p></div>
                <div><p className="text-muted-foreground">Air Quality</p><p className="font-semibold">{entry.sensors.airQuality}</p></div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
