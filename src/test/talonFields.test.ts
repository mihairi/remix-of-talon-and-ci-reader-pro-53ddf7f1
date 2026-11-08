import { describe, it, expect } from "vitest";
import { mapApiResponse } from "../lib/documentParser";
import { normalizeMetadata } from "../lib/fieldMetadata";

describe("talon field contract", () => {
  it("separates registration, issue, CIV, certificate and next inspection", () => {
    const parsed = mapApiResponse({ I: "04.02.2020", I_1: "05.02.2020", X: "AB654321", Y: "CD654321", NR_CERTIFICAT: "A12345678", DATA_URMATOAREI_ITP: "03.08.2027" });
    for (const [code, value] of [["I", "04.02.2020"], ["I1", "05.02.2020"], ["X", "AB654321"], ["Y", "CD654321"], ["Nr. certificat", "A12345678"], ["ITP", "03.08.2027"]]) {
      expect(parsed.fields.find(f => f.code === code)?.value).toBe(value);
    }
  });
  it("retains cross-page comparison and null model score", () => {
    const metadata = normalizeMetadata({ NR_CERTIFICAT: { method: "OCR", confidence: .9, comparison: "matched-all-pages", pages: [1, 2, 3] }, DATA_URMATOAREI_ITP: { method: "LLM", confidence: null } });
    expect(metadata.NR_CERTIFICAT.pages).toEqual([1, 2, 3]);
    expect(metadata.NR_CERTIFICAT.comparison).toBe("matched-all-pages");
    expect(metadata.DATA_URMATOAREI_ITP.confidence).toBeNull();
  });
});