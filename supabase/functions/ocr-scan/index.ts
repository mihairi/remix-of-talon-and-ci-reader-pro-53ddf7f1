import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompts (same as frontend) ──────────────────────────────────────

const TALON_SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian vehicle registration certificates (certificat de înmatriculare / talon auto).

IMPORTANT: First, verify that the image contains a Romanian vehicle registration certificate (talon auto / certificat de înmatriculare). If the image does NOT contain this type of document, return ONLY this exact JSON: {"error": "WRONG_DOCUMENT_TYPE"}.

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

const ID_CARD_SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian identity cards (carte de identitate / buletin de identitate) in both old and new formats.

IMPORTANT: First, verify that the image contains a Romanian identity card. If the image does NOT contain this type of document, return ONLY this exact JSON: {"error": "WRONG_DOCUMENT_TYPE"}.

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
1. The DATA_NASTERII (date of birth) MUST be extracted from the MRZ line, NOT from the visible text on the card.
2. Always read and include the full MRZ string in the MRZ field.

Return ONLY the JSON with the actual VALUES extracted from the document image. No markdown, no explanation, just the JSON object.`;

// ── Field maps (same as frontend parsers) ───────────────────────────

const TALON_FIELD_MAP: Record<string, { code: string; label: string }> = {
  A: { code: "A", label: "Numărul de înmatriculare" },
  B: { code: "B", label: "Data primei înmatriculări" },
  C_1_1: { code: "C.1.1", label: "Numele proprietarului" },
  C_1_2: { code: "C.1.2", label: "Adresa proprietarului" },
  C_2: { code: "C.2", label: "Utilizatorul vehiculului" },
  D_1: { code: "D.1", label: "Marca vehiculului" },
  D_2: { code: "D.2", label: "Modelul vehiculului" },
  D_3: { code: "D.3", label: "Versiunea modelului" },
  E: { code: "E", label: "Seria de șasiu (VIN)" },
  F_1: { code: "F.1", label: "Masa maximă admisă (kg)" },
  F_2: { code: "F.2", label: "Masa maximă autorizată" },
  G: { code: "G", label: "Masa vehiculului gol" },
  H: { code: "H", label: "Perioada de valabilitate" },
  I: { code: "I", label: "Data eliberării certificatului" },
  J: { code: "J", label: "Categoria vehiculului" },
  K: { code: "K", label: "Numărul omologării europene" },
  P_1: { code: "P.1", label: "Cilindree (cmc)" },
  P_2: { code: "P.2", label: "Puterea motorului (kW)" },
  P_3: { code: "P.3", label: "Combustibilul" },
  Q: { code: "Q", label: "Raport putere/masă" },
  R: { code: "R", label: "Culoarea vehiculului" },
  S_1: { code: "S.1", label: "Număr locuri pe scaune" },
  S_2: { code: "S.2", label: "Număr locuri în picioare" },
  X: { code: "X", label: "Numărul certificatului" },
};

const ID_FIELD_MAP: Record<string, { code: string; label: string }> = {
  SERIA_NR: { code: "Seria/Nr", label: "Seria și numărul" },
  CNP: { code: "CNP", label: "Codul numeric personal" },
  NUME: { code: "Nume", label: "Numele de familie" },
  PRENUME: { code: "Prenume", label: "Prenumele" },
  SEX: { code: "Sex", label: "Sexul" },
  CETATENIE: { code: "Cetățenie", label: "Cetățenia" },
  DATA_NASTERII: { code: "Născut", label: "Data nașterii" },
  LOCUL_NASTERII: { code: "Loc naștere", label: "Locul nașterii" },
  DOMICILIU_JUDET: { code: "Județ", label: "Județul de domiciliu" },
  DOMICILIU_LOCALITATE: { code: "Localitate", label: "Localitatea" },
  DOMICILIU_STRADA: { code: "Strada", label: "Strada" },
  DOMICILIU_NR: { code: "Nr.", label: "Numărul" },
  DOMICILIU_BLOC: { code: "Bloc", label: "Blocul" },
  DOMICILIU_SCARA: { code: "Scara", label: "Scara" },
  DOMICILIU_ETAJ: { code: "Etaj", label: "Etajul" },
  DOMICILIU_AP: { code: "Ap.", label: "Apartamentul" },
  EMITENT: { code: "Emitent", label: "Emitentul (SPCLEP)" },
  DATA_ELIBERARII: { code: "Eliberat", label: "Data eliberării" },
  DATA_EXPIRARII: { code: "Expiră", label: "Data expirării" },
  MRZ: { code: "MRZ", label: "Machine Readable Zone" },
};

// ── CNP validator (server-side) ─────────────────────────────────────

function extractBirthDateFromCnp(cnp: string): string {
  if (cnp.length !== 13) return "";
  const s = parseInt(cnp[0]);
  const yy = cnp.substring(1, 3);
  const mm = cnp.substring(3, 5);
  const dd = cnp.substring(5, 7);
  let century: string;
  if (s === 1 || s === 2) century = "19";
  else if (s === 3 || s === 4) century = "18";
  else if (s === 5 || s === 6) century = "20";
  else return "";
  return `${dd}.${mm}.${century}${yy}`;
}

// ── AI call via Lovable AI ──────────────────────────────────────────

async function callVisionAI(
  base64Image: string,
  mimeType: string,
  docType: "talon" | "id-card"
): Promise<Record<string, string>> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const systemPrompt = docType === "talon" ? TALON_SYSTEM_PROMPT : ID_CARD_SYSTEM_PROMPT;
  const userText =
    docType === "talon"
      ? "Extract all fields from this Romanian vehicle registration certificate image."
      : "Extract all fields from this Romanian identity card (carte de identitate) image.";

  const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`AI service error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  const content: string = result?.choices?.[0]?.message?.content || "";

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("AI response did not contain valid JSON");

  const parsed = JSON.parse(jsonMatch[0]);

  if (parsed?.error === "WRONG_DOCUMENT_TYPE") {
    throw new Error(
      docType === "talon"
        ? "Document is not a vehicle registration certificate (talon auto)."
        : "Document is not a Romanian identity card (carte de identitate)."
    );
  }

  return parsed;
}

// ── Map raw fields to structured response ───────────────────────────

function mapFields(
  raw: Record<string, string>,
  docType: "talon" | "id-card"
): { code: string; label: string; value: string }[] {
  const fieldMap = docType === "talon" ? TALON_FIELD_MAP : ID_FIELD_MAP;

  // For id-card, derive birth date from CNP
  let cnpBirthDate = "";
  if (docType === "id-card" && raw["CNP"]) {
    cnpBirthDate = extractBirthDateFromCnp(raw["CNP"].trim());
  }

  return Object.entries(fieldMap).map(([key, meta]) => ({
    code: meta.code,
    label: meta.label,
    value:
      docType === "id-card" && key === "DATA_NASTERII"
        ? cnpBirthDate
        : raw[key]?.trim() || "",
  }));
}

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── API Key authentication ──
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    const validKey = Deno.env.get("OCR_API_KEY");
    if (!validKey || apiKey !== validKey) {
      return new Response(
        JSON.stringify({ error: "Acces neautorizat. API key invalid sau lipsă." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    let docType: "talon" | "id-card" = "talon";
    let fileBytes: Uint8Array;
    let mimeType: string;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const docTypeParam = formData.get("docType") as string | null;
      if (docTypeParam === "id-card") docType = "id-card";

      const file = formData.get("file") as File | null;
      if (!file) {
        return new Response(
          JSON.stringify({ error: "Missing 'file' in form data" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      mimeType = file.type || "image/jpeg";
      fileBytes = new Uint8Array(await file.arrayBuffer());
    } else if (contentType.includes("application/json")) {
      const body = await req.json();
      docType = body.docType === "id-card" ? "id-card" : "talon";

      if (!body.file || !body.mimeType) {
        return new Response(
          JSON.stringify({ error: "Missing 'file' (base64) and 'mimeType' in JSON body" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      mimeType = body.mimeType;
      fileBytes = Uint8Array.from(atob(body.file), (c) => c.charCodeAt(0));
    } else {
      return new Response(
        JSON.stringify({ error: "Unsupported content type. Use multipart/form-data or application/json." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Convert bytes to base64
    const base64 = btoa(String.fromCharCode(...fileBytes));

    // Call vision AI
    const rawFields = await callVisionAI(base64, mimeType, docType);
    const fields = mapFields(rawFields, docType);

    return new Response(
      JSON.stringify({ docType, fields, raw: rawFields }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("OCR Scan Error:", err);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
