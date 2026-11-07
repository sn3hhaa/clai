"""Generate the fictional agreement PDFs used by tests, evaluation and the demo.

All parties, names and terms are invented. Run:  python -m tests.fixtures.generate
"""

from __future__ import annotations

from pathlib import Path

import pymupdf

HERE = Path(__file__).resolve().parent

SERVICES = [
    ("title", "MASTER SERVICES AGREEMENT"),
    ("p", "FICTIONAL SAMPLE DOCUMENT - created for testing Clai. Not a real agreement."),
    (
        "p",
        'This Master Services Agreement (the "Agreement") is entered into on 1 March 2026 between '
        'Aldermoor Studio Private Limited (the "Client") and Brightfern Analytics LLP (the "Provider").',
    ),
    ("h", "1. Definitions"),
    ("p", '1.1 "Services" means the data analysis and reporting services described in Schedule A.'),
    ("p", '1.2 "Deliverables" means all reports, dashboards and documentation produced under this Agreement.'),
    (
        "p",
        '1.3 "Confidential Information" means any non-public business, technical or financial information disclosed by either party.',
    ),
    ("h", "2. Services"),
    (
        "p",
        "2.1 The Provider shall perform the Services with reasonable skill and care and in accordance with good industry practice.",
    ),
    (
        "p",
        "2.2 The Provider shall deliver a monthly performance report to the Client within five business days after the end of each calendar month.",
    ),
    ("h", "3. Term"),
    ("p", "3.1 This Agreement begins on the Effective Date and continues for an initial term of twelve (12) months."),
    (
        "p",
        "3.2 After the initial term, this Agreement renews automatically for successive periods of twelve (12) months unless either party gives notice of non-renewal at least 60 days before the end of the then-current term.",
    ),
    ("h", "4. Fees and Payment"),
    ("p", "4.1 The Client shall pay the Provider a fixed monthly fee of INR 1,80,000, exclusive of applicable taxes."),
    ("p", "4.2 The Provider shall invoice monthly in arrears. Each invoice is payable within 15 days of receipt."),
    ("p", "4.3 Late payments accrue interest at 1.5% per month on the overdue amount until paid in full."),
    ("pagebreak", ""),
    ("h", "5. Confidentiality"),
    (
        "p",
        "5.1 Each party shall keep the other party's Confidential Information secret and use it only to perform this Agreement.",
    ),
    ("p", "5.2 The obligations in this Section 5 survive for three (3) years after this Agreement ends."),
    ("h", "6. Intellectual Property"),
    (
        "p",
        "6.1 Upon full payment, all rights in the Deliverables are assigned to the Client. The Provider retains ownership of its pre-existing tools and know-how.",
    ),
    ("h", "7. Limitation of Liability"),
    ("p", "7.1 Neither party is liable for indirect or consequential losses, including loss of profit."),
    (
        "p",
        "7.2 Each party's total liability under this Agreement is limited to the fees paid by the Client in the twelve (12) months before the claim arose.",
    ),
    ("h", "8. Termination"),
    ("p", "8.1 Termination for convenience. Either party may terminate this agreement with 30 days' written notice."),
    (
        "p",
        "8.2 Termination for cause. Either party may terminate this Agreement immediately by written notice if the other party commits a material breach and fails to remedy it within 10 days of being notified.",
    ),
    (
        "p",
        "8.3 Effect of termination. On termination, the Client shall pay for all Services performed up to the termination date, and each party shall return the other party's Confidential Information.",
    ),
    ("h", "9. Governing Law and Disputes"),
    ("p", "9.1 This Agreement is governed by the laws of India."),
    (
        "p",
        "9.2 The parties shall first try to resolve any dispute through good-faith negotiation for 30 days. Unresolved disputes are subject to the exclusive jurisdiction of the courts at Bengaluru.",
    ),
    ("h", "10. General"),
    ("p", "10.1 Notices must be in writing and sent by email to the addresses in Schedule B."),
    ("p", "10.2 Neither party may assign this Agreement without the other party's prior written consent."),
]

NDA = [
    ("title", "MUTUAL NON-DISCLOSURE AGREEMENT"),
    ("p", "FICTIONAL SAMPLE DOCUMENT - created for testing Clai. Not a real agreement."),
    ("p", "This Mutual Non-Disclosure Agreement is made between Kestrel Harbour Labs and Quillon Systems."),
    ("h", "1. Purpose"),
    ("p", "1.1 The parties wish to exchange information to evaluate a possible software partnership."),
    ("h", "2. Obligations"),
    ("p", "2.1 The receiving party shall protect disclosed information using at least reasonable care."),
    ("h", "3. Term and Termination"),
    ("p", "3.1 This Agreement may be terminated by either party upon 90 days' written notice to the other party."),
    ("p", "3.2 Confidentiality obligations continue for five (5) years after termination."),
]

MARGIN = 72
WIDTH = 595 - 2 * MARGIN  # A4 width in points


def render(blocks: list[tuple[str, str]], path: Path) -> None:
    doc = pymupdf.open()
    page = doc.new_page(width=595, height=842)
    y = MARGIN

    def new_page() -> None:
        nonlocal page, y
        page = doc.new_page(width=595, height=842)
        y = MARGIN

    for kind, text in blocks:
        if kind == "pagebreak":
            new_page()
            continue
        font, size, gap = {"title": ("hebo", 16, 18), "h": ("hebo", 12, 8), "p": ("helv", 10.5, 8)}[kind]
        height = page.insert_textbox(
            pymupdf.Rect(MARGIN, y, MARGIN + WIDTH, 842 - MARGIN), text, fontname=font, fontsize=size
        )
        if height < 0:  # did not fit: move to next page
            new_page()
            height = page.insert_textbox(
                pymupdf.Rect(MARGIN, y, MARGIN + WIDTH, 842 - MARGIN), text, fontname=font, fontsize=size
            )
        y = 842 - MARGIN - height + gap
    for number, pg in enumerate(doc, start=1):
        pg.insert_text((595 / 2 - 15, 842 - 36), f"Page {number} of {doc.page_count}", fontname="helv", fontsize=8)
    doc.set_metadata({"title": path.stem.replace("_", " ").title(), "author": "Clai test fixtures"})
    doc.save(path, garbage=4, deflate=True)
    doc.close()


def main() -> None:
    render(SERVICES, HERE / "services_agreement.pdf")
    render(NDA, HERE / "mutual_nda.pdf")
    print("wrote", HERE / "services_agreement.pdf", HERE / "mutual_nda.pdf")


if __name__ == "__main__":
    main()
