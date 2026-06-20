import { NextResponse } from "next/server";
import { robotModules } from "@/data/robot-platform";

export function GET() {
  return NextResponse.json(robotModules);
}
