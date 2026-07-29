"""Thin wrapper around a persistent ChromaDB collection for historical client analyses —
the second RAG system, fully separate from vector_store.py's treasury-product collection.

Kept as a thin, swappable module in the same shape as vector_store.py so a future
Postgres+pgvector migration only needs a new implementation of these three functions,
not any change to the callers (the historical retrieval agent, indexing service, or API).
"""
import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

from app.config import settings

COLLECTION_NAME = "historical_analyses"

_client = chromadb.PersistentClient(path=str(settings.chroma_path))
_embedding_fn = OpenAIEmbeddingFunction(
    api_key=settings.openai_api_key,
    model_name=settings.openai_embedding_model,
)


def get_collection():
    # Cosine space is required here (unlike the product collection, which never displays
    # a raw score) so Chroma's distance converts cleanly to a 0-1 "similarity %" for display.
    return _client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=_embedding_fn,
        metadata={"hnsw:space": "cosine"},
    )


def index_historical_analysis(doc_id: str, document_text: str, metadata: dict) -> None:
    """Upserts (not add()) since reindexing must be idempotent — re-running it against an
    already-indexed analysis_id must update in place, not raise on a duplicate ID."""
    collection = get_collection()
    collection.upsert(ids=[doc_id], documents=[document_text], metadatas=[metadata])


def query_similar_analyses(query_text: str, n_results: int = 5) -> list[dict]:
    """Returns the top-n most similar historical analyses as dicts with metadata plus a
    normalized `similarity_score` (0-1, higher is more similar) — callers never touch the
    raw Chroma distance/response shape, mirroring vector_store.query_products."""
    collection = get_collection()
    if collection.count() == 0:
        return []
    n_results = min(n_results, collection.count())
    results = collection.query(query_texts=[query_text], n_results=n_results)

    matches = []
    for metadata, distance in zip(results["metadatas"][0], results["distances"][0]):
        similarity_score = max(0.0, 1 - distance)
        matches.append({**metadata, "similarity_score": similarity_score})
    return matches
