from typing import TypedDict

from .retrieval.evidence_pack import EvidencePack


class ClaiState(TypedDict, total=False):
    """
    Shared state passed between Clai's agent graph nodes.
    """

    query: str
    evidence_pack: EvidencePack
    answer: str
    queries_used: list[str]
    correction_attempted: bool