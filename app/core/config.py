from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv
import os
from typing import Optional

# Carrega variáveis de ambiente do arquivo .env
load_dotenv()

class Settings(BaseSettings):
    """Configurações da aplicação."""
    # Configurações do banco de dados
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/apontamento_db")
    
    # Configurações de segurança
    SECRET_KEY: str = os.getenv("SECRET_KEY", "secretkey123")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Configurações da aplicação
    APP_NAME: str = "Sistema de Apontamento Produtivo"
    API_PREFIX: str = "/api"
    DEBUG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        case_sensitive=True
    )

settings = Settings()
