// src/lib/gemini-client.ts
// (sin reintentos, una sola petición)

const KEY = "AIzaSyCTu8wPqN-w04DOEaIeg-y1bAvjBLjm7Vw"; // NO hardcodes en prod
const URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent";

export async function generatePlanetImage(
  prompt: string,
  { signal }: { signal?: AbortSignal } = {}
): Promise<string> {
  if (typeof prompt !== "string") {
    throw new Error("prompt debe ser string");
  }

  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }] };

  const res = await fetch(`${URL}?key=${KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // NO reintentos: retorna el error tal cual para que el caller decida
    const txt = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${txt || res.statusText}`);
  }

  const json = await res.json();
  const parts = json?.candidates?.[0]?.content?.parts ?? [];
  const imgPart = parts.find((p: any) => p?.inlineData?.data);
  if (!imgPart) {
    const text = parts.find((p: any) => p?.text)?.text;
    throw new Error(
      "Respuesta sin imagen" + (text ? ` (texto: ${String(text).slice(0, 120)}…)` : "")
    );
  }

  const b64 = imgPart.inlineData.data as string;
  const mime = imgPart.inlineData.mimeType || "image/png";
  return `data:${mime};base64,${b64}`;
}
