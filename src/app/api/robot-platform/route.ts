import { NextResponse } from "next/server";
import { futureModules, missions, robotModules, robotPlatform, robotTwin } from "@/data/robot-platform";

export function GET() {
  return NextResponse.json({
    platform: robotPlatform,
    modules: robotModules,
    twin: robotTwin,
    missions,
    futureModules,
  });
}
