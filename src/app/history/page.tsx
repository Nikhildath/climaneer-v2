"use client";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Download, Search, FileSpreadsheet, FileJson } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { format } from "date-fns";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function HistoryPage() {
  const { history } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const filteredHistory = history.filter((entry) => {
    const searchLower = searchQuery.toLowerCase();
    return entry.timestamp.toLowerCase().includes(searchLower) || entry.sensors.soilMoisture.toString().includes(searchLower);
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
      escapeCsvValue(entry.timestamp), escapeCsvValue(entry.sensors.soilMoisture), escapeCsvValue(entry.sensors.airHumidity),
      escapeCsvValue(entry.sensors.airTemperature), escapeCsvValue(entry.sensors.pH ?? 0), escapeCsvValue(entry.sensors.waterLevel),
      escapeCsvValue(entry.sensors.airQuality), escapeCsvValue(entry.sensors.waterTemperature), escapeCsvValue(entry.sensors.flowRate), escapeCsvValue(entry.sensors.battery),
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
      exportedAt: new Date().toISOString(), totalEntries: filteredHistory.length,
      history: filteredHistory.map((entry) => ({ id: entry.id, timestamp: entry.timestamp, sensors: { ...entry.sensors } })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `climaneer-history-${Date.now()}.json`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: `Exported ${filteredHistory.length} entries as JSON` });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Data History</h2>
          <p className="text-xs text-muted-foreground">{history.length} recorded entries</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-8 text-xs bg-foreground text-background hover:bg-foreground/90 rounded-lg" data-testid="button-export-data">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export Data
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-lg border-border/40 min-w-[140px]">
            <DropdownMenuItem onClick={exportAsCSV} data-testid="export-csv" className="text-xs cursor-pointer">
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-500" /> Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportAsJSON} data-testid="export-json" className="text-xs cursor-pointer">
              <FileJson className="h-3.5 w-3.5 mr-2 text-rose-500" /> Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input placeholder="Search history..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-8 h-9 text-sm bg-card border-border/40 rounded-lg" data-testid="input-search-history" />
      </div>

      <div className="hidden lg:block panel rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                {["Time", "Soil Moisture", "Air Humidity", "Temperature", "pH Level", "Water Level", "Air Quality"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody data-testid="history-table">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-xs text-muted-foreground">
                    {searchQuery ? "No matching records found" : "No history data available"}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((entry, i) => (
                  <motion.tr
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors"
                    data-testid={`history-row-${entry.id}`}
                  >
                    <td className="px-3 py-2.5 text-xs">{format(new Date(entry.timestamp), "MMM d, h:mm a")}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{entry.sensors.soilMoisture}%</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{entry.sensors.airHumidity}%</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{entry.sensors.airTemperature}°C</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{(entry.sensors.pH ?? 0).toFixed(1)}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{entry.sensors.waterLevel}%</td>
                    <td className="px-3 py-2.5 text-xs font-semibold">{entry.sensors.airQuality}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="lg:hidden space-y-2" data-testid="history-cards">
        {filteredHistory.length === 0 ? (
          <div className="panel rounded-lg p-8 text-center text-xs text-muted-foreground">{searchQuery ? "No matching records found" : "No history data available"}</div>
        ) : (
          filteredHistory.map((entry) => (
            <motion.div key={entry.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} layout>
              <div className="panel rounded-lg px-4 py-3 space-y-2" data-testid={`history-card-${entry.id}`}>
                <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/20">
                  <span className="text-xs font-semibold">{format(new Date(entry.timestamp), "MMM d, yyyy")}</span>
                  <span className="text-[11px] text-muted-foreground">{format(new Date(entry.timestamp), "h:mm a")}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: "Soil Moisture", value: `${entry.sensors.soilMoisture}%` },
                    { label: "Air Humidity", value: `${entry.sensors.airHumidity}%` },
                    { label: "Temperature", value: `${entry.sensors.airTemperature}°C` },
                    { label: "pH Level", value: (entry.sensors.pH ?? 0).toFixed(1) },
                    { label: "Water Level", value: `${entry.sensors.waterLevel}%` },
                    { label: "Air Quality", value: entry.sensors.airQuality },
                  ].map(({ label, value }) => (
                    <div key={label}><p className="text-muted-foreground">{label}</p><p className="font-semibold">{value}</p></div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
