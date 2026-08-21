const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/+$|\/$/, "") ?? "http://127.0.0.1:5000";

export async function POST(request: Request) {
  const backendEndpoint = `${backendUrl}/api/arena/api/debate/stream`;
  const body = await request.text();

  const response = await fetch(backendEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

  const headers: Record<string, string> = {};
  const contentType = response.headers.get("content-type");
  if (contentType) headers["content-type"] = contentType;

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
