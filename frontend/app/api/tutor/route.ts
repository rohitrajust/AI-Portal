import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:5000";

// Handles sending a chat message -> forwards to Flask's /api/tutor/api/chat
export async function POST(request: Request) {
  const body = await request.text();
  const cookie = request.headers.get("cookie") ?? "";

  const backendResponse = await fetch(`${backendUrl}/api/tutor/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
    body,
  });

  const responseData = await backendResponse.text();

  const response = new NextResponse(responseData, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });

  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}

// Handles resetting the session -> forwards to Flask's /api/tutor/api/reset
export async function DELETE(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";

  const backendResponse = await fetch(`${backendUrl}/api/tutor/api/reset`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie,
    },
  });

  const responseData = await backendResponse.text();

  const response = new NextResponse(responseData, {
    status: backendResponse.status,
    headers: {
      "content-type": backendResponse.headers.get("content-type") ?? "application/json",
    },
  });

  const setCookie = backendResponse.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }

  return response;
}