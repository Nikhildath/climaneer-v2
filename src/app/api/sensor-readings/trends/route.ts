import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const hours = parseInt(url.searchParams.get("hours") || "24");
    const trends = await storage.getTrendData(hours);
    return NextResponse.json(trends);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
