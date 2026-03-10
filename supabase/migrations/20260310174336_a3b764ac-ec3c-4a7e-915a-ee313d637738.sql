
CREATE TABLE public.ocr_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  base_url text NOT NULL DEFAULT 'http://localhost:11434',
  model text NOT NULL DEFAULT 'glm-ocr',
  api_format text NOT NULL DEFAULT 'ollama',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ocr_settings (id, base_url, model, api_format) 
VALUES (1, 'http://localhost:11434', 'glm-ocr', 'ollama');

ALTER TABLE public.ocr_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read OCR settings"
ON public.ocr_settings FOR SELECT
TO anon, authenticated
USING (true);
