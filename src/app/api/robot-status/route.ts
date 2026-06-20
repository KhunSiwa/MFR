import { NextResponse } from "next/server";
import { getRobotStatus } from "@/data/mock-robot-control";

export function GET() {
  return NextResponse.json(getRobotStatus());
}
