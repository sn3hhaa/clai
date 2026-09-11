import os
import time

from dotenv import load_dotenv
from openai import OpenAI

from .retrieval.evidence_pack import EvidencePack

load_dotenv()


class AnswerGenerator:
    """
    Generate grounded answers from an EvidencePack using an
    OpenAI-compatible chat completion endpoint.

    The model is instructed to use only the supplied evidence.
    """

    def __init__(
        self,
        api_key: str | None = None,
        base_url: str = "https://openrouter.ai/api/v1",
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv("OPENROUTER_API_KEY")

        if not self.api_key:
            raise ValueError(
                "OPENROUTER_API_KEY environment variable is required."
            )

        self.model = model or os.getenv(
            "CLAI_LLM_MODEL",
            "nvidia/nemotron-3.5-lightning:free",
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
- Do not make assumptions about missing information.
- Keep the answer concise and directly answer the user's question.
- Do not reveal or describe your internal reasoning process.
"""

        prompt = f"""
User question:
{evidence_pack.query}

Agreement evidence:
{evidence_text}
"""

        start = time.perf_counter()

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": instructions,
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            max_tokens=200,
            extra_body={
                "reasoning": {
                    "enabled": False,
                },
            },
        )

        elapsed = time.perf_counter() - start

        print(f"LLM latency: {elapsed:.3f}s")

        content = response.choices[0].message.content

        if not content:
            raise RuntimeError(
                "The LLM returned an empty response."
            )

        return content.strip()