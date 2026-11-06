import { describe, it, expect } from "vitest";
import { normalizeMetadata } from "../lib/fieldMetadata";
import { mapApiResponse } from "../lib/documentParser";
import { mapIdCardResponse } from "../lib/idCardParser";

describe("field recognition metadata", () => {
  it("preserves OCR source and score for a talon field", () => {
    const result = mapApiResponse({ A: "CJ 01 ABC" }, { A: { method: "OCR", confidence: 0.8732 } });
    expect(result.fields.find(f => f.code === "A")?.metadata).toEqual({ method: "OCR", confidence: 0.8732 });
  });
  it("preserves null confidence for LLM", () => {
    const result = normalizeMetadata({ E: { method: "LLM", confidence: null } });
    expect(result.E.method).toBe("LLM"); expect(result.E.confidence).toBeNull();
  });
  it("rejects confidence outside the 0–1 interval", () => {
    expect(normalizeMetadata({ A: { method: "OCR", confidence: 87 } }).A.confidence).toBeNull();
  });
  it("derives birth date and recognition provenance from CNP", () => {
    const result = mapIdCardResponse({ CNP: "1530510400465", DATA_NASTERII: "01.01.2000" }, {
      CNP: { method: "OCR", confidence: 0.82 }, DATA_NASTERII: { method: "LLM", confidence: 1 },
    });
    const birth = result.fields.find(f => f.code === "Născut");
    expect(birth?.value).toBe("10.05.1953"); expect(birth?.metadata?.method).toBe("OCR");
    expect(birth?.metadata?.confidence).toBe(0.82);
  });
});
