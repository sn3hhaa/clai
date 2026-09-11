from app.retrieval.embeddings import EmbeddingModel


def test_embedding_model():
    model = EmbeddingModel()

    documents = [
        "The tenant must provide thirty days notice before termination.",
        "The tenant is responsible for a two hundred dollar cleaning fee.",
    ]

    document_embeddings = model.embed_documents(documents)
    query_embedding = model.embed_query("What is the termination notice period?")

    assert len(document_embeddings) == len(documents)
    assert len(document_embeddings[0]) == 384
    assert len(query_embedding) == 384

    assert all(
        isinstance(value, float)
        for value in document_embeddings[0]
    )
    assert all(
        isinstance(value, float)
        for value in query_embedding
    )


    print(f"\nEmbedding dimension: {len(query_embedding)}")
    print(f"Documents embedded: {len(document_embeddings)}")