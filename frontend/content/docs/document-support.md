## What works

Clai reads **text-based PDFs**: files where you can select and copy the text. Agreements exported from Word, Google Docs or a contract system almost always are.

- File size: up to **20 MB**
- Length: up to **300 pages**
- Language: **English**

## What doesn't (yet)

| File | What happens | What to do |
|---|---|---|
| Scanned PDF (photos of pages) | Clai says it looks scanned | Use a text-based version, or run it through text recognition (OCR) first |
| Password-protected PDF | Clai asks you to remove the password | Save an unprotected copy |
| Word (.docx) | Not accepted | Export or print to PDF |
| Damaged PDF | Clai says it can't be read | Re-download or re-export the file |

## How Clai finds structure

Clai looks for the numbering that agreements use:

- top-level clauses such as `8.` or `8)`, which become sections (*8. Termination*)
- sub-clauses such as `8.1`, `8.2.3`
- lettered items such as `(a)` and `(iv)` inside a clause
- `Article IV`, `Section 7`, `Clause 12`
- short headings in capitals, or set larger than the body text

Numbers only count at the start of a sentence, so a line that wraps onto *"(12) months"* isn't mistaken for a clause. Page numbers and headers repeated on every page are removed.

When Clai can't detect a clause number, it **leaves it out** rather than guessing. Answers then cite the page and heading.

## Tips

- Agreements with numbered clauses give the most precise citations.
- Tables become plain text lines, so ask about specific values ("What is the monthly fee?").
- Very long clauses are split into passages of a few sentences. Each keeps its clause number.
