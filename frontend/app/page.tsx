import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import {
  DeveloperSection,
  FinalCTA,
  GroundedAnswers,
  Hero,
  HowItWorks,
  TechnologyTeaser,
  VoiceExperience,
  WhatClaiDoes,
} from "@/components/home/sections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <WhatClaiDoes />
        <VoiceExperience />
        <GroundedAnswers />
        <HowItWorks />
        <TechnologyTeaser />
        <DeveloperSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
