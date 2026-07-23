"""Loads products.json and (idempotently) seeds the Chroma vector store on startup."""
import json

from app.config import settings
from app.knowledge.vector_store import get_collection


def load_products() -> list[dict]:
    with open(settings.products_json_path) as f:
        return json.load(f)


def _searchable_text(product: dict) -> str:
    return (
        f"{product['name']}. {product['description']} "
        f"Ideal for: {product['ideal_client']} "
        f"Solves: {', '.join(product['pain_points_solved'])}. "
        f"Keywords: {', '.join(product['keywords'])}."
    )


def seed_knowledge_base() -> None:
    """Embeds every product into Chroma if the collection is empty. Safe to call on every startup."""
    collection = get_collection()
    if collection.count() > 0:
        return

    products = load_products()
    collection.add(
        ids=[p["id"] for p in products],
        documents=[_searchable_text(p) for p in products],
        metadatas=[
            {
                "id": p["id"],
                "name": p["name"],
                "category": p["category"],
                "product_json": json.dumps(p),
            }
            for p in products
        ],
    )
