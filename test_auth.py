import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Adicionar o diretório atual ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.models import Base, Usuario
from app.core.security import verify_password, authenticate_user

# Configuração para hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def test_auth():
    """Testa o processo de autenticação manualmente."""
    # Criar engine e conectar ao banco de dados
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Buscar usuário admin
        username = "admin"
        password = "admin"
        
        logger.info(f"Testando autenticação para usuário: {username}")
        
        # Verificar se o usuário existe
        user = db.query(Usuario).filter(Usuario.usuario == username).first()
        if not user:
            logger.error(f"Usuário {username} não encontrado no banco de dados")
            return
        
        logger.info(f"Usuário encontrado: {user.nome}, Role: {user.role}")
        
        # Verificar a senha
        password_match = verify_password(password, user.senha)
        logger.info(f"Senha corresponde: {password_match}")
        
        # Tentar autenticação completa
        authenticated_user = authenticate_user(db, username, password)
        if authenticated_user:
            logger.info(f"Autenticação bem-sucedida para {authenticated_user.nome}")
        else:
            logger.error("Falha na autenticação")
            
        # Mostrar todos os usuários para verificação
        all_users = db.query(Usuario).all()
        logger.info(f"Total de usuários no banco: {len(all_users)}")
        for u in all_users:
            logger.info(f"- {u.usuario}: {u.nome} ({u.role})")
    
    finally:
        db.close()

if __name__ == "__main__":
    test_auth()
