import { NextResponse } from "next/server";
import { getReportData } from "@/data/api";

export function GET() {
  return NextResponse.json(getReportData());
}
