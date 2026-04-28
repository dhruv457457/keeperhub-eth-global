import { type NextRequest, NextResponse } from "next/server";

const TARGET_ORIGIN = "https://app.keeperhub.com";

async function forward(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const apiKey = process.env.KEEPERHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing KEEPERHUB_API_KEY on the server." },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  const target = new URL(path.join("/"), `${TARGET_ORIGIN}/`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  headers.set("Authorization", `Bearer ${apiKey}`);
  headers.set("Accept", request.headers.get("accept") ?? "application/json");

  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  const body =
    request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.text();

  const response = await fetch(target, {
    method: request.method,
    headers,
    body,
    cache: "no-store",
  });

  const responseHeaders = new Headers();
  const responseContentType = response.headers.get("content-type");
  if (responseContentType) {
    responseHeaders.set("Content-Type", responseContentType);
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  return forward(request, context);
}
