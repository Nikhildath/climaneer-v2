import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function POST() {
  try {
    const reading = await storage.createSensorReading({
      timestamp: new Date().toISOString(),
      soilMoisture: Math.round(55 + Math.random() * 20),
      airHumidity: Math.round(45 + Math.random() * 20),
      waterLevel: Math.round(70 + Math.random() * 15),
      pH: Math.round((6.5 + Math.random() * 0.6) * 10) / 10,
      airTemperature: Math.round((22 + Math.random() * 4) * 10) / 10,
      waterTemperature: Math.round((18 + Math.random() * 4) * 10) / 10,
      airQuality: Math.round(30 + Math.random() * 30),
      flowRate: Math.round((2 + Math.random() * 1) * 10) / 10,
      battery: Math.max(20, Math.round(80 + Math.random() * 15)),
    });
    return NextResponse.json(reading);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
