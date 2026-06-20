import { NextResponse } from "next/server";
import { getTelemetry } from "@/data/mock-robot-control";

export function GET() {
  return NextResponse.json(getTelemetry());
}
