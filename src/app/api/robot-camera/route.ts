import { NextResponse } from "next/server";
import { getCameraStream } from "@/data/mock-robot-control";

export function GET() {
  return NextResponse.json(getCameraStream());
}
