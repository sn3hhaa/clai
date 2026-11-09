/**
 * Single source of truth for public links and copy. Only verified URLs belong here; unknown
 * links stay undefined and are not rendered (see TASKS.md → pending configuration).
 */
export const site = {
  name: "Clai",
  fullName: "Clai — Voice-First Agreement Intelligence",
  tagline: "Your agreement, explained.",
  description:
    "Add an agreement, ask about it in plain language, and see every answer traced back to the clause and page it came from. The public version runs in your browser.",
  url: "https://sn3hhaa.github.io/clai",
  repo: "https://github.com/sn3hhaa/clai",
  issues: "https://github.com/sn3hhaa/clai/issues",
  discussions: "https://github.com/sn3hhaa/clai/issues/new/choose",
  social: {
    github: "https://github.com/sn3hhaa",
    linkedin: undefined as string | undefined,
    x: undefined as string | undefined,
    email: undefined as string | undefined,
  },
} as const;

export const repoFile = (path: string) => `${site.repo}/blob/main/${path}`;
export const repoTree = (path: string) => `${site.repo}/tree/main/${path}`;

export const nav = [
  { label: "Product", href: "/product" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Technology", href: "/technology" },
  { label: "Docs", href: "/docs" },
] as const;
