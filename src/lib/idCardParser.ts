import { validateCnp } from "@/lib/cnpValidator";

export interface IdCardField {
  code: string;
  label: string;
  value: string;
}

export interface ParsedIdCard {
  fields: IdCardField[];
}

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

export function mapIdCardResponse(apiFields: Record<string, string>): ParsedIdCard {
  // Derive birth date from CNP validation instead of AI response
  let cnpBirthDate = "";
  const cnpValue = apiFields["CNP"]?.trim();
  if (cnpValue) {
    const result = validateCnp(cnpValue);
    if (result.valid && result.details?.birthDate) {
      cnpBirthDate = result.details.birthDate;
    }
  }

  const fields: IdCardField[] = Object.entries(ID_FIELD_MAP).map(([key, meta]) => ({
    code: meta.code,
    label: meta.label,
    value: key === "DATA_NASTERII" ? cnpBirthDate : (apiFields[key]?.trim() || ""),
  }));

  return { fields };
}
