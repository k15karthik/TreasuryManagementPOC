"""Thin wrapper around a persistent ChromaDB collection for the treasury product knowledge base."""
import json

import chromadb
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

from app.config import settings

COLLECTION_NAME = "treasury_products"

_client = chromadb.PersistentClient(path=str(settings.chroma_path))
_embedding_fn = OpenAIEmbeddingFunction(
    api_key=settings.openai_api_key,
    model_name=settings.openai_embedding_model,
)


def get_collection():
    return _client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=_embedding_fn)


def query_products(query_text: str, n_results: int = 5) -> list[dict]:
    """Returns the top-n most similar products (as dicts with metadata) for a query string."""
    collection = get_collection()
    if collection.count() == 0:
        return []
    n_results = min(n_results, collection.count())
    results = collection.query(query_texts=[query_text], n_results=n_results)
    products = []
    for metadata in results["metadatas"][0]:
        product = json.loads(metadata["product_json"])
        products.append(product)
    return products
