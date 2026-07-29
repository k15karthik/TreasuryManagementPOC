"""FastAPI application entrypoint for the Treasury Management Copilot backend."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_analysis import router as analysis_router
from app.api.routes_feedback import router as feedback_router
from app.api.routes_health import router as health_router
from app.api.routes_historical import router as historical_router
from app.api.routes_knowledge import router as knowledge_router
from app.config import settings
from app.database.init_db import init_db
from app.knowledge.loader import seed_knowledge_base


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        seed_knowledge_base()
    except Exception as exc:  # noqa: BLE001
        # Don't let a bad/missing OpenAI key or quota issue take down the whole API —
        # the knowledge base and past-analyses pages should still work; only the
        # AI-dependent /api/analyses endpoint will fail until this is resolved.
        print(f"WARNING: failed to seed knowledge base vector store: {exc}")
    yield


app = FastAPI(title="Treasury Management Copilot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(knowledge_router)
app.include_router(analysis_router)
app.include_router(feedback_router)
app.include_router(historical_router)
