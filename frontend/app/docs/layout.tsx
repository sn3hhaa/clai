import { DocsSidebar } from "@/components/docs/docs-shell";
import { SitePage } from "@/components/shared/page";
import { DOCS, searchIndex } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SitePage>
      <div className="mx-auto grid max-w-[1200px] gap-10 px-5 pb-10 pt-12 md:grid-cols-[13rem_1fr] md:gap-12 md:px-8 md:pt-16">
        <aside>
          <DocsSidebar docs={DOCS} index={searchIndex()} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </SitePage>
  );
}
