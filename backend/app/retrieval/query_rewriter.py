class QueryRewriter:
    """
    Generate alternative queries when the initial retrieval
    does not provide sufficient evidence.

    This first version uses deterministic query expansion.
    An LLM-based rewriting strategy can be added later.
    """

    def rewrite(self, query: str) -> list[str]:
        """
        Return alternative search queries for the original question.
        """

        normalized_query = query.strip()

        if not normalized_query:
            return []

        alternatives = [
            normalized_query,
            f"agreement {normalized_query}",
            f"contract {normalized_query}",
        ]

        # Remove duplicates while preserving order.
        return list(dict.fromkeys(alternatives))