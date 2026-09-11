import os
import time
from collections.abc import Iterator

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

    def _build_messages(
        self,
        evidence_pack: EvidencePack,
    ) -> list[dict[str, str]]:
        """
        Build the grounded prompt used by both normal and streaming generation.
        """

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

        return [
            {
                "role": "system",
                "content": instructions,
            },
            {
                "role": "user",
                "content": prompt,
            },
        ]

    def generate(
        self,
        evidence_pack: EvidencePack,
    ) -> str:
        """
        Generate a complete grounded answer.
        """

        if not evidence_pack.sufficient:
            return (
                "I couldn't find sufficient evidence in the agreement "
                "to answer that confidently."
            )

        messages = self._build_messages(evidence_pack)

        start = time.perf_counter()

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
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

    def generate_stream(
        self,
        evidence_pack: EvidencePack,
    ) -> Iterator[str]:
        """
        Stream a grounded answer as text chunks arrive from the LLM.

        Also measures time to first token and total streaming latency.
        """

        if not evidence_pack.sufficient:
            yield (
                "I couldn't find sufficient evidence in the agreement "
                "to answer that confidently."
            )
            return

        messages = self._build_messages(evidence_pack)

        start = time.perf_counter()
        first_chunk_time: float | None = None

        stream = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=200,
            extra_body={
                "reasoning": {
                    "enabled": False,
                },
            },
            stream=True,
        )

        for chunk in stream:
            if not chunk.choices:
                continue

            content = chunk.choices[0].delta.content

            if content:
                if first_chunk_time is None:
                    first_chunk_time = time.perf_counter()

                    print(
                        "LLM time to first token: "
                        f"{first_chunk_time - start:.3f}s"
                    )

                yield content

        elapsed = time.perf_counter() - start

        print(
            f"LLM streaming latency: {elapsed:.3f}s"
        )