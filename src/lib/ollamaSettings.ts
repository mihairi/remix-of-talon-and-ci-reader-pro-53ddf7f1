const STORAGE_KEY = "ollama_settings";

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

export function loadSettings(): OllamaSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: OllamaSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
