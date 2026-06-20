import { NextResponse } from "next/server";
import { db } from "@/data/api";

export function GET() {
  return NextResponse.json(db.inspectionHistory);
}
