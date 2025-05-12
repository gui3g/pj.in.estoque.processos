import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from datetime import datetime, timedelta
import json

# Adicionar o diretório atual ao path para importar os módulos da aplicação
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.models import Usuario, Produto, Fase, Lote
from app.core.security import create_access_token, get_password_hash, verify_password

def test_database_connection():
    """Testa a conexão com o banco de dados."""
    try:
        engine = create_engine(settings.DATABASE_URL)
        connection = engine.connect()
        connection.close()
        print("[✓] Conexão com o banco de dados OK")
        return True
    except Exception as e:
        print(f"[✗] Erro ao conectar ao banco de dados: {e}")
        return False

def test_user_auth(db: Session):
    """Testa a autenticação de usuários."""
    try:
        # Buscar usuário admin
        user = db.query(Usuario).filter(Usuario.usuario == "admin").first()
        
        if not user:
            print("[✗] Usuário admin não encontrado. Você já executou o init_db.py?")
            return False
        
        # Verificar senha
        if verify_password("admin", user.senha):
            print("[✓] Autenticação de usuário OK")
            
            # Testar geração de token
            token = create_access_token(
                data={"sub": user.usuario, "role": user.role}
            )
            print("[✓] Geração de token JWT OK")
            return True
        else:
            print("[✗] Falha na verificação de senha")
            return False
    except Exception as e:
        print(f"[✗] Erro ao testar autenticação: {e}")
        return False

def test_model_queries(db: Session):
    """Testa consultas aos modelos principais."""
    try:
        # Contar registros
        usuarios_count = db.query(Usuario).count()
        produtos_count = db.query(Produto).count()
        fases_count = db.query(Fase).count()
        lotes_count = db.query(Lote).count()
        
        print(f"[✓] Consultas aos modelos OK")
        print(f"    - Usuários: {usuarios_count}")
        print(f"    - Produtos: {produtos_count}")
        print(f"    - Fases: {fases_count}")
        print(f"    - Lotes: {lotes_count}")
        
        # Verificar se há dados nos modelos principais
        if all([usuarios_count, produtos_count, fases_count, lotes_count]):
            print("[✓] Dados encontrados em todos os modelos principais")
            return True
        else:
            print("[!] Alguns modelos não possuem dados. Execute init_db.py para inicializar o banco.")
            return False
    except Exception as e:
        print(f"[✗] Erro ao testar consultas: {e}")
        return False

def main():
    """Função principal para executar todos os testes."""
    print("=" * 60)
    print("TESTE DO SISTEMA DE APONTAMENTO PRODUTIVO")
    print("=" * 60)
    
    # Testar conexão com o banco de dados
    if not test_database_connection():
        print("\nTeste falhou. Verifique a configuração do banco de dados no arquivo .env.")
        return
    
    # Criar sessão para testes
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        # Testar autenticação
        auth_ok = test_user_auth(db)
        
        # Testar consultas
        queries_ok = test_model_queries(db)
        
        # Resultado final
        print("\nRESULTADO DO TESTE:")
        if auth_ok and queries_ok:
            print("[✓] Todos os testes passaram! O sistema está pronto para uso.")
            print("\nVocê pode iniciar o servidor com:")
            print("    python run.py")
        else:
            print("[!] Alguns testes falharam. Verifique os erros acima.")
        
    except Exception as e:
        print(f"[✗] Erro geral ao executar testes: {e}")
    
    finally:
        db.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    main()
