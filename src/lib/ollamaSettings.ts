import { supabase } from "@/integrations/supabase/client";

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
    const { data, error } = await supabase
      .from("ocr_settings")
      .select("base_url, model, api_format")
      .limit(1)
      .single();

    if (error || !data) return { ...DEFAULT_SETTINGS };

    return {
      baseUrl: data.base_url || DEFAULT_SETTINGS.baseUrl,
      model: data.model || DEFAULT_SETTINGS.model,
      apiFormat: (data.api_format as ApiFormat) || DEFAULT_SETTINGS.apiFormat,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: OllamaSettings): Promise<void> {
  // Get the single row's id
  const { data } = await supabase
    .from("ocr_settings")
    .select("id")
    .limit(1)
    .single();

  if (data) {
    await supabase
      .from("ocr_settings")
      .update({
        base_url: settings.baseUrl,
        model: settings.model,
        api_format: settings.apiFormat,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  }
}
