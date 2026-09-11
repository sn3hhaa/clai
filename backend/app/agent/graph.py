from langgraph.graph import END, START, StateGraph

from ..agent_state import ClaiState
from ..answer_generator import AnswerGenerator
from ..ingestion.models import DocumentChunk
from ..retrieval.corrective_retrieval import CorrectiveRetrieval
from ..retrieval.evidence_pack import EvidencePack


class ClaiAgent:
    """
    LangGraph-based orchestration layer for Clai.

    The graph currently performs retrieval, evidence assessment,
    EvidencePack construction, and grounded answer generation.
    """

    def __init__(
        self,
        chunks: list[DocumentChunk],
        minimum_score: float = 0.0,
        answer_generator: AnswerGenerator | None = None,
    ) -> None:
        self.retrieval = CorrectiveRetrieval(
            chunks=chunks,
            minimum_score=minimum_score,
        )

        self.answer_generator = answer_generator

        builder = StateGraph(ClaiState)

        builder.add_node(
            "retrieve_evidence",
            self.retrieve_evidence,
        )

        builder.add_node(
            "generate_answer",
            self.generate_answer,
        )

        builder.add_edge(
            START,
            "retrieve_evidence",
        )

        builder.add_edge(
            "retrieve_evidence",
            "generate_answer",
        )

        builder.add_edge(
            "generate_answer",
            END,
        )

        self.graph = builder.compile()

    def retrieve_evidence(
        self,
        state: ClaiState,
    ) -> dict:
        """
        Run corrective retrieval and place the resulting EvidencePack
        into the shared graph state.
        """

        query = state["query"]

        retrieval_result = self.retrieval.search(
            query=query,
            retrieval_top_k=5,
            rerank_top_k=3,
        )

        evidence_pack = EvidencePack.from_results(
            query=query,
            results=retrieval_result.results,
            assessment=retrieval_result.assessment,
        )

        return {
            "evidence_pack": evidence_pack,
            "queries_used": retrieval_result.queries_used,
            "correction_attempted": retrieval_result.correction_attempted,
        }

    def generate_answer(
        self,
        state: ClaiState,
    ) -> dict:
        """
        Generate a grounded answer from the EvidencePack.
        """

        if self.answer_generator is None:
            raise RuntimeError(
                "An AnswerGenerator must be provided to generate answers."
            )

        answer = self.answer_generator.generate(
            state["evidence_pack"],
        )

        return {
            "answer": answer,
        }

    def invoke(self, query: str) -> ClaiState:
        """
        Execute the Clai graph for a user query.
        """

        return self.graph.invoke(
            {
                "query": query,
            }
        )