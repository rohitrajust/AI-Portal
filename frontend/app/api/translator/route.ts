import { NextResponse } from "next/server";

const backendUrl =
  process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$/g, "") ?? "http://127.0.0.1:5000";

async function fallbackTranslateWithMemory(text: string) {
  const response = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      text
    )}&langpair=ja|en`
  );

  if (!response.ok) {
    throw new Error(`Fallback translator request failed with ${response.status}`);
  }

  const data = await response.json();
  return (
    data?.responseData?.translatedText ||
    data?.matches?.[0]?.translation ||
    "Translation unavailable"
  );
}

export async function POST(request: Request) {
  const text = await request.json().then((value) => {
    if (typeof value === "string") return value;
    return value?.text ?? "";
  });

  if (!text || typeof text !== "string") {
    return new NextResponse(
      JSON.stringify({ error: "Missing translator text in request body." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  let backendError: string | null = null;

  if (backendUrl) {
    const backendEndpoint = `${backendUrl}/api/translator/api/translate`;
    try {
      const response = await fetch(backendEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const responseData = await response.json();
        return NextResponse.json(responseData.english ? { translation: responseData.english } : responseData, { status: 200 });
      }

      const errorText = await response.text();
      backendError = `HTTP ${response.status}: ${errorText}`;
      console.warn(`Translator backend error: ${backendError}. Will use fallback.`);
    } catch (error) {
      backendError = error instanceof Error ? error.message : "Unknown fetch error";
      console.warn("Translator backend fetch failed. Using fallback:", backendError);
    }
  }

  try {
    const translation = await fallbackTranslateWithMemory(text);
    return NextResponse.json({ translation }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown fallback error";
    const fullMessage = backendError
      ? `Backend error: ${backendError}; fallback failed: ${message}`
      : `Fallback translation failed: ${message}`;
    return new NextResponse(
      JSON.stringify({ error: fullMessage }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
}
