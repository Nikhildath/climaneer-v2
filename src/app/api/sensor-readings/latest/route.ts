import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function GET() {
  try {
    const reading = await storage.getLatestSensorReading();
    if (!reading) {
      return NextResponse.json({ message: "No sensor readings found" }, { status: 404 });
    }
    return NextResponse.json(reading);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
