"""Vercel serverless entrypoint.

Vercel's Python runtime builds every file under api/ into its own serverless
function and looks for an ASGI/WSGI-compatible `app` object in that file. This
module changes nothing about the application — it only re-exports the real
FastAPI instance from app/main.py so Vercel has something under api/ to build.
"""
from app.main import app

__all__ = ["app"]
