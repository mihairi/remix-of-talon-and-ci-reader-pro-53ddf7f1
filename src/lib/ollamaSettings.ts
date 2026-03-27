export type ApiFormat = "ollama" | "openai-compatible";

export interface OcrPreprocessSettings {
  enabled: boolean;
  model: string;
}

export interface OllamaSettings {
  baseUrl: string;
  model: string;
  apiFormat: ApiFormat;
  ocrPreprocess: OcrPreprocessSettings;
}

export const DEFAULT_SETTINGS: OllamaSettings = {
  baseUrl: "http://localhost:11434",
  model: "glm-ocr",
  apiFormat: "ollama",
  ocrPreprocess: {
    enabled: false,
    model: "minicpm-v",
  },
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
      ocrPreprocess: {
        enabled: data.ocrPreprocess?.enabled ?? false,
        model: data.ocrPreprocess?.model || DEFAULT_SETTINGS.ocrPreprocess.model,
      },
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}
