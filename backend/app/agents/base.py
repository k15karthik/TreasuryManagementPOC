"""Shared LLM client factory used by every agent."""
from langchain_openai import ChatOpenAI

from app.config import settings


def get_llm(temperature: float = 0.2) -> ChatOpenAI:
    """Returns a ChatOpenAI client configured for this app.

    Low default temperature keeps agent reasoning consistent and demo-reliable,
    while still allowing individual agents to override for more creative tasks.
    """
    return ChatOpenAI(
        model=settings.openai_model,
        temperature=temperature,
        api_key=settings.openai_api_key,
    )
