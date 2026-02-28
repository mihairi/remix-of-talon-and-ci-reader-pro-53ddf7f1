import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://scanner-local.lovable.app",
  "https://id-preview--aa22da47-3ed0-40d3-82d9-a2a3eee45ce7.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

async function authenticateRequest(req: Request, corsHeaders: Record<string, string>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { userId: data.claims.sub };
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE * 4 / 3);
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian identity cards (carte de identitate / buletin de identitate) in both old and new formats.

IMPORTANT: First, verify that the image contains a Romanian identity card (carte de identitate / CI / buletin). If the image does NOT contain this type of document (e.g. it's a vehicle registration certificate, passport, invoice, photo, or any other document), return ONLY this exact JSON: {"error": "WRONG_DOCUMENT_TYPE"}. Do not extract any fields if the document is not a Romanian identity card.

If the image IS a Romanian identity card, extract ALL of the following fields. Return ONLY a valid JSON object with these exact keys. If a field is not visible or readable, use an empty string "".

{
  "SERIA_NR": "Seria și numărul cărții de identitate",
  "CNP": "Codul numeric personal",
  "NUME": "Numele de familie",
  "PRENUME": "Prenumele",
  "SEX": "Sexul (M/F)",
  "CETATENIE": "Cetățenia",
  "DATA_NASTERII": "Data nașterii",
  "LOCUL_NASTERII": "Locul nașterii",
  "DOMICILIU_JUDET": "Județul",
  "DOMICILIU_LOCALITATE": "Localitatea",
  "DOMICILIU_STRADA": "Strada",
  "DOMICILIU_NR": "Numărul",
  "DOMICILIU_BLOC": "Blocul",
  "DOMICILIU_SCARA": "Scara",
  "DOMICILIU_ETAJ": "Etajul",
  "DOMICILIU_AP": "Apartamentul",
  "EMITENT": "Emitentul (SPCLEP)",
  "DATA_ELIBERARII": "Data eliberării",
  "DATA_EXPIRARII": "Data expirării",
  "MRZ": "Machine Readable Zone (if visible)"
}

IMPORTANT RULES:
1. The DATA_NASTERII (date of birth) MUST be extracted from the MRZ line, NOT from the visible text on the card. In the MRZ, the birth date is encoded as YYMMDD starting at position 29 (after the document number and check digit). For example, if the MRZ contains "530510", the birth date is "10.05.1953". Format the date as DD.MM.YYYY.
2. To determine the century: if YY > 50, the year is 19YY; if YY <= 50, the year is 20YY.
3. Always read and include the full MRZ string in the MRZ field.

Return ONLY the JSON with the actual VALUES extracted from the document image. No markdown, no explanation, just the JSON object.`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await authenticateRequest(req, corsHeaders);
  if (auth.error) return auth.error;

  try {
    let imageBase64: string | null = null;
    let mimeType = "image/jpeg";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: "No 'image' field in form data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({ error: "File too large. Maximum 10MB." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      mimeType = ALLOWED_MIME_TYPES.includes(file.type) ? file.type : "image/jpeg";
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      imageBase64 = btoa(binary);
    } else {
      const body = await req.json();
      imageBase64 = body.imageBase64 || body.image;
      mimeType = ALLOWED_MIME_TYPES.includes(body.mimeType) ? body.mimeType : "image/jpeg";
    }

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(JSON.stringify({ error: "No image provided. Send JSON with 'imageBase64' or multipart form with 'image' file." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return new Response(JSON.stringify({ error: "Image data too large. Maximum 10MB." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
                  text: "Extract all fields from this Romanian identity card (carte de identitate) image.",
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
      console.error("Upstream service error");
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
      console.error("Failed to parse response");
    }

    if ((fields as Record<string, string>)?.error === "WRONG_DOCUMENT_TYPE") {
      return new Response(
        JSON.stringify({ error: "Documentul din fotografie nu este o Carte de identitate. Te rugăm să încarci o fotografie cu cartea de identitate." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, fields }), {
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
