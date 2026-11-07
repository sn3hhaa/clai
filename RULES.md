# Clai — Engineering Rules

These are non-negotiable. Every contributor and every Claude Code session follows them.

1. **No fake integrations.** A feature is real or it's not shipped. Demonstrations
   (e.g. the homepage Aura) are labelled as demonstrations.
2. **No invented citations or metadata.** Section and clause fields are `null` when not
   detected. Answers cite only chunks that were actually retrieved.
3. **No paid services.** ₹0. Never enable billing, never pick a paid tier, never add a
   provider without verifying its free tier and licence first.
4. **No Docker.** Native processes only.
5. **No secrets in Git.** Keys live in `.env` files, which are ignored. Never put a
   secret in a `NEXT_PUBLIC_*` variable.
6. **No user documents in Git.** Only fictional fixtures under `backend/tests/fixtures/`,
   `examples/` and `frontend/public/samples/`.
7. **No unnecessary dependencies.** Justify each new package in the PR or commit.
8. **No dead code, no meaningless placeholders, no empty files.**
9. **No untested completion claims.** TASKS.md "Verified" means a test or a documented
   manual check passed.
10. **No giant unreviewed commits.** One milestone per commit, conventional messages.
11. **No broken links.** Unknown social/contact URLs are omitted, not stubbed.
12. **No generic AI styling.** No neon, no purple gradients, no robot art, no fake
    testimonials or metrics.
13. **No legal advice.** Clai explains what the agreement says and points to where it
    says it.
14. **Never force-push. Never rewrite published history.**
15. **No references to unrelated projects** in code, docs or prompts.
