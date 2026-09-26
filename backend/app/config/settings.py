import os
from functools import lru_cache
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Rainfall Intelligence"
    APP_SUBTITLE: str = "Regime-Aware Rainfall Forecast Intelligence Platform"
    SIH_PROBLEM_CODE: str = "SIH26080"
    DEVELOPER_CREDIT: str = "SIH26080 Rainfall Intelligence Platform"
    
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    
    API_V1_STR: str = "/api"
    
    # SQLite default, easily migratable to PostgreSQL
    DATABASE_URL: str = "sqlite:///./rainfall_intelligence.db"
    
    # Live NWP Meteorological API
    OPEN_METEO_BASE_URL: str = "https://api.open-meteo.com/v1"
    WEATHER_API_KEY: str = ""

    # Part 3: AI Assistant / LLM Configuration
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gpt-4o-mini"
    LLM_BASE_URL: str = "https://api.openai.com/v1"
    LLM_PROVIDER: str = "openai"
    LLM_TIMEOUT_SECONDS: int = 25
    
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()
