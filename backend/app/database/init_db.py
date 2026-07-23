"""Creates all SQLite tables on startup if they do not already exist."""
from app.database.session import engine
from app.models.db_models import Base


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
