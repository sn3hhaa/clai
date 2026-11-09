## In short

- Your PDF is read **in your browser** and isn't uploaded.
- Questions and answers are computed in your browser.
- Nothing is saved after you close the document or the tab.
- No accounts, cookies or analytics.
- **Voice input** may send audio to your browser's speech service.

## Where each thing goes

| Data | Where it's processed | Leaves your device? |
|---|---|---|
| Your PDF | Your browser tab (pdf.js) | No |
| Extracted text and passages | Your browser tab | No |
| Questions and answers | Your browser tab | No |
| Your voice | Your browser's speech recognition | Possibly: Chrome/Edge and Safari may use Google, Microsoft or Apple servers |
| Page requests | GitHub Pages (the website host) | Standard web request data only |

## Clearing your data

Close the document with **×** in the header, or close the tab. Clai doesn't use browser storage, so there's nothing left behind to clear.

## Security

- The public site has no server that accepts documents, so there's no stored data to breach.
- No API keys or credentials are included in the website.
- The code is open source and can be reviewed at [github.com/sn3hhaa/clai](https://github.com/sn3hhaa/clai).
- Report vulnerabilities privately through [GitHub security advisories](https://github.com/sn3hhaa/clai/security/advisories/new).

## If you run your own Clai server

The repository includes an optional server for people who run Clai themselves. With it, documents are stored on that server until deleted, and optional providers (OpenRouter for written answers, Gradium for voice) receive the data they process. The public site never uses a server unless one is running on your own computer and you pick it as the engine.

Clai makes no compliance or certification claims. Read the full [privacy notice](/privacy).
