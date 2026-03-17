CREATE TABLE public.ocr_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_url text NOT NULL DEFAULT 'http://localhost:11434',
  model text NOT NULL DEFAULT 'glm-ocr',
  api_format text NOT NULL DEFAULT 'ollama',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ocr_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.ocr_settings FOR SELECT USING (true);
CREATE POLICY "Anyone can update settings" ON public.ocr_settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert settings" ON public.ocr_settings FOR INSERT WITH CHECK (true);

INSERT INTO public.ocr_settings (base_url, model, api_format) VALUES ('http://localhost:11434', 'glm-ocr', 'ollama');
