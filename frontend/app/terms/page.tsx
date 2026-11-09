import type { Metadata } from "next";
import { PageIntro, SitePage } from "@/components/shared/page";

export const metadata: Metadata = {
  title: "Terms",
  description: "The terms for using Clai, including the fact that it isn't legal advice.",
};

export default function TermsPage() {
  return (
    <SitePage>
      <PageIntro marker="Terms · updated 9 November 2026" title={<>Plain terms for a <em>reading tool.</em></>} />
      <article className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="prose-clai md:ml-[25%]">
          <h2>What Clai is</h2>
          <p>
            Clai is free, open-source software that helps you find and read passages in agreements. It&apos;s provided as
            is, without warranties of any kind, under the{" "}
            <a href="https://github.com/sn3hhaa/clai/blob/main/LICENSE">MIT License</a>.
          </p>

          <h2>Not legal advice</h2>
          <p>
            Clai quotes and locates text. It doesn&apos;t interpret the law, judge whether terms are fair or enforceable,
            or know anything about your situation beyond the document you add. Its answers can be incomplete or wrong.
            Always read the cited clause in context, and consult a qualified lawyer before relying on any agreement.
          </p>

          <h2>Your documents</h2>
          <p>
            Only add documents you&apos;re allowed to read. The public version processes them in your browser and
            doesn&apos;t receive them (see the <a href="../privacy/">privacy notice</a>). You&apos;re responsible for
            what you do with the results.
          </p>

          <h2>Acceptable use</h2>
          <ul>
            <li>Don&apos;t use Clai to break the law or to infringe anyone&apos;s rights.</li>
            <li>Don&apos;t represent Clai&apos;s output as professional legal advice.</li>
            <li>Don&apos;t attempt to disrupt the website or its hosting.</li>
          </ul>

          <h2>Liability</h2>
          <p>
            To the extent permitted by law, the authors of Clai aren&apos;t liable for any loss arising from its use,
            including decisions made on the basis of its answers.
          </p>

          <h2>Changes</h2>
          <p>
            These terms may change as Clai changes. The date at the top shows the latest version. Their history is public
            in the repository.
          </p>
        </div>
      </article>
    </SitePage>
  );
}
