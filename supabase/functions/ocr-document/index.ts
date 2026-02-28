import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_BASE64_LENGTH = Math.ceil(10 * 1024 * 1024 * 4 / 3); // ~10MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian vehicle registration certificates (certificat de înmatriculare / talon auto).

IMPORTANT: First, verify that the image contains a Romanian vehicle registration certificate (talon auto / certificat de înmatriculare). If the image does NOT contain this type of document (e.g. it's an ID card, passport, invoice, photo, or any other document), return ONLY this exact JSON: {"error": "WRONG_DOCUMENT_TYPE"}. Do not extract any fields if the document is not a vehicle registration certificate.

If the image IS a Romanian vehicle registration certificate, extract ALL of the following fields. Return ONLY a valid JSON object with these exact keys. If a field is not visible or readable, use an empty string "".

{
  "A": "Numărul de înmatriculare",
  "B": "Data primei înmatriculări",
  "C_1_1": "Numele sau denumirea proprietarului",
  "C_1_2": "Adresa proprietarului",
  "C_2": "Utilizatorul vehiculului",
  "D_1": "Marca vehiculului",
  "D_2": "Modelul vehiculului",
  "D_3": "Versiunea modelului",
  "E": "Seria de șasiu (VIN)",
  "F_1": "Masa maximă admisă (kg)",
  "F_2": "Masa maximă autorizată",
  "G": "Masa vehiculului gol",
  "H": "Perioada de valabilitate",
  "I": "Data eliberării certificatului",
  "J": "Categoria vehiculului",
  "K": "Numărul omologării europene",
  "P_1": "Cilindree (cmc)",
  "P_2": "Puterea motorului (kW)",
  "P_3": "Combustibilul",
  "Q": "Raport putere/masă",
  "R": "Culoarea vehiculului",
  "S_1": "Număr locuri pe scaune",
  "S_2": "Număr locuri în picioare",
  "X": "Numărul certificatului"
}

Return ONLY the JSON with the actual VALUES extracted from the document image. No markdown, no explanation, just the JSON object.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate base64 length (max ~10MB)
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Imaginea este prea mare. Dimensiunea maximă este 10MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate MIME type
    const safeMimeType = ALLOWED_MIME_TYPES.includes(mimeType) ? mimeType : "image/jpeg";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("Missing API key configuration");
      return new Response(
        JSON.stringify({ error: "Serviciul nu este configurat corect. Contactați administratorul." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Extract all fields from this Romanian vehicle registration certificate image.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${safeMimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      console.error("Upstream service error");
      return new Response(
        JSON.stringify({ error: "Serviciul este temporar indisponibil. Încearcă din nou mai târziu." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    // Parse the JSON from the response
    let parsed;
    try {
      // Try to extract JSON from the response (handle markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse response");
      parsed = {};
    }

    if (parsed?.error === "WRONG_DOCUMENT_TYPE") {
      return new Response(
        JSON.stringify({ error: "Documentul din fotografie nu este un Talon auto. Te rugăm să încarci o fotografie cu certificatul de înmatriculare." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ fields: parsed, rawResponse: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR processing error");
    return new Response(
      JSON.stringify({ error: "Eroare la procesarea documentului. Încearcă din nou." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
