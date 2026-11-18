import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.MFR_BACKEND_URL ?? "http://127.0.0.1:8000";

async function proxyV1(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const subPath = path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_BASE}/api/v1/${subPath}${search}`;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  try {
    const body =
      request.method === "GET" || request.method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
    });

    const respType = upstream.headers.get("content-type") ?? "application/json";
    if (respType.startsWith("image/")) {
      const buf = await upstream.arrayBuffer();
      return new NextResponse(buf, {
        status: upstream.status,
        headers: { "content-type": respType, "cache-control": "no-store" },
      });
    }
    const text = await upstream.text();
    return new NextResponse(text, { status: upstream.status, headers: { "content-type": respType } });
  } catch (error) {
    return NextResponse.json(
      {
        error: "MFR AI 06 Backend Unavailable",
        detail: error instanceof Error ? error.message : "Failed to reach " + targetUrl,
      },
      { status: 503 },
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyV1(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyV1(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyV1(req, ctx);
}
