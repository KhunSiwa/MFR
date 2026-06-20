import { NextResponse } from "next/server";
import { getGalleryImages } from "@/data/mock-robot-control";

export function GET() {
  return NextResponse.json(getGalleryImages());
}
