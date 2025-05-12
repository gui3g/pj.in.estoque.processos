import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Adicionar o diretório atual ao path para importar os módulos da aplicação
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.models.models import Base, Usuario, Produto, Fase, ProdutoFase, Lote, ProdutoLote, FaseLote, Operador, Maquina

# Configuração para hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Gera um hash para a senha."""
    return pwd_context.hash(password)

def init_db():
    # Criar engine e conectar ao banco de dados
    engine = create_engine(settings.DATABASE_URL)
    
    # Criar todas as tabelas
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    # Criar uma sessão
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        print("Inicializando banco de dados com dados de teste...")
        
        # Criar usuários
        print("Criando usuários...")
        admin_user = Usuario(
            usuario="admin",
            senha=get_password_hash("admin"),
            nome="Administrador",
            email="admin@example.com",
            role="admin",
            ativo=True
        )
        
        operador_user = Usuario(
            usuario="operador",
            senha=get_password_hash("operador"),
            nome="Operador",
            email="operador@example.com",
            role="operador",
            ativo=True
        )
        
        db.add(admin_user)
        db.add(operador_user)
        
        # Criar produtos
        print("Criando produtos...")
        produto1 = Produto(
            codigo="P001",
            descricao="Produto Teste 1",
            tempo_estimado_total=60,
            ativo=True
        )
        
        produto2 = Produto(
            codigo="P002",
            descricao="Produto Teste 2",
            tempo_estimado_total=120,
            ativo=True
        )
        
        db.add(produto1)
        db.add(produto2)
        
        # Commit para obter IDs
        db.commit()
        
        # Criar fases
        print("Criando fases...")
        fase1 = Fase(
            codigo="F001",
            descricao="Corte",
            ativo=True
        )
        
        fase2 = Fase(
            codigo="F002",
            descricao="Montagem",
            ativo=True
        )
        
        fase3 = Fase(
            codigo="F003",
            descricao="Acabamento",
            ativo=True
        )
        
        fase4 = Fase(
            codigo="F004",
            descricao="Teste de Qualidade",
            ativo=True
        )
        
        db.add(fase1)
        db.add(fase2)
        db.add(fase3)
        db.add(fase4)
        
        # Commit para obter IDs
        db.commit()
        
        # Associar fases aos produtos
        print("Associando fases aos produtos...")
        # Fases do Produto 1
        produto_fase1 = ProdutoFase(
            produto_id=produto1.id,
            fase_id=fase1.id,
            ordem=1,
            tempo_estimado=15,
            tempo_prateleira_horas=2,
            ativo=True
        )
        
        produto_fase2 = ProdutoFase(
            produto_id=produto1.id,
            fase_id=fase2.id,
            ordem=2,
            tempo_estimado=25,
            tempo_prateleira_horas=4,
            ativo=True
        )
        
        produto_fase3 = ProdutoFase(
            produto_id=produto1.id,
            fase_id=fase3.id,
            ordem=3,
            tempo_estimado=20,
            tempo_prateleira_horas=1,
            ativo=True
        )
        
        # Fases do Produto 2
        produto_fase4 = ProdutoFase(
            produto_id=produto2.id,
            fase_id=fase1.id,
            ordem=1,
            tempo_estimado=30,
            tempo_prateleira_horas=3,
            ativo=True
        )
        
        produto_fase5 = ProdutoFase(
            produto_id=produto2.id,
            fase_id=fase2.id,
            ordem=2,
            tempo_estimado=45,
            tempo_prateleira_horas=6,
            ativo=True
        )
        
        produto_fase6 = ProdutoFase(
            produto_id=produto2.id,
            fase_id=fase4.id,
            ordem=3,
            tempo_estimado=45,
            tempo_prateleira_horas=0,
            ativo=True
        )
        
        db.add(produto_fase1)
        db.add(produto_fase2)
        db.add(produto_fase3)
        db.add(produto_fase4)
        db.add(produto_fase5)
        db.add(produto_fase6)
        
        # Criar lotes
        print("Criando lotes...")
        lote1 = Lote(
            codigo="L001",
            descricao="Lote de Teste 1",
            data_criacao=datetime.utcnow(),
            status="em_producao",
            observacoes="Lote de teste para produção inicial",
            ativo=True
        )
        
        lote2 = Lote(
            codigo="L002",
            descricao="Lote de Teste 2",
            data_criacao=datetime.utcnow() - timedelta(days=2),
            status="em_producao",
            observacoes="Lote de teste para produção secundária",
            ativo=True
        )
        
        db.add(lote1)
        db.add(lote2)
        
        # Commit para obter IDs
        db.commit()
        
        # Associar produtos aos lotes
        print("Associando produtos aos lotes...")
        produto_lote1 = ProdutoLote(
            lote_id=lote1.id,
            produto_id=produto1.id,
            quantidade=10,
            observacoes="Produção normal",
            data_associacao=datetime.utcnow(),
            ativo=True
        )
        
        produto_lote2 = ProdutoLote(
            lote_id=lote2.id,
            produto_id=produto2.id,
            quantidade=5,
            observacoes="Produção prioritária",
            data_associacao=datetime.utcnow() - timedelta(days=2),
            ativo=True
        )
        
        db.add(produto_lote1)
        db.add(produto_lote2)
        
        # Commit para obter IDs
        db.commit()
        
        # Associar fases aos lotes
        print("Associando fases aos lotes...")
        # Fases do Lote 1 (Produto 1)
        fase_lote1 = FaseLote(
            lote_id=lote1.id,
            fase_id=fase1.id,
            produto_id=produto1.id,
            ordem=1,
            tempo_estimado=15,
            tempo_prateleira_horas=2,
            ativo=True
        )
        
        fase_lote2 = FaseLote(
            lote_id=lote1.id,
            fase_id=fase2.id,
            produto_id=produto1.id,
            ordem=2,
            tempo_estimado=25,
            tempo_prateleira_horas=4,
            ativo=True
        )
        
        fase_lote3 = FaseLote(
            lote_id=lote1.id,
            fase_id=fase3.id,
            produto_id=produto1.id,
            ordem=3,
            tempo_estimado=20,
            tempo_prateleira_horas=1,
            ativo=True
        )
        
        # Fases do Lote 2 (Produto 2)
        fase_lote4 = FaseLote(
            lote_id=lote2.id,
            fase_id=fase1.id,
            produto_id=produto2.id,
            ordem=1,
            tempo_estimado=30,
            tempo_prateleira_horas=3,
            ativo=True
        )
        
        fase_lote5 = FaseLote(
            lote_id=lote2.id,
            fase_id=fase2.id,
            produto_id=produto2.id,
            ordem=2,
            tempo_estimado=45,
            tempo_prateleira_horas=6,
            ativo=True
        )
        
        fase_lote6 = FaseLote(
            lote_id=lote2.id,
            fase_id=fase4.id,
            produto_id=produto2.id,
            ordem=3,
            tempo_estimado=45,
            tempo_prateleira_horas=0,
            ativo=True
        )
        
        db.add(fase_lote1)
        db.add(fase_lote2)
        db.add(fase_lote3)
        db.add(fase_lote4)
        db.add(fase_lote5)
        db.add(fase_lote6)
        
        # Commit final
        db.commit()
        
        print("Banco de dados inicializado com sucesso!")
        
    except Exception as e:
        print(f"Erro ao inicializar banco de dados: {e}")
        db.rollback()
    
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
