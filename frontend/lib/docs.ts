// On-site documentation: Markdown in frontend/content/docs, rendered at build time.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Marked } from "marked";

export interface DocPage {
  slug: string;
  title: string;
  description: string;
  group: "Guides" | "Reference";
}

export const DOCS: DocPage[] = [
  { slug: "getting-started", title: "Getting started", description: "Open Clai, add an agreement and ask your first question.", group: "Guides" },
  { slug: "using-clai", title: "Using Clai", description: "Asking good questions, follow-ups, the document panel and session summaries.", group: "Guides" },
  { slug: "voice-experience", title: "Voice experience", description: "Speaking to Clai, supported browsers, and what happens to your voice.", group: "Guides" },
  { slug: "document-support", title: "Documents", description: "Which PDFs work, size limits, scanned files, and how structure is detected.", group: "Guides" },
  { slug: "evidence-and-citations", title: "Evidence and citations", description: "How answers connect to clauses, and what “not found” means.", group: "Guides" },
  { slug: "privacy-and-security", title: "Privacy and security", description: "Where your document goes and what leaves your device.", group: "Reference" },
  { slug: "faq", title: "FAQ", description: "Short answers to common questions, including limitations.", group: "Reference" },
  { slug: "technical-reference", title: "Technical reference", description: "Architecture of both engines, running your own server, and the repository.", group: "Reference" },
];

export interface Heading {
  id: string;
  text: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

export function renderDoc(slug: string): { html: string; headings: Heading[] } {
  const source = readFileSync(join(process.cwd(), "content", "docs", `${slug}.md`), "utf8");
  const headings: Heading[] = [];
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const id = slugify(text);
        if (depth === 2) headings.push({ id, text: text.replace(/<[^>]+>/g, "") });
        return `<h${depth} id="${id}">${text}</h${depth}>`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:/.test(href);
        // Site-internal links ("/talk", "/docs/faq") need the deployment base path on GitHub Pages.
        const url = !external && href.startsWith("/") ? `${base}${href}` : href;
        const t = title ? ` title="${title}"` : "";
        return external ? `<a href="${url}"${t} target="_blank" rel="noopener noreferrer">${text}</a>` : `<a href="${url}"${t}>${text}</a>`;
      },
    },
  });
  const html = marked.parse(source) as string;
  return { html, headings };
}

/** Plain-text index for the sidebar search (titles, descriptions and section headings). */
export function searchIndex(): { slug: string; title: string; text: string }[] {
  return DOCS.map((d) => {
    const source = readFileSync(join(process.cwd(), "content", "docs", `${d.slug}.md`), "utf8");
    const heads = [...source.matchAll(/^##+\s+(.+)$/gm)].map((m) => m[1]).join(" ");
    return { slug: d.slug, title: d.title, text: `${d.title} ${d.description} ${heads}`.toLowerCase() };
  });
}
