/**
 * Single source of truth for public links. Only verified URLs belong here; unknown
 * links are left undefined and are not rendered anywhere (see TASKS.md → pending config).
 */
export const site = {
  name: "Clai",
  fullName: "Clai — Voice-First Agreement Intelligence",
  tagline: "Talk to your agreements. Understand what matters.",
  description:
    "Clai lets you upload an agreement, ask questions by voice or text, and get answers grounded in the document, with page, section and clause evidence.",
  url: "https://sn3hhaa.github.io/clai",
  repo: "https://github.com/sn3hhaa/clai",
  docs: "https://github.com/sn3hhaa/clai/tree/main/docs",
  social: {
    github: "https://github.com/sn3hhaa",
    linkedin: undefined as string | undefined,
    x: undefined as string | undefined,
    email: undefined as string | undefined,
  },
} as const;

export const repoFile = (path: string) => `${site.repo}/blob/main/${path}`;
export const repoTree = (path: string) => `${site.repo}/tree/main/${path}`;
