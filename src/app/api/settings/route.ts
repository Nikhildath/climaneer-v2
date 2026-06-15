import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";
import { insertSettingsSchema } from "@/shared/schema";

export async function GET() {
  try {
    const settings = await storage.getSettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const data = insertSettingsSchema.partial().parse(body);
    const settings = await storage.updateSettings(data);
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: error.status || 400 });
  }
}
