import { NextResponse } from "next/server";
import { DEMO_SCAN_RESULT } from "@/lib/demo/demoData";

export async function GET() {
  return NextResponse.json(DEMO_SCAN_RESULT);
}

export async function POST() {
  return NextResponse.json(DEMO_SCAN_RESULT);
}
