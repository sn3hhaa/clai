import type { Metadata } from "next";
import { PageIntro, SitePage } from "@/components/shared/page";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What happens to your document, your questions and your voice when you use Clai.",
};

export default function PrivacyPage() {
  return (
    <SitePage>
      <PageIntro marker="Privacy · updated 9 November 2026" title={<>Your document <em>stays with you.</em></>} />
      <article className="mx-auto max-w-[1200px] px-5 md:px-8">
        <div className="prose-clai md:ml-[25%]">
          <p>
            This notice describes the public version of Clai at <strong>sn3hhaa.github.io/clai</strong>. It&apos;s written
            to match how the software actually works. If you run Clai yourself with a server, see the last section.
          </p>

          <h2>The short version</h2>
          <ul>
            <li>Your PDF is read <strong>in your browser</strong>. It isn&apos;t uploaded to Clai or anyone else.</li>
            <li>Questions, answers and citations are computed in your browser too.</li>
            <li>Nothing is stored after you close the tab. There are no accounts, cookies or analytics.</li>
            <li>If you use <strong>voice input</strong>, your browser may send the audio to its own speech service.</li>
          </ul>

          <h2>Your document</h2>
          <p>
            When you add a PDF, it&apos;s read with pdf.js inside your browser tab. Clai keeps the text and a copy of the
            file in the tab&apos;s memory so it can answer questions and show pages. Nothing is written to your browser&apos;s
            storage, and there is no Clai server for the public version. Closing the document or the tab discards it.
          </p>

          <h2>Voice</h2>
          <p>
            Voice input uses your browser&apos;s built-in speech recognition (the Web Speech API). Clai receives only the
            text. How the browser produces that text is up to the browser:
          </p>
          <ul>
            <li>
              <strong>Chrome and Edge</strong> send the audio to their speech recognition services (Google and Microsoft
              respectively) and return text.
            </li>
            <li>
              <strong>Safari</strong> uses Apple&apos;s speech recognition, on the device or through Apple&apos;s servers
              depending on your settings.
            </li>
            <li><strong>Firefox</strong> doesn&apos;t support it, so voice input isn&apos;t offered there.</li>
          </ul>
          <p>
            Reading answers aloud uses your browser&apos;s speech synthesis. Clai doesn&apos;t record audio. The microphone
            is used only while voice is on, and the browser shows that it&apos;s active.
          </p>

          <h2>This website</h2>
          <p>
            The site is hosted on GitHub Pages. Like any web host, GitHub receives standard request information (such as
            your IP address and browser) when you load pages. Clai adds no analytics, tracking pixels or third-party
            scripts. Fonts are bundled with the site.
          </p>

          <h2>Running Clai with a server</h2>
          <p>
            The open-source repository includes an optional server. If you, or someone you trust, runs it, documents are
            sent to that server and stored there (in SQLite and a vector index) until deleted. If the server is
            configured with an OpenRouter key, questions and retrieved passages are sent to OpenRouter; with Gradium,
            call audio goes to Gradium. The public website never uses a server unless one is running on your own
            computer and you choose it.
          </p>

          <h2>Questions</h2>
          <p>
            Clai has no legal entity behind it and doesn&apos;t make compliance claims. If something here is unclear or
            looks wrong, please <a href="https://github.com/sn3hhaa/clai/issues">open an issue</a>.
          </p>
        </div>
      </article>
    </SitePage>
  );
}
