import { describe, it, expect } from "vitest";
import { mapApiResponse } from "../lib/documentParser";
import { normalizeMetadata } from "../lib/fieldMetadata";

describe("talon field contract", () => {
  it("separates registration, issue, CIV, certificate and next inspection", () => {
    const parsed = mapApiResponse({ I: "04.02.2020", I_1: "05.02.2020", X: "AB654321", Y: "CD654321", NR_CERTIFICAT: "A12345678", DATA_URMATOAREI_ITP: "03.08.2027" });
    for (const [code, value] of [["I", "04.02.2020"], ["I1", "05.02.2020"], ["X/Y", "AB654321"], ["Nr. certificat", "A12345678"], ["ITP", "03.08.2027"]]) {
      expect(parsed.fields.find(f => f.code === code)?.value).toBe(value);
    }
  });
  it("shows the CIV series from Y when X is empty", () => {
    const parsed = mapApiResponse({ Y: "N811265", NR_CERTIFICAT: "P00809979H", DATA_URMATOAREI_ITP: "30.10.2026" },
      { Y: { method: "OCR", confidence: 0.9985 } });
    const civ = parsed.fields.find(f => f.code === "X/Y");
    expect(civ?.value).toBe("N811265");
    expect(civ?.metadata?.confidence).toBe(0.9985);
    expect(parsed.fields.find(f => f.code === "Nr. certificat")?.value).toBe("P00809979H");
    expect(parsed.fields.find(f => f.code === "ITP")?.value).toBe("30.10.2026");
  });
  it("retains cross-page comparison and null model score", () => {
    const metadata = normalizeMetadata({ NR_CERTIFICAT: { method: "OCR", confidence: .9, comparison: "matched-all-pages", pages: [1, 2, 3] }, DATA_URMATOAREI_ITP: { method: "LLM", confidence: null } });
    expect(metadata.NR_CERTIFICAT.pages).toEqual([1, 2, 3]);
    expect(metadata.NR_CERTIFICAT.comparison).toBe("matched-all-pages");
    expect(metadata.DATA_URMATOAREI_ITP.confidence).toBeNull();
  });
});