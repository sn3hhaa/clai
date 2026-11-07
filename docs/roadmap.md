# Limitations & roadmap

## Known limitations

- **No OCR.** Scanned PDFs are rejected.
- **PDF only.** No DOCX.
- **English only.** Whisper `base.en` and the Piper voice are English, and so are the
  intent and synonym rules.
- **Clause detection** depends on numbering and headings. Unusual layouts get passages
  without clause labels.
- **Single user, no authentication.** Meant for local use.
- **No hosted backend.** See [Deployment](deployment.md).
- **Small evaluation set**, used during development. See [Evaluation](evaluation.md).
- **Voice under heavy CPU load** can fall behind real time. A GPU helps.
- **The real-microphone acceptance test hasn't been recorded yet.** See the
  [acceptance test](guides/acceptance-test.md).
- **Free LLM quota** is 50 requests/day on OpenRouter without purchased credits.

## Roadmap

| Next | Why |
|---|---|
| Run and record the real-microphone acceptance test | required before voice is marked verified |
| LLM-mode evaluation with a free OpenRouter model | measure written answers, not just quotes |
| Larger, more varied fictional evaluation set | numbers that generalise |
| OCR for scanned agreements (local, e.g. Tesseract) | many signed agreements are scans |
| Streaming STT (Gradium) as an option | faster turns and better barge-in |
| Compare two agreements | "how does this NDA differ from the last one?" |
| DOCX input | common for drafts |
| Dark theme | requested often for reading |
