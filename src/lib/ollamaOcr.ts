import { OllamaSettings } from "./ollamaSettings";
import { preprocessImage } from "./imagePreprocess";
import { parseMrz, crossCheckWithMrz } from "./mrzParser";

const TALON_SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian vehicle registration certificates (certificat de înmatriculare / talon auto).

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

const ID_CARD_SYSTEM_PROMPT = `You are an expert OCR system specialized in reading Romanian identity cards (carte de identitate / buletin de identitate) in both old and new formats.

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
1. The DATA_NASTERII (date of birth) MUST be extracted from the MRZ line, NOT from the visible text on the card.
2. Always read and include the full MRZ string in the MRZ field.

Return ONLY the JSON with the actual VALUES extracted from the document image. No markdown, no explanation, just the JSON object.`;

const TALON_TEXT_SYSTEM_PROMPT = `You are an expert at structuring Romanian vehicle registration certificate data.
You will receive raw OCR text extracted from a Romanian vehicle registration certificate (talon auto).
Extract and return ONLY a valid JSON object with these exact keys. If a field is not found, use "".

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

Return ONLY the JSON. No markdown, no explanation.`;

const ID_CARD_TEXT_SYSTEM_PROMPT = `You are an expert at structuring Romanian identity card data.
You will receive raw OCR text extracted from a Romanian identity card (carte de identitate).
Extract and return ONLY a valid JSON object with these exact keys. If a field is not found, use "".

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

Return ONLY the JSON. No markdown, no explanation.`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function callLlm(
  settings: OllamaSettings,
  systemPrompt: string,
  userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
  images?: string[]
): Promise<string> {
  const base = settings.baseUrl.replace(/\/$/, "");
  const isOpenAI = settings.apiFormat === "openai-compatible";
  const url = isOpenAI ? `${base}/v1/chat/completions` : `${base}/api/chat`;

  const userMessage = isOpenAI
    ? { role: "user" as const, content: userContent }
    : {
        role: "user" as const,
        content: typeof userContent === "string" ? userContent : (userContent as any[]).find((c: any) => c.type === "text")?.text || "",
        ...(images ? { images } : {}),
      };

  const body = {
    model: isOpenAI ? settings.model : settings.model,
    stream: false,
    messages: [
      { role: "system", content: systemPrompt },
      userMessage,
    ],
  };

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new Error(
      "Nu s-a putut conecta la serverul local. Asigurați-vă că serverul rulează și că CORS este activat."
    );
  }

  if (!response.ok) {
    throw new Error("Serverul local a returnat o eroare. Verificați configurația și încercați din nou.");
  }

  const result = await response.json();
  return isOpenAI
    ? result?.choices?.[0]?.message?.content || ""
    : result?.message?.content || "";
}

async function callLlmWithModel(
  settings: OllamaSettings,
  modelOverride: string,
  systemPrompt: string,
  userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>,
  images?: string[]
): Promise<string> {
  return callLlm({ ...settings, model: modelOverride }, systemPrompt, userContent, images);
}

async function runOcrPreprocess(
  file: File,
  settings: OllamaSettings
): Promise<string> {
  const imageBase64 = await fileToBase64(file);
  const isOpenAI = settings.apiFormat === "openai-compatible";

  const ocrPrompt = "Extract ALL text from this document image exactly as it appears. Include every character, number, date, and label visible. Return only the raw text, no JSON, no formatting.";

  const userContent = isOpenAI
    ? [
        { type: "text" as const, text: ocrPrompt },
        { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ]
    : ocrPrompt;

  const images = isOpenAI ? undefined : [imageBase64];

  return callLlmWithModel(
    settings,
    settings.ocrPreprocess.model,
    "You are a precise OCR engine. Extract all visible text from the image exactly as it appears.",
    userContent,
    images
  );
}

export async function runOllamaOcr(
  file: File,
  docType: "talon" | "id-card",
  settings: OllamaSettings
): Promise<Record<string, string>> {
  const usePreprocess = settings.ocrPreprocess.enabled;

  let content: string;

  if (usePreprocess) {
    // Step 1: OCR with dedicated model
    const rawText = await runOcrPreprocess(file, settings);
    console.log("OCR Preprocess raw text:", rawText);

    // Step 2: Structure with LLM (text-only, no image)
    const systemPrompt = docType === "talon" ? TALON_TEXT_SYSTEM_PROMPT : ID_CARD_TEXT_SYSTEM_PROMPT;
    const userText = `Here is the raw OCR text extracted from a Romanian ${docType === "talon" ? "vehicle registration certificate" : "identity card"}:\n\n${rawText}\n\nStructure this into the required JSON format.`;

    content = await callLlm(settings, systemPrompt, userText);
  } else {
    // Single-step: vision model
    const imageBase64 = await fileToBase64(file);
    const systemPrompt = docType === "talon" ? TALON_SYSTEM_PROMPT : ID_CARD_SYSTEM_PROMPT;
    const userText = docType === "talon"
      ? "Extract all fields from this Romanian vehicle registration certificate image."
      : "Extract all fields from this Romanian identity card (carte de identitate) image.";

    const isOpenAI = settings.apiFormat === "openai-compatible";
    const userContent = isOpenAI
      ? [
          { type: "text" as const, text: userText },
          { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]
      : userText;

    const images = isOpenAI ? undefined : [imageBase64];

    content = await callLlm(settings, systemPrompt, userContent, images);
  }

  let parsed: Record<string, string> = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch {
    throw new Error("Răspunsul modelului nu a putut fi interpretat ca JSON.");
  }

  if (parsed?.error === "WRONG_DOCUMENT_TYPE") {
    const msg =
      docType === "talon"
        ? "Documentul din fotografie nu este un Talon auto. Te rugăm să încarci o fotografie cu certificatul de înmatriculare."
        : "Documentul din fotografie nu este o Carte de identitate. Te rugăm să încarci o fotografie cu cartea de identitate.";
    throw new Error(msg);
  }

  // MRZ cross-check for ID cards
  if (docType === "id-card" && parsed["MRZ"]) {
    console.log("[OCR] Attempting MRZ cross-check...");
    const mrzData = parseMrz(parsed["MRZ"]);
    if (mrzData) {
      console.log("[OCR] MRZ parsed:", mrzData);
      const { corrected, corrections } = crossCheckWithMrz(parsed, mrzData);
      if (corrections.length > 0) {
        console.log("[OCR] MRZ corrections applied:", corrections);
      } else {
        console.log("[OCR] MRZ cross-check: no corrections needed");
      }
      return corrected;
    } else {
      console.log("[OCR] MRZ could not be parsed, skipping cross-check");
    }
  }

  return parsed;
}
