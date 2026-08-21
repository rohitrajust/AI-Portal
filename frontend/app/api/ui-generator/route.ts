import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ??
  "http://127.0.0.1:5000";

// Upload sketch and generate UI
export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const cookie = request.headers.get("cookie") ?? "";

    const backendResponse = await fetch(
      `${backendUrl}/api/uidesign/upload`,
      {
        method: "POST",
        headers: {
          cookie,
        },
        body: formData,
      }
    );

    const responseData = await backendResponse.text();

    const response = new NextResponse(responseData, {
      status: backendResponse.status,
      headers: {
        "content-type":
          backendResponse.headers.get("content-type") ??
          "application/json",
      },
    });

    const setCookie =
      backendResponse.headers.get("set-cookie");

    if (setCookie) {
      response.headers.set(
        "set-cookie",
        setCookie
      );
    }

    return response;
  } catch (error) {
    console.error("UI Generator Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect to UI Generator backend",
      },
      {
        status: 500,
      }
    );
  }
}

// Health check
export async function GET() {
  try {
    const backendResponse = await fetch(
      `${backendUrl}/api/uidesign/health`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    const responseData =
      await backendResponse.text();

    return new NextResponse(responseData, {
      status: backendResponse.status,
      headers: {
        "content-type":
          backendResponse.headers.get("content-type") ??
          "application/json",
      },
    });
  } catch (error) {
    console.error("Health Check Error:", error);

    return NextResponse.json(
      {
        status: "down",
        service: "UI Generator",
      },
      {
        status: 500,
      }
    );
  }
}