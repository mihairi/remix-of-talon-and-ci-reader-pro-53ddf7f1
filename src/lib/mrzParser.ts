/**
 * MRZ (Machine Readable Zone) parser for Romanian ID cards (TD1 format).
 * Extracts and cross-checks name, CNP, dates with OCR-extracted data.
 */

export interface MrzData {
  documentType: string;
  countryCode: string;
  documentNumber: string;
  birthDate: string;       // DD.MM.YYYY
  sex: string;             // M or F
  expiryDate: string;      // DD.MM.YYYY
  nationality: string;
  surname: string;
  givenNames: string;
  cnp: string;
  valid: boolean;
  errors: string[];
}

/** Check digit calculator per ICAO 9303 */
function computeCheckDigit(input: string): number {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    let val: number;
    if (ch >= "0" && ch <= "9") {
      val = parseInt(ch);
    } else if (ch >= "A" && ch <= "Z") {
      val = ch.charCodeAt(0) - 55; // A=10, B=11, ...
    } else {
      val = 0; // < and fillers
    }
    sum += val * weights[i % 3];
  }
  return sum % 10;
}

/** Parse MRZ date (YYMMDD) to DD.MM.YYYY */
function parseMrzDate(yymmdd: string, centuryThreshold: number = 30): string {
  if (!/^\d{6}$/.test(yymmdd)) return "";
  const yy = parseInt(yymmdd.substring(0, 2));
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const year = yy > centuryThreshold ? 1900 + yy : 2000 + yy;
  return `${dd}.${mm}.${year}`;
}

/** Clean MRZ text: normalize common OCR mistakes */
function cleanMrzLine(line: string): string {
  return line
    .replace(/\s/g, "")
    .replace(/[oO]/g, "0")  // O → 0 in positions that should be digits
    .toUpperCase();
}

/** Extract name from MRZ (replace < with spaces, trim) */
function parseMrzName(raw: string): { surname: string; givenNames: string } {
  const parts = raw.split("<<");
  const surname = (parts[0] || "").replace(/</g, " ").trim();
  const givenNames = (parts[1] || "").replace(/</g, " ").trim();
  return { surname, givenNames };
}

/**
 * Parse a Romanian TD1 MRZ (3 lines of 30 characters each).
 * Also handles 2-line TD3 format if detected.
 */
export function parseMrz(mrzRaw: string): MrzData | null {
  if (!mrzRaw || mrzRaw.trim().length < 30) return null;

  const lines = mrzRaw
    .split(/[\n\r]+/)
    .map((l) => cleanMrzLine(l))
    .filter((l) => l.length >= 28);

  const errors: string[] = [];

  // TD1 format (Romanian CI): 3 lines of 30 chars
  if (lines.length >= 3 && lines[0].length >= 30) {
    const line1 = lines[0].padEnd(30, "<");
    const line2 = lines[1].padEnd(30, "<");
    const line3 = lines[2].padEnd(30, "<");

    const documentType = line1.substring(0, 2).replace(/</g, "");
    const countryCode = line1.substring(2, 5).replace(/</g, "");
    const documentNumber = line1.substring(5, 14).replace(/</g, "");
    const docCheckDigit = parseInt(line1[14]) || 0;

    // Optional data on line1 (15-29) often contains part of CNP
    const optionalData1 = line1.substring(15, 30).replace(/</g, "");

    // Line 2
    const birthDateRaw = line2.substring(0, 6);
    const birthCheckDigit = parseInt(line2[6]) || 0;
    const sex = line2[7] === "F" ? "F" : "M";
    const expiryDateRaw = line2.substring(8, 14);
    const expiryCheckDigit = parseInt(line2[14]) || 0;
    const nationality = line2.substring(15, 18).replace(/</g, "");
    const optionalData2 = line2.substring(18, 29).replace(/</g, "");
    // const compositeCheckDigit = parseInt(line2[29]) || 0;

    // Line 3: name
    const { surname, givenNames } = parseMrzName(line3);

    // Validate check digits
    if (computeCheckDigit(line1.substring(5, 14)) !== docCheckDigit) {
      errors.push("Document number check digit mismatch");
    }
    if (computeCheckDigit(birthDateRaw) !== birthCheckDigit) {
      errors.push("Birth date check digit mismatch");
    }
    if (computeCheckDigit(expiryDateRaw) !== expiryCheckDigit) {
      errors.push("Expiry date check digit mismatch");
    }

    // CNP: try optionalData1 or optionalData2 (Romanian CI stores CNP in optional data)
    let cnp = "";
    const cnpCandidate1 = optionalData1.replace(/\D/g, "");
    const cnpCandidate2 = optionalData2.replace(/\D/g, "");
    if (cnpCandidate1.length === 13) cnp = cnpCandidate1;
    else if (cnpCandidate2.length === 13) cnp = cnpCandidate2;
    else if ((cnpCandidate1 + cnpCandidate2).length === 13) cnp = cnpCandidate1 + cnpCandidate2;

    const birthDate = parseMrzDate(birthDateRaw, 30);
    const expiryDate = parseMrzDate(expiryDateRaw, 60);

    return {
      documentType,
      countryCode,
      documentNumber,
      birthDate,
      sex,
      expiryDate,
      nationality,
      surname,
      givenNames,
      cnp,
      valid: errors.length === 0,
      errors,
    };
  }

  // TD3 format (2 lines of 44 chars) - fallback
  if (lines.length >= 2 && lines[0].length >= 44) {
    const line1 = lines[0].padEnd(44, "<");
    const line2 = lines[1].padEnd(44, "<");

    const documentType = line1.substring(0, 2).replace(/</g, "");
    const countryCode = line1.substring(2, 5).replace(/</g, "");
    const { surname, givenNames } = parseMrzName(line1.substring(5));

    const documentNumber = line2.substring(0, 9).replace(/</g, "");
    const nationality = line2.substring(10, 13).replace(/</g, "");
    const birthDateRaw = line2.substring(13, 19);
    const sex = line2[20] === "F" ? "F" : "M";
    const expiryDateRaw = line2.substring(21, 27);

    return {
      documentType,
      countryCode,
      documentNumber,
      birthDate: parseMrzDate(birthDateRaw, 30),
      sex,
      expiryDate: parseMrzDate(expiryDateRaw, 60),
      nationality,
      surname,
      givenNames,
      cnp: "",
      valid: errors.length === 0,
      errors,
    };
  }

  return null;
}

/**
 * Cross-check and merge OCR-extracted fields with MRZ data.
 * MRZ data is preferred for structured fields (name, CNP, dates).
 */
export function crossCheckWithMrz(
  ocrFields: Record<string, string>,
  mrzData: MrzData
): { corrected: Record<string, string>; corrections: string[] } {
  const corrected = { ...ocrFields };
  const corrections: string[] = [];

  // CNP cross-check
  if (mrzData.cnp && mrzData.cnp.length === 13) {
    const ocrCnp = (ocrFields["CNP"] || "").replace(/\s/g, "");
    if (ocrCnp !== mrzData.cnp) {
      corrections.push(`CNP corectat: "${ocrCnp}" → "${mrzData.cnp}" (din MRZ)`);
      corrected["CNP"] = mrzData.cnp;
    }
  }

  // Name cross-check
  if (mrzData.surname) {
    const ocrName = (ocrFields["NUME"] || "").toUpperCase().trim();
    const mrzName = mrzData.surname.toUpperCase().trim();
    if (ocrName && ocrName !== mrzName && levenshtein(ocrName, mrzName) <= 3) {
      corrections.push(`Nume corectat: "${ocrFields["NUME"]}" → "${capitalize(mrzData.surname)}" (din MRZ)`);
      corrected["NUME"] = capitalize(mrzData.surname);
    } else if (!ocrName && mrzName) {
      corrections.push(`Nume completat din MRZ: "${capitalize(mrzData.surname)}"`);
      corrected["NUME"] = capitalize(mrzData.surname);
    }
  }

  if (mrzData.givenNames) {
    const ocrPrenume = (ocrFields["PRENUME"] || "").toUpperCase().trim();
    const mrzPrenume = mrzData.givenNames.toUpperCase().trim();
    if (ocrPrenume && ocrPrenume !== mrzPrenume && levenshtein(ocrPrenume, mrzPrenume) <= 3) {
      corrections.push(`Prenume corectat: "${ocrFields["PRENUME"]}" → "${capitalize(mrzData.givenNames)}" (din MRZ)`);
      corrected["PRENUME"] = capitalize(mrzData.givenNames);
    } else if (!ocrPrenume && mrzPrenume) {
      corrections.push(`Prenume completat din MRZ: "${capitalize(mrzData.givenNames)}"`);
      corrected["PRENUME"] = capitalize(mrzData.givenNames);
    }
  }

  // Sex cross-check
  if (mrzData.sex) {
    const ocrSex = (ocrFields["SEX"] || "").toUpperCase().trim();
    if (ocrSex && ocrSex !== mrzData.sex) {
      corrections.push(`Sex corectat: "${ocrSex}" → "${mrzData.sex}" (din MRZ)`);
      corrected["SEX"] = mrzData.sex;
    } else if (!ocrSex) {
      corrected["SEX"] = mrzData.sex;
    }
  }

  // Expiry date cross-check
  if (mrzData.expiryDate) {
    const ocrExpiry = (ocrFields["DATA_EXPIRARII"] || "").trim();
    if (ocrExpiry && ocrExpiry !== mrzData.expiryDate) {
      corrections.push(`Data expirării corectată: "${ocrExpiry}" → "${mrzData.expiryDate}" (din MRZ)`);
      corrected["DATA_EXPIRARII"] = mrzData.expiryDate;
    } else if (!ocrExpiry) {
      corrected["DATA_EXPIRARII"] = mrzData.expiryDate;
    }
  }

  // Birth date from MRZ (secondary check; CNP validation is primary)
  if (mrzData.birthDate) {
    const ocrBirth = (ocrFields["DATA_NASTERII"] || "").trim();
    if (!ocrBirth) {
      corrected["DATA_NASTERII"] = mrzData.birthDate;
      corrections.push(`Data nașterii completată din MRZ: "${mrzData.birthDate}"`);
    }
  }

  // Document number / series
  if (mrzData.documentNumber) {
    const ocrSeria = (ocrFields["SERIA_NR"] || "").replace(/\s/g, "").toUpperCase();
    const mrzDoc = mrzData.documentNumber.toUpperCase();
    if (ocrSeria && ocrSeria !== mrzDoc && levenshtein(ocrSeria, mrzDoc) <= 2) {
      corrections.push(`Seria/Nr corectat: "${ocrFields["SERIA_NR"]}" → "${mrzData.documentNumber}" (din MRZ)`);
      corrected["SERIA_NR"] = mrzData.documentNumber;
    }
  }

  return { corrected, corrections };
}

/** Simple Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Capitalize first letter of each word */
function capitalize(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
