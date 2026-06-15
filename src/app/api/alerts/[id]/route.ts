import { NextResponse } from "next/server";
import { storage } from "@/app/api/storage";

export function generateStaticParams() {
  return [];
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const deleted = await storage.deleteAlert(params.id);
    if (!deleted) {
      return NextResponse.json({ message: "Alert not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
