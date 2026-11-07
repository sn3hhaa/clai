import type { Metadata } from "next";
import { Workspace } from "@/components/talk/workspace";

export const metadata: Metadata = {
  title: "Talk to Clai",
  description: "Upload an agreement and ask questions by voice or text, with page, section and clause evidence.",
};

export default function TalkPage() {
  return <Workspace />;
}
