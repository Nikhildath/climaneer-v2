import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export async function GET() {
  try {
    const stats = await storage.getStatistics();
    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
