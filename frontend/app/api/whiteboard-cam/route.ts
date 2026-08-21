import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/, "") ?? "http://127.0.0.1:5000";

export async function POST(request: Request) {
  try {
    // Read the incoming multipart/form-data stream from the browser
    const formData = await request.formData();

    // Forward the file and form fields to the unified Flask backend
    const backendResponse = await fetch(`${backendUrl}/api/whiteboard/process-direct`, {
      method: "POST",
      body: formData,
    });

    const responseData = await backendResponse.json();

    return NextResponse.json(responseData, {
      status: backendResponse.status,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to communicate with AI Whiteboard Cam backend." },
      { status: 500 }
    );
  }
}