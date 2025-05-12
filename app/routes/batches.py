from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Lote, ProdutoLote, FaseLote, Produto, Fase, ProdutoFase
from app.schemas.schemas import Lote as LoteSchema
from app.schemas.schemas import LoteCreate, LoteUpdate
from app.schemas.schemas import ProdutoLote as ProdutoLoteSchema
from app.schemas.schemas import ProdutoLoteCreate
from app.schemas.schemas import FaseLote as FaseLoteSchema
from app.schemas.schemas import FaseLoteCreate
import copy
from datetime import datetime

router = APIRouter()

@router.get("/", response_model=List[LoteSchema])
async def get_lotes(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de lotes ativos."""
    lotes = db.query(Lote).filter(Lote.ativo == True).order_by(Lote.data_criacao.desc()).offset(skip).limit(limit).all()
    return lotes

@router.get("/{lote_id}", response_model=LoteSchema)
async def get_lote(
    lote_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um lote específico pelo ID."""
    lote = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    return lote

@router.post("/", response_model=LoteSchema)
async def create_lote(
    lote: LoteCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo lote."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe lote com o mesmo código
    db_lote = db.query(Lote).filter(Lote.codigo == lote.codigo).first()
    if db_lote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de lote já existe"
        )
    
    # Criar novo lote
    db_lote = Lote(**lote.dict())
    db.add(db_lote)
    db.commit()
    db.refresh(db_lote)
    return db_lote

@router.put("/{lote_id}", response_model=LoteSchema)
async def update_lote(
    lote_id: int, 
    lote: LoteUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um lote existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se lote existe
    db_lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if db_lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Verificar se está tentando atualizar para um código já existente
    if lote.codigo and lote.codigo != db_lote.codigo:
        existing_lote = db.query(Lote).filter(Lote.codigo == lote.codigo).first()
        if existing_lote:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de lote já existe"
            )
    
    # Atualizar lote
    lote_data = lote.dict(exclude_unset=True)
    for key, value in lote_data.items():
        setattr(db_lote, key, value)
    
    db.commit()
    db.refresh(db_lote)
    return db_lote

@router.delete("/{lote_id}", response_model=LoteSchema)
async def delete_lote(
    lote_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um lote (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se lote existe
    db_lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if db_lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Desativar lote (exclusão lógica)
    db_lote.ativo = False
    db.commit()
    return db_lote

@router.post("/duplicate/{lote_id}", response_model=LoteSchema)
async def duplicate_lote(
    lote_id: int,
    novo_codigo: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Duplica um lote existente, criando um novo lote com as mesmas configurações."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se lote original existe
    lote_original = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if lote_original is None:
        raise HTTPException(status_code=404, detail="Lote original não encontrado")
    
    # Verificar se o novo código já existe
    lote_existente = db.query(Lote).filter(Lote.codigo == novo_codigo).first()
    if lote_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de lote já existe"
        )
    
    # Criar novo lote com os mesmos dados do original
    novo_lote = Lote(
        codigo=novo_codigo,
        descricao=lote_original.descricao + " (Duplicado)",
        status="em_producao",
        observacoes=lote_original.observacoes,
        data_criacao=datetime.utcnow(),
        ativo=True
    )
    
    db.add(novo_lote)
    db.commit()
    db.refresh(novo_lote)
    
    # Copiar os produtos associados ao lote original
    produtos_lote = db.query(ProdutoLote).filter(
        ProdutoLote.lote_id == lote_id,
        ProdutoLote.ativo == True
    ).all()
    
    for produto_lote in produtos_lote:
        novo_produto_lote = ProdutoLote(
            lote_id=novo_lote.id,
            produto_id=produto_lote.produto_id,
            quantidade=produto_lote.quantidade,
            observacoes=produto_lote.observacoes,
            ativo=True
        )
        db.add(novo_produto_lote)
    
    # Copiar as fases associadas ao lote original
    fases_lote = db.query(FaseLote).filter(
        FaseLote.lote_id == lote_id,
        FaseLote.ativo == True
    ).all()
    
    for fase_lote in fases_lote:
        nova_fase_lote = FaseLote(
            lote_id=novo_lote.id,
            fase_id=fase_lote.fase_id,
            produto_id=fase_lote.produto_id,
            ordem=fase_lote.ordem,
            tempo_estimado=fase_lote.tempo_estimado,
            tempo_prateleira_horas=fase_lote.tempo_prateleira_horas,
            ativo=True
        )
        db.add(nova_fase_lote)
    
    db.commit()
    return novo_lote

# Rotas para gerenciar produtos de um lote
@router.get("/{lote_id}/produtos", response_model=List[ProdutoLoteSchema])
async def get_lote_produtos(
    lote_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna todos os produtos de um lote."""
    lote = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    produtos_lote = db.query(ProdutoLote).filter(
        ProdutoLote.lote_id == lote_id,
        ProdutoLote.ativo == True
    ).all()
    
    return produtos_lote

@router.post("/{lote_id}/produtos", response_model=ProdutoLoteSchema)
async def add_produto_to_lote(
    lote_id: int, 
    produto_lote: ProdutoLoteCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Adiciona um produto a um lote."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se lote existe
    lote = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Verificar se produto existe
    produto = db.query(Produto).filter(Produto.id == produto_lote.produto_id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Verificar se o produto já está associado ao lote
    existing_produto_lote = db.query(ProdutoLote).filter(
        ProdutoLote.lote_id == lote_id,
        ProdutoLote.produto_id == produto_lote.produto_id,
        ProdutoLote.ativo == True
    ).first()
    
    if existing_produto_lote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Produto já associado ao lote"
        )
    
    # Adicionar produto ao lote
    db_produto_lote = ProdutoLote(**produto_lote.dict())
    db.add(db_produto_lote)
    db.commit()
    db.refresh(db_produto_lote)
    
    # Adicionar fases do produto ao lote
    produto_fases = db.query(ProdutoFase).filter(
        ProdutoFase.produto_id == produto_lote.produto_id,
        ProdutoFase.ativo == True
    ).order_by(ProdutoFase.ordem).all()
    
    for produto_fase in produto_fases:
        fase_lote = FaseLote(
            lote_id=lote_id,
            fase_id=produto_fase.fase_id,
            produto_id=produto_lote.produto_id,
            ordem=produto_fase.ordem,
            tempo_estimado=produto_fase.tempo_estimado,
            tempo_prateleira_horas=produto_fase.tempo_prateleira_horas,
            ativo=True
        )
        db.add(fase_lote)
    
    db.commit()
    return db_produto_lote

# Rotas para gerenciar fases de um lote
@router.get("/{lote_id}/fases", response_model=List[FaseLoteSchema])
async def get_lote_fases(
    lote_id: int, 
    produto_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna todas as fases de um lote, opcionalmente filtradas por produto."""
    lote = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    query = db.query(FaseLote).filter(
        FaseLote.lote_id == lote_id,
        FaseLote.ativo == True
    )
    
    if produto_id:
        query = query.filter(FaseLote.produto_id == produto_id)
        
    fases_lote = query.order_by(FaseLote.produto_id, FaseLote.ordem).all()
    
    return fases_lote
