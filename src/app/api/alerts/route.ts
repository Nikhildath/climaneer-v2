import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";
import { insertAlertSchema } from "@/shared/schema";

export async function GET() {
  try {
    const alerts = await storage.getAlerts();
    return NextResponse.json(alerts);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = insertAlertSchema.parse(body);
    const alert = await storage.createAlert(data);
    return NextResponse.json(alert);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.status || 400 });
  }
}
