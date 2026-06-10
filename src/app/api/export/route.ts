import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";
import { exportFormatSchema } from "@/shared/schema";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const formatParam = url.searchParams.get("format") || "json";
    const format = exportFormatSchema.parse(formatParam);
    const readings = await storage.getSensorReadingHistory(1000);

    if (format === "csv") {
      const escapeCsvValue = (value: any): string => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };
      const headers = ["timestamp", "soilMoisture", "airHumidity", "waterLevel", "pH", "airTemperature", "waterTemperature", "airQuality", "flowRate", "battery"];
      const csv = [
        headers.join(","),
        ...readings.map((r) =>
          [escapeCsvValue(r.timestamp), escapeCsvValue(r.soilMoisture), escapeCsvValue(r.airHumidity),
            escapeCsvValue(r.waterLevel), escapeCsvValue(r.pH), escapeCsvValue(r.airTemperature),
            escapeCsvValue(r.waterTemperature), escapeCsvValue(r.airQuality), escapeCsvValue(r.flowRate),
            escapeCsvValue(r.battery)].join(",")
        ),
      ].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="climaneer-export-${Date.now()}.csv"`,
        },
      });
    }

    return NextResponse.json({ readings, exportedAt: new Date().toISOString() }, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="climaneer-export-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.status || 500 });
  }
}
