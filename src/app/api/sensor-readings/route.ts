import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";
import { insertSensorReadingSchema } from "@/shared/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = insertSensorReadingSchema.parse(body);
    const reading = await storage.createSensorReading(data);
    return NextResponse.json(reading);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.status || 400 });
  }
}
