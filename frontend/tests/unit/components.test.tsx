import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Aura, type AuraState } from "@/components/voice/aura";
import { Conversation } from "@/components/talk/conversation";
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

describe("Conversation", () => {
  it("shows a grounded answer with a citation chip that opens the source", () => {
    const onCite = vi.fn();
    render(<Conversation turns={[{ id: "1", question: answer.question, answer, via: "text" }]} onCite={onCite} activeChunk={null} />);
    expect(screen.getByText("Quoted from the agreement")).toBeInTheDocument();
    expect(screen.getByText(/^Clause 8\.1 \(page 2\) says/)).toBeInTheDocument();
    screen.getByRole("button", { name: "Show Clause 8.1 · p. 2 in the document" }).click();
    expect(onCite).toHaveBeenCalledWith(answer, answer.evidence[0]);
  });

  it("marks refusals and offers the closest passages", () => {
    const refused = { ...answer, grounding: "insufficient" as const, sufficient: false, citations: [], evidence: answer.evidence.map((e) => ({ ...e, cited: false })) };
    render(<Conversation turns={[{ id: "1", question: "Dress code?", answer: refused, via: "voice" }]} onCite={() => {}} activeChunk={null} />);
    expect(screen.getByText("Not found in the agreement")).toBeInTheDocument();
    expect(screen.getByText(/closest passages/)).toBeInTheDocument();
    expect(screen.getByText("Spoken")).toBeInTheDocument();
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
