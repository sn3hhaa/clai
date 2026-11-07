import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Aura, type AuraState } from "@/components/voice/aura";
import { EvidencePanel } from "@/components/talk/evidence-panel";
import { SocialLinks } from "@/components/shared/social-icons";
import type { AnswerOut } from "@/lib/api/types";

describe("Aura", () => {
  it.each<AuraState>(["idle", "connecting", "listening", "thinking", "speaking", "muted", "ended", "error"])(
    "renders an accessible canvas for %s",
    (state) => {
      render(<Aura state={state} />);
      const canvas = screen.getByRole("img", { name: `Clai voice: ${state}` });
      expect(canvas).toHaveAttribute("data-state", state);
    },
  );
});

const answer: AnswerOut = {
  conversation_id: "c",
  message_id: "m",
  question: "What is the termination notice period?",
  resolved_question: "What is the termination notice period?",
  intent: "termination",
  answer: "Clause 8.1 (page 2) says: “Either party may terminate this agreement with 30 days' written notice.”",
  spoken_answer: "According to clause 8.1, either party may terminate with 30 days' written notice.",
  key_points: [],
  citations: ["d-c0017"],
  evidence: [
    { chunk_id: "d-c0017", page_number: 2, page_end: 2, section: "8. Termination", clause: "8.1", heading: "Termination for convenience", text: "Either party may terminate this agreement with 30 days' written notice.", score: 0.97, cited: true },
    { chunk_id: "d-c0018", page_number: 2, page_end: 2, section: "8. Termination", clause: "8.2", heading: "Termination for cause", text: "…within 10 days…", score: 0.6, cited: false },
  ],
  claims: [],
  grounding: "grounded",
  sufficient: true,
  generation: "extractive",
  retrieval_rounds: 1,
  timings_ms: { total: 120 },
};

describe("EvidencePanel", () => {
  it("shows the answer, grounding and cited source, and navigates on click", () => {
    const onShow = vi.fn();
    render(<EvidencePanel answer={answer} onShow={onShow} activeChunk={null} />);
    expect(screen.getByText(/^Clause 8\.1 \(page 2\) says/)).toBeInTheDocument();
    expect(screen.getAllByText(/30 days. written notice/)).toHaveLength(2); // answer + cited passage
    expect(screen.getByText("grounded")).toBeInTheDocument();
    screen.getByRole("button", { name: "Show Clause 8.1 · p. 2 in the document" }).click();
    expect(onShow).toHaveBeenCalledWith(answer.evidence[0]);
    expect(screen.getByText("Also retrieved")).toBeInTheDocument();
  });

  it("warns when the agreement does not answer", () => {
    render(<EvidencePanel answer={{ ...answer, grounding: "insufficient", sufficient: false }} onShow={() => {}} activeChunk={null} />);
    expect(screen.getByText(/doesn't appear to answer this/)).toBeInTheDocument();
  });
});

describe("SocialLinks", () => {
  it("renders only verified links, opened safely", () => {
    render(<SocialLinks />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.getAttribute("aria-label"))).toEqual(["GitHub"]);
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
  });
});
