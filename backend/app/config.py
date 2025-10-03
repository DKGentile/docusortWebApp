from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./app.db"
    openai_api_key: str | None = None
    llm_model: str = "gpt-4o-mini"
    chunk_size: int = 1000
    chunk_overlap: int = 100

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
