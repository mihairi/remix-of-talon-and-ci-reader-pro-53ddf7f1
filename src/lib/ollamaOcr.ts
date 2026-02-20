import { OllamaSettings } from "./ollamaSettings";

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

export async function runOllamaOcr(
  file: File,
  docType: "talon" | "id-card",
  settings: OllamaSettings
): Promise<Record<string, string>> {
  const imageBase64 = await fileToBase64(file);
  const systemPrompt = docType === "talon" ? TALON_SYSTEM_PROMPT : ID_CARD_SYSTEM_PROMPT;
  const userText =
    docType === "talon"
      ? "Extract all fields from this Romanian vehicle registration certificate image."
      : "Extract all fields from this Romanian identity card (carte de identitate) image.";

  const url = `${settings.baseUrl.replace(/\/$/, "")}/api/chat`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: userText,
            images: [imageBase64],
          },
        ],
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Nu s-a putut conecta la Ollama (${settings.baseUrl}). Asigurați-vă că Ollama rulează local și că CORS este activat (OLLAMA_ORIGINS=*).`
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Ollama a returnat eroarea ${response.status}: ${text}`);
  }

  const result = await response.json();
  const content: string = result?.message?.content || "";

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

  return parsed;
}
