from ..ingestion.models import DocumentChunk


def reciprocal_rank_fusion(
    result_lists: list[list[tuple[DocumentChunk, float]]],
    top_k: int = 5,
    k: int = 60,
) -> list[tuple[DocumentChunk, float]]:
    """
    Combine multiple ranked retrieval result lists using Reciprocal Rank Fusion.

    The original retrieval scores are not combined directly. Each result
    contributes according to its rank in its respective result list.
    """

    fused_scores: dict[str, float] = {}
    chunk_lookup: dict[str, DocumentChunk] = {}

    for results in result_lists:
        for rank, (chunk, _) in enumerate(results, start=1):
            chunk_lookup[chunk.chunk_id] = chunk

            fused_scores[chunk.chunk_id] = (
                fused_scores.get(chunk.chunk_id, 0.0)
                + 1.0 / (k + rank)
            )

    ranked_chunks = sorted(
        fused_scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    return [
        (chunk_lookup[chunk_id], score)
        for chunk_id, score in ranked_chunks[:top_k]
    ]