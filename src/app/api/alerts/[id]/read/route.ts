import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export function generateStaticParams() {
  return [];
}

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const alert = await storage.markAlertAsRead(params.id);
    if (!alert) {
      return NextResponse.json({ message: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json(alert);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
