import { NextResponse } from "next/server";
import { missions } from "@/data/robot-platform";

export function GET() {
  return NextResponse.json(missions);
}
