import { SitePage } from "@/components/shared/page";
import { Capabilities, Conversation, Evidence, Film, FinalCta, Hero, HowItWorks, Privacy, Problem } from "@/components/home/sections";

export default function HomePage() {
  return (
    <SitePage>
      <Hero />
      <Film />
      <Problem />
      <Conversation />
      <Evidence />
      <HowItWorks />
      <Capabilities />
      <Privacy />
      <FinalCta />
    </SitePage>
  );
}
