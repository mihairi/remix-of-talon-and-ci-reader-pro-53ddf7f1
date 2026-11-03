export interface OllamaSettings {
  serviceUrl: string;
  apiKey: string;
}

export const DEFAULT_SETTINGS: OllamaSettings = { serviceUrl: "http://localhost:8000", apiKey: "" };

export async function loadSettings(): Promise<OllamaSettings> {
  try {
    const res = await fetch("/ocr-settings.json", { cache: "no-store" });
    if (!res.ok) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(await res.json()) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
