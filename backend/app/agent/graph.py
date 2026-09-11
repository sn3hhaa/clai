from langgraph.graph import END, START, StateGraph

from ..agent_state import ClaiState
from ..ingestion.models import DocumentChunk
from ..retrieval.corrective_retrieval import CorrectiveRetrieval
from ..retrieval.evidence_pack import EvidencePack


class ClaiAgent:
    """
    LangGraph-based orchestration layer for Clai.

    The current graph runs the retrieval and evidence pipeline.
    Answer generation will be added as a later graph node.
    """

    def __init__(
        self,
        chunks: list[DocumentChunk],
        minimum_score: float = 0.0,
    ) -> None:
        self.retrieval = CorrectiveRetrieval(
            chunks=chunks,
            minimum_score=minimum_score,
        )

        builder = StateGraph(ClaiState)

        builder.add_node(
            "retrieve_evidence",
            self.retrieve_evidence,
        )

        builder.add_edge(
            START,
            "retrieve_evidence",
        )

        builder.add_edge(
            "retrieve_evidence",
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

    def invoke(self, query: str) -> ClaiState:
        """
        Execute the Clai graph for a user query.
        """

        return self.graph.invoke(
            {
                "query": query,
            }
        )