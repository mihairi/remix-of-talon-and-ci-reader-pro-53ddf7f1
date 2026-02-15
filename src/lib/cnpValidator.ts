const CNP_CONTROL = "279146358279";

export interface CnpValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    sex: string;
    birthDate: string;
    county: string;
  };
}

const COUNTY_MAP: Record<string, string> = {
  "01": "Alba", "02": "Arad", "03": "Argeș", "04": "Bacău", "05": "Bihor",
  "06": "Bistrița-Năsăud", "07": "Botoșani", "08": "Brașov", "09": "Brăila",
  "10": "Buzău", "11": "Caraș-Severin", "12": "Cluj", "13": "Constanța",
  "14": "Covasna", "15": "Dâmbovița", "16": "Dolj", "17": "Galați",
  "18": "Gorj", "19": "Harghita", "20": "Hunedoara", "21": "Ialomița",
  "22": "Iași", "23": "Ilfov", "24": "Maramureș", "25": "Mehedinți",
  "26": "Mureș", "27": "Neamț", "28": "Olt", "29": "Prahova",
  "30": "Satu Mare", "31": "Sălaj", "32": "Sibiu", "33": "Suceava",
  "34": "Teleorman", "35": "Timiș", "36": "Tulcea", "37": "Vaslui",
  "38": "Vâlcea", "39": "Vrancea", "40": "București", "41": "București S.1",
  "42": "București S.2", "43": "București S.3", "44": "București S.4",
  "45": "București S.5", "46": "București S.6", "51": "Călărași", "52": "Giurgiu",
};

export function validateCnp(cnp: string): CnpValidationResult {
  const cleaned = cnp.replace(/\s/g, "");

  if (!/^\d{13}$/.test(cleaned)) {
    return { valid: false, error: "CNP-ul trebuie să conțină exact 13 cifre" };
  }

  const s = parseInt(cleaned[0]);
  if (s < 1 || s > 8) {
    return { valid: false, error: "Prima cifră (sex/secol) este invalidă" };
  }

  // Check digit
  const digits = cleaned.split("").map(Number);
  const controlDigits = CNP_CONTROL.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * controlDigits[i];
  }
  let remainder = sum % 11;
  const checkDigit = remainder === 10 ? 1 : remainder;

  if (checkDigit !== digits[12]) {
    return { valid: false, error: "Cifra de control este invalidă" };
  }

  // Extract details
  const yy = parseInt(cleaned.substring(1, 3));
  const mm = parseInt(cleaned.substring(3, 5));
  const dd = parseInt(cleaned.substring(5, 7));
  const countyCode = cleaned.substring(7, 9);

  let year: number;
  if (s === 1 || s === 2) year = 1900 + yy;
  else if (s === 3 || s === 4) year = 1800 + yy;
  else if (s === 5 || s === 6) year = 2000 + yy;
  else year = 1900 + yy; // 7,8 = residents

  const sex = s % 2 === 1 ? "Masculin" : "Feminin";
  const birthDate = `${dd.toString().padStart(2, "0")}.${mm.toString().padStart(2, "0")}.${year}`;
  const county = COUNTY_MAP[countyCode] || `Cod ${countyCode}`;

  return { valid: true, details: { sex, birthDate, county } };
}
