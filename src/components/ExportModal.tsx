import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ExportFormat, SensorReading } from "@shared/schema";
import { useState } from "react";
import { FileJson, FileSpreadsheet, Download, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type HistoryEntry = {
  id: string;
  timestamp: string;
  sensors: SensorReading;
};

interface ExportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  history: HistoryEntry[];
}

export function ExportModal({ open, onOpenChange, history }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  // Export history as CSV
  const exportAsCSV = () => {
    if (history.length === 0) {
      toast({
        title: "No Data",
        description: "There is no history data to export",
        variant: "destructive",
      });
      return;
    }

    // Helper function to escape CSV values
    const escapeCsvValue = (value: any): string => {
      if (value === null || value === undefined) {
        return "";
      }
      const str = String(value);
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    // CSV headers
    const headers = [
      "Timestamp",
      "Soil Moisture (%)",
      "Air Humidity (%)",
      "Temperature (°C)",
      "pH Level",
      "Water Level (%)",
      "Air Quality",
      "Water Temperature (°C)",
      "Flow Rate (L/min)",
      "Battery (%)"
    ];

    // Convert history entries to CSV rows
    const rows = history.map((entry) => [
      escapeCsvValue(entry.timestamp),
      escapeCsvValue(entry.sensors.soilMoisture),
      escapeCsvValue(entry.sensors.airHumidity),
      escapeCsvValue(entry.sensors.airTemperature),
      escapeCsvValue(entry.sensors.pH ?? 0),
      escapeCsvValue(entry.sensors.waterLevel),
      escapeCsvValue(entry.sensors.airQuality),
      escapeCsvValue(entry.sensors.waterTemperature),
      escapeCsvValue(entry.sensors.flowRate),
      escapeCsvValue(entry.sensors.battery),
    ]);

    // Combine headers and rows
    const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `climaneer-history-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${history.length} entries as CSV`,
    });
  };

  // Export history as JSON
  const exportAsJSON = () => {
    if (history.length === 0) {
      toast({
        title: "No Data",
        description: "There is no history data to export",
        variant: "destructive",
      });
      return;
    }

    // Format history data for JSON export
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: history.length,
      history: history.map((entry) => ({
        id: entry.id,
        timestamp: entry.timestamp,
        sensors: {
          soilMoisture: entry.sensors.soilMoisture,
          airHumidity: entry.sensors.airHumidity,
          airTemperature: entry.sensors.airTemperature,
          pH: entry.sensors.pH ?? 0,
          waterLevel: entry.sensors.waterLevel,
          airQuality: entry.sensors.airQuality,
          waterTemperature: entry.sensors.waterTemperature,
          flowRate: entry.sensors.flowRate,
          battery: entry.sensors.battery,
        },
      })),
    };

    // Create blob and download
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `climaneer-history-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${history.length} entries as JSON`,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (format === "csv") {
        exportAsCSV();
      } else {
        exportAsJSON();
      }
      // Close modal after successful export
      setTimeout(() => {
        onOpenChange(false);
      }, 500);
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-xl dialog-mobile-bottom" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Download className="h-6 w-6 text-primary" />
            Export Data
          </DialogTitle>
          <DialogDescription>
            Choose a format to export your sensor history data
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <RadioGroup value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFormat("csv")}>
                <RadioGroupItem value="csv" id="csv" data-testid="radio-csv" />
                <div className="flex items-center gap-3 flex-1">
                  <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
                  <div className="flex-1">
                    <Label htmlFor="csv" className="text-base font-semibold cursor-pointer">
                      CSV (Excel)
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Compatible with Excel, Google Sheets
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-3 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFormat("json")}>
                <RadioGroupItem value="json" id="json" data-testid="radio-json" />
                <div className="flex items-center gap-3 flex-1">
                  <FileJson className="h-8 w-8 text-cyan-500" />
                  <div className="flex-1">
                    <Label htmlFor="json" className="text-base font-semibold cursor-pointer">
                      JSON
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      For developers and data analysis
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={exporting} data-testid="button-export">
            {exporting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
