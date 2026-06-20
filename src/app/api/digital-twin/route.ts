import { NextResponse } from "next/server";
import { robotTwin } from "@/data/robot-platform";

export function GET() {
  return NextResponse.json(robotTwin);
}
