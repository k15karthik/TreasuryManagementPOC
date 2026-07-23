"""Read-only routes exposing the treasury product knowledge base to the frontend."""
from fastapi import APIRouter, HTTPException

from app.knowledge.loader import load_products

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/products")
async def list_products() -> list[dict]:
    return load_products()


@router.get("/products/{product_id}")
async def get_product(product_id: str) -> dict:
    for product in load_products():
        if product["id"] == product_id:
            return product
    raise HTTPException(status_code=404, detail="Product not found")
