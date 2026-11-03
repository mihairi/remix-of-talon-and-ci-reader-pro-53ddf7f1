import type { OllamaSettings } from "./ollamaSettings";

/** Sends the image or PDF to the Python OCR service and returns the extracted fields. */
export async function runOllamaOcr(
  file: File,
  docType: "talon" | "id-card",
  settings: OllamaSettings
): Promise<Record<string, string>> {
  const form = new FormData();
  form.append("file", file);
  form.append("doc_type", docType);

  let res: Response;
  try {
    res = await fetch(`${settings.serviceUrl.replace(/\/$/, "")}/scan`, {
      method: "POST",
      body: form,
      headers: settings.apiKey ? { "x-api-key": settings.apiKey } : undefined,
    });
  } catch {
    throw new Error("Nu s-a putut conecta la serviciul OCR. Verificați că serviciul rulează.");
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.detail || "Serviciul OCR a returnat o eroare.");
  return body.fields || {};
}
