"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { nav } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-bg/80 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <nav aria-label="Main" className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Clai home" className="shrink-0">
          <Logo />
        </Link>
        <ul className="hidden items-center gap-8 text-[0.9rem] md:flex">
          {nav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active(item.href) ? "page" : undefined}
                className={cn("transition-colors hover:text-ink", active(item.href) ? "text-ink" : "text-ink-2")}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/contact" className="text-[0.9rem] text-ink-2 transition-colors hover:text-ink">
            Contact
          </Link>
          <Link
            href="/talk"
            className="group inline-flex items-center gap-1.5 bg-ink px-4 py-2 text-[0.88rem] font-medium text-bg transition-colors hover:bg-mint-hover"
          >
            Open Clai
            <ArrowUpRight aria-hidden className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </Link>
        </div>
        <button
          type="button"
          className="-mr-2 grid h-10 w-10 place-items-center text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="fixed inset-x-0 bottom-0 top-16 z-50 flex flex-col bg-bg px-5 pb-8 pt-6 md:hidden">
          <ul className="flex flex-col">
            {[...nav, { label: "Contact", href: "/contact" }].map((item) => (
              <li key={item.href} className="border-b border-line">
                <Link href={item.href} onClick={() => setOpen(false)} className="display block py-4 text-[2rem]">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/talk" onClick={() => setOpen(false)} className="mt-auto inline-flex items-center justify-center gap-2 bg-ink py-4 font-medium text-bg">
            Open Clai <ArrowUpRight aria-hidden className="h-4 w-4" />
          </Link>
        </div>
      )}
    </header>
  );
}
