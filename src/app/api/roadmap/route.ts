import { NextResponse } from "next/server";
import { futureModules } from "@/data/robot-platform";

export function GET() {
  return NextResponse.json(futureModules);
}
