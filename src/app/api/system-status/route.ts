import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function GET() {
  try {
    const status = await storage.getSystemStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
