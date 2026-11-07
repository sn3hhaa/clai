import { Footer } from "@/components/shared/footer";
import { Navbar } from "@/components/shared/navbar";
import {
  Developers,
  Features,
  FinalCTA,
  Hero,
  Highlights,
  HowItWorks,
  OpenSource,
  ProductBand,
} from "@/components/home/sections";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <Hero />
        <ProductBand />
        <Features />
        <Highlights />
        <HowItWorks />
        <OpenSource />
        <Developers />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
