import os

from openai import OpenAI

from .retrieval.evidence_pack import EvidencePack


class AnswerGenerator:
    """
    Generate grounded answers from an EvidencePack using an
    OpenAI-compatible model endpoint.

    The model is instructed to use only the supplied evidence.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://opencode.ai/zen/v1",
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENCODE_API_KEY")

        if not self.api_key:
            raise ValueError(
                "OPENCODE_API_KEY environment variable is required."
            )

        self.model = model or os.getenv(
            "CLAI_LLM_MODEL",
            "gpt-5.6-luna",
        )

        self.client = OpenAI(
            api_key=self.api_key,
            base_url=base_url,
        )

    def generate(self, evidence_pack: EvidencePack) -> str:
        """
        Generate an answer using only the evidence in the EvidencePack.
        """

        if not evidence_pack.sufficient:
            return (
                "I couldn't find sufficient evidence in the agreement "
                "to answer that confidently."
            )

        evidence_text = "\n\n".join(
            (
                f"[Evidence {index}]\n"
                f"Page: {item.page_number}\n"
                f"Section: {item.section}\n"
                f"Clause: {item.clause}\n"
                f"Text: {item.text}"
            )
            for index, item in enumerate(
                evidence_pack.evidence,
                start=1,
            )
        )

        instructions = """
You are Clai, an agreement-understanding assistant.

Answer the user's question using ONLY the supplied agreement evidence.

Rules:
- Do not invent facts that are not present in the evidence.
- Do not provide legal representation or definitive legal advice.
- Explain what the agreement says in clear language.
- If the evidence does not support an answer, say that the evidence is insufficient.
- When making a factual statement, reference the relevant evidence number.
- Preserve important amounts, dates, deadlines, and conditions exactly.
"""

        prompt = f"""
User question:
{evidence_pack.query}

Agreement evidence:
{evidence_text}
"""

        response = self.client.responses.create(
            model=self.model,
            instructions=instructions,
            input=prompt,
        )

        return response.output_text.strip()