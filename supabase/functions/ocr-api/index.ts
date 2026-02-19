import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian vehicle registration certificates (certificat de înmatriculare / talon auto).

Given an image of a Romanian car registration document, extract ALL of the following fields. Return ONLY a valid JSON object with these exact keys. If a field is not visible or readable, use an empty string "".

{
  "A": "Numărul de înmatriculare",
  "B": "Data primei înmatriculări",
  "C.1.1": "Numele sau denumirea proprietarului",
  "C.1.2": "Adresa proprietarului",
  "C.2": "Utilizatorul vehiculului",
  "D.1": "Marca vehiculului",
  "D.2": "Modelul vehiculului",
  "D.3": "Versiunea modelului",
  "E": "Seria de șasiu (VIN)",
  "F.1": "Masa maximă admisă (kg)",
  "F.2": "Masa maximă autorizată",
  "G": "Masa vehiculului gol",
  "H": "Perioada de valabilitate",
  "I": "Data eliberării certificatului",
  "J": "Categoria vehiculului",
  "K": "Numărul omologării europene",
  "P.1": "Cilindree (cmc)",
  "P.2": "Puterea motorului (kW)",
  "P.3": "Combustibilul",
  "Q": "Raport putere/masă",
  "R": "Culoarea vehiculului",
  "S.1": "Număr locuri pe scaune",
  "S.2": "Număr locuri în picioare",
  "X": "Numărul certificatului"
}

Return ONLY the JSON with the actual VALUES extracted from the document image. No markdown, no explanation, just the JSON object.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let imageBase64: string | null = null;
    let mimeType = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle multipart file upload
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No 'image' field in form data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      mimeType = file.type || "image/jpeg";
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      // Convert to base64
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      imageBase64 = btoa(binary);
    } else {
      // Handle JSON body
      const body = await req.json();
      imageBase64 = body.imageBase64 || body.image;
      mimeType = body.mimeType || "image/jpeg";
    }

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided. Send JSON with 'imageBase64' or multipart form with 'image' file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Processing service error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Serviciul este temporar indisponibil. Încearcă din nou mai târziu." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";

    let fields: Record<string, string> = {};
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      fields = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch {
      console.error("Failed to parse AI response:", content);
    }

    return new Response(JSON.stringify({ success: true, fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("OCR API error:", e);
    return new Response(
      JSON.stringify({ error: "Eroare la procesarea documentului. Încearcă din nou." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
