export interface FieldMetadata {
  method: "OCR" | "LLM" | null;
  confidence: number | null;
  confidence_basis?: string | null;
  source?: string | null;
  status?: string;
  required?: boolean;
  reason?: string;
}

export type FieldMetadataMap = Record<string, FieldMetadata>;

export function normalizeMetadata(value: unknown): FieldMetadataMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: FieldMetadataMap = {};
  for (const [key, item] of Object.entries(value)) {
    if (!item || typeof item !== "object") continue;
    const data = item as Record<string, unknown>;
    const method = data.method === "OCR" || data.method === "LLM" ? data.method : null;
    result[key] = {
      method,
      confidence: typeof data.confidence === "number" && Number.isFinite(data.confidence) &&
        data.confidence >= 0 && data.confidence <= 1 ? data.confidence : null,
      confidence_basis: typeof data.confidence_basis === "string" ? data.confidence_basis : null,
      source: typeof data.source === "string" ? data.source : null,
      status: typeof data.status === "string" ? data.status : undefined,
      required: data.required === true,
      reason: typeof data.reason === "string" ? data.reason : undefined,
    };
  }
  return result;
}