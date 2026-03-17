export type ApiFormat = "ollama" | "openai-compatible";

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  apiFormat: ApiFormat;
}

export const DEFAULT_SETTINGS: OllamaSettings = {
  baseUrl: "http://localhost:11434",
  model: "glm-ocr",
  apiFormat: "ollama",
};

export async function loadSettings(): Promise<OllamaSettings> {
  try {
    const res = await fetch("/ocr-settings.json");
    if (!res.ok) return { ...DEFAULT_SETTINGS };
    const data = await res.json();
    return {
      baseUrl: data.baseUrl || DEFAULT_SETTINGS.baseUrl,
      model: data.model || DEFAULT_SETTINGS.model,
      apiFormat: (data.apiFormat as ApiFormat) || DEFAULT_SETTINGS.apiFormat,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
