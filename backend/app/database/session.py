"""SQLite engine/session setup."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings

# timeout=30: the historical-reindex endpoint runs on a background thread (FastAPI
# BackgroundTasks executes sync functions via run_in_threadpool — a real OS thread),
# genuinely concurrent with the main thread's live-analysis writes. Without a busy-timeout,
# SQLite's default is effectively 0 and a lock collision raises immediately instead of
# waiting a reasonable amount for the other writer to finish.
engine = create_engine(settings.sqlite_url, connect_args={"check_same_thread": False, "timeout": 30})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
