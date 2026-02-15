export interface DocumentField {
  code: string;
  label: string;
  value: string;
}

export interface ParsedDocument {
  fields: DocumentField[];
}

const FIELD_MAP: Record<string, { code: string; label: string }> = {
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

export function mapApiResponse(apiFields: Record<string, string>): ParsedDocument {
  const fields: DocumentField[] = Object.entries(FIELD_MAP).map(([key, meta]) => ({
    code: meta.code,
    label: meta.label,
    value: apiFields[key]?.trim() || "",
  }));

  return { fields };
}
