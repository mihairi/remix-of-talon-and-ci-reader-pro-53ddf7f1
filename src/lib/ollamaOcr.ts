import type { OllamaSettings } from "./ollamaSettings";
import { normalizeMetadata, type FieldMetadataMap } from "./fieldMetadata";

export interface ScanResponse {
  fields: Record<string, string>;
  field_metadata: FieldMetadataMap;
}

/** Sends the image or PDF to the Python OCR service and returns the extracted fields. */
export async function runOllamaOcr(
  file: File,
  docType: "talon" | "id-card",
  settings: OllamaSettings
): Promise<ScanResponse> {
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
  return { fields: body.fields || {}, field_metadata: normalizeMetadata(body.field_metadata) };
}
