import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "100");
    const readings = await storage.getSensorReadingHistory(limit);
    return NextResponse.json(readings);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
