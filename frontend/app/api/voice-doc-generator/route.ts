import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:5000";

export async function POST(request: Request) {
  const body = await request.json();
  const action = body?.action;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  const endpoint =
    action === "analyze"
      ? `${backendUrl}/api/docgen/api/analyze`
      : action === "generate"
        ? `${backendUrl}/api/docgen/api/generate`
        : action === "download"
          ? `${backendUrl}/api/docgen/api/download`
          : null;

  if (!endpoint) {
    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  }

  const backendResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (action === "download") {
    const arrayBuffer = await backendResponse.arrayBuffer();
    return new NextResponse(arrayBuffer, {
      status: backendResponse.status,
      headers: {
        "content-type": backendResponse.headers.get("content-type") ?? "application/octet-stream",
        "content-disposition": backendResponse.headers.get("content-disposition") ?? "attachment; filename=document.docx",
      },
    });
  }

  const responseText = await backendResponse.text();
  return new NextResponse(responseText, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
