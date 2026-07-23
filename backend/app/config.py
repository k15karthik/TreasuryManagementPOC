"""Application-wide settings, loaded from environment variables / .env."""
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent

# Vercel sets VERCEL=1 in every serverless function's environment. On that
# runtime the deployed bundle (including BACKEND_ROOT) is mounted read-only
# under /var/task, so "backend/data" can't be created or written to there —
# /tmp is the only writable path. Note this storage is ephemeral: it is not
# guaranteed to survive between invocations or across concurrent instances.
IS_VERCEL = bool(os.environ.get("VERCEL"))

if IS_VERCEL:
    DATA_DIR = Path("/tmp") / "tmcs_copilot_data"
else:
    DATA_DIR = BACKEND_ROOT / "data"

DATA_DIR.mkdir(parents=True, exist_ok=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_ROOT / ".env", extra="ignore")

    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    sqlite_path: Path = DATA_DIR / "tmcs_copilot.db"
    chroma_path: Path = DATA_DIR / "chroma"
    products_json_path: Path = BACKEND_ROOT / "app" / "knowledge" / "products.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def sqlite_url(self) -> str:
        return f"sqlite:///{self.sqlite_path}"


settings = Settings()
