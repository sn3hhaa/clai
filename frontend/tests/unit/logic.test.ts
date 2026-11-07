import { describe, expect, it } from "vitest";
import { validatePdf } from "@/components/documents/uploader";
import { highlightItem } from "@/components/documents/pdf-viewer";
import { auraStateFor } from "@/lib/voice-state";
import { sourceLabel } from "@/lib/utils";

describe("auraStateFor", () => {
  it("follows the real session lifecycle", () => {
    expect(auraStateFor({ phase: "idle" })).toBe("idle");
    expect(auraStateFor({ phase: "requesting" })).toBe("connecting");
    expect(auraStateFor({ phase: "live", connection: "connecting" })).toBe("connecting");
    expect(auraStateFor({ phase: "live", connection: "reconnecting", agent: "speaking" })).toBe("connecting");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "initializing" })).toBe("connecting");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "listening" })).toBe("listening");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "thinking" })).toBe("thinking");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "speaking" })).toBe("speaking");
    expect(auraStateFor({ phase: "ending" })).toBe("ending");
    expect(auraStateFor({ phase: "ended" })).toBe("ended");
  });

  it("shows muted only while listening, and errors win", () => {
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "listening", micEnabled: false })).toBe("muted");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "speaking", micEnabled: false })).toBe("speaking");
    expect(auraStateFor({ phase: "live", connection: "connected", agent: "failed" })).toBe("error");
    expect(auraStateFor({ phase: "error" })).toBe("error");
  });
});

describe("highlightItem", () => {
  const passage = "Either party may terminate this agreement with 30 days' written notice.";

  it("marks fragments of the passage, including lines that start with a clause label", () => {
    expect(highlightItem("notice.", passage)).toContain("evidence-mark");
    // The line exactly as pdf.js renders it for the fixture (10 of 13 words covered).
    const line = "8.1 Termination for convenience. Either party may terminate this agreement with 30 days' written";
    expect(highlightItem(line, passage)).toContain("evidence-mark");
  });

  it("does not light up a neighbouring clause that shares boilerplate", () => {
    const neighbour = "8.2 Termination for cause. Either party may terminate this Agreement immediately by written";
    expect(highlightItem(neighbour, passage)).not.toContain("mark");
  });

  it("leaves unrelated text and short fragments alone, and escapes HTML", () => {
    expect(highlightItem("Late payments accrue interest", passage)).not.toContain("mark");
    expect(highlightItem("of", passage)).toBe("of");
    expect(highlightItem("<b>x</b>", null)).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("validatePdf", () => {
  const file = (name: string, size: number, type = "application/pdf") => new File([new Uint8Array(size)], name, { type });
  it("accepts PDFs within limits and explains rejections", () => {
    expect(validatePdf(file("a.pdf", 10))).toBeNull();
    expect(validatePdf(file("notes.docx", 10, "application/msword"))).toMatch(/PDF/);
    expect(validatePdf(file("a.pdf", 0))).toMatch(/empty/);
    expect(validatePdf(file("a.pdf", 21 * 1024 * 1024))).toMatch(/20 MB/);
  });
});

describe("sourceLabel", () => {
  it("formats clause, section and page ranges", () => {
    expect(sourceLabel({ clause: "8.1", page_number: 2 })).toBe("Clause 8.1 · p. 2");
    expect(sourceLabel({ clause: null, section: "Schedule A", page_number: 3, page_end: 4 })).toBe("Schedule A · pp. 3–4");
    expect(sourceLabel({ clause: null, page_number: 1 })).toBe("p. 1");
  });
});
