export interface DocumentField {
  code: string;
  label: string;
  value: string;
}

export interface ParsedDocument {
  fields: DocumentField[];
  rawText: string;
}

const FIELD_DEFINITIONS: { code: string; label: string; patterns: RegExp[] }[] = [
  { code: "A", label: "Numărul de înmatriculare", patterns: [/\bA[.\s:]+(.+)/i] },
  { code: "B", label: "Data primei înmatriculări", patterns: [/\bB[.\s:]+(.+)/i] },
  { code: "C.1.1", label: "Numele proprietarului", patterns: [/C\.?\s*1\.?\s*1[.\s:]+(.+)/i] },
  { code: "C.1.2", label: "Adresa proprietarului", patterns: [/C\.?\s*1\.?\s*2[.\s:]+(.+)/i] },
  { code: "C.2", label: "Utilizatorul vehiculului", patterns: [/C\.?\s*2[.\s:]+(.+)/i] },
  { code: "D.1", label: "Marca vehiculului", patterns: [/D\.?\s*1[.\s:]+(.+)/i] },
  { code: "D.2", label: "Modelul vehiculului", patterns: [/D\.?\s*2[.\s:]+(.+)/i] },
  { code: "D.3", label: "Versiunea modelului", patterns: [/D\.?\s*3[.\s:]+(.+)/i] },
  { code: "E", label: "Seria de șasiu (VIN)", patterns: [/\bE[.\s:]+(.+)/i] },
  { code: "F.1", label: "Masa maximă admisă (kg)", patterns: [/F\.?\s*1[.\s:]+(.+)/i] },
  { code: "F.2", label: "Masa maximă autorizată", patterns: [/F\.?\s*2[.\s:]+(.+)/i] },
  { code: "G", label: "Masa vehiculului gol", patterns: [/\bG[.\s:]+(.+)/i] },
  { code: "H", label: "Perioada de valabilitate", patterns: [/\bH[.\s:]+(.+)/i] },
  { code: "I", label: "Data eliberării certificatului", patterns: [/\bI[.\s:]+(.+)/i] },
  { code: "J", label: "Categoria vehiculului", patterns: [/\bJ[.\s:]+(.+)/i] },
  { code: "K", label: "Numărul omologării europene", patterns: [/\bK[.\s:]+(.+)/i] },
  { code: "P.1", label: "Cilindree (cmc)", patterns: [/P\.?\s*1[.\s:]+(.+)/i] },
  { code: "P.2", label: "Puterea motorului (kW)", patterns: [/P\.?\s*2[.\s:]+(.+)/i] },
  { code: "P.3", label: "Combustibilul", patterns: [/P\.?\s*3[.\s:]+(.+)/i] },
  { code: "Q", label: "Raport putere/masă", patterns: [/\bQ[.\s:]+(.+)/i] },
  { code: "R", label: "Culoarea vehiculului", patterns: [/\bR[.\s:]+(.+)/i] },
  { code: "S.1", label: "Număr locuri pe scaune", patterns: [/S\.?\s*1[.\s:]+(.+)/i] },
  { code: "S.2", label: "Număr locuri în picioare", patterns: [/S\.?\s*2[.\s:]+(.+)/i] },
  { code: "X", label: "Numărul certificatului", patterns: [/\bX[.\s:]+(.+)/i] },
];

export function parseDocumentText(rawText: string): ParsedDocument {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const fields: DocumentField[] = [];

  for (const def of FIELD_DEFINITIONS) {
    let found = false;
    for (const line of lines) {
      for (const pattern of def.patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          fields.push({
            code: def.code,
            label: def.label,
            value: match[1].trim(),
          });
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (!found) {
      fields.push({
        code: def.code,
        label: def.label,
        value: "",
      });
    }
  }

  return { fields, rawText };
}
