from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Produto, ProdutoFase
from app.schemas.schemas import Produto as ProdutoSchema
from app.schemas.schemas import ProdutoCreate, ProdutoUpdate, ProdutoFase as ProdutoFaseSchema
from app.schemas.schemas import ProdutoFaseCreate, ProdutoFaseUpdate

router = APIRouter()

@router.get("/", response_model=List[ProdutoSchema])
async def get_produtos(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de produtos ativos com o número de fases."""
    # Consulta produtos ativos
    produtos = db.query(Produto).filter(Produto.ativo == True).offset(skip).limit(limit).all()
    
    # Adicionar informação sobre o número de fases para cada produto
    for produto in produtos:
        # Consultar quantas fases o produto tem
        num_fases = db.query(ProdutoFase).filter(ProdutoFase.produto_id == produto.id).count()
        setattr(produto, 'num_fases', num_fases)
        
    return produtos

@router.get("/{produto_id}", response_model=ProdutoSchema)
async def get_produto(
    produto_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um produto específico pelo ID."""
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto

@router.post("/", response_model=ProdutoSchema)
async def create_produto(
    produto: ProdutoCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo produto."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe produto com o mesmo código
    db_produto = db.query(Produto).filter(Produto.codigo == produto.codigo).first()
    if db_produto:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de produto já existe"
        )
    
    # Criar novo produto
    db_produto = Produto(**produto.dict())
    db.add(db_produto)
    db.commit()
    db.refresh(db_produto)
    return db_produto

@router.put("/{produto_id}", response_model=ProdutoSchema)
async def update_produto(
    produto_id: int, 
    produto: ProdutoUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um produto existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se produto existe
    db_produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if db_produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Verificar se está tentando atualizar para um código já existente
    if produto.codigo and produto.codigo != db_produto.codigo:
        existing_produto = db.query(Produto).filter(Produto.codigo == produto.codigo).first()
        if existing_produto:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de produto já existe"
            )
    
    # Atualizar produto
    produto_data = produto.dict(exclude_unset=True)
    for key, value in produto_data.items():
        setattr(db_produto, key, value)
    
    db.commit()
    db.refresh(db_produto)
    return db_produto

@router.delete("/{produto_id}", response_model=ProdutoSchema)
async def delete_produto(
    produto_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um produto (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se produto existe
    db_produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if db_produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Desativar produto (exclusão lógica)
    db_produto.ativo = False
    db.commit()
    return db_produto

# Rotas para gerenciar fases de um produto
@router.get("/{produto_id}/fases", response_model=List[ProdutoFaseSchema])
async def get_produto_fases(
    produto_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna todas as fases de um produto."""
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    produto_fases = db.query(ProdutoFase).filter(
        ProdutoFase.produto_id == produto_id,
        ProdutoFase.ativo == True
    ).order_by(ProdutoFase.ordem).all()
    
    return produto_fases

@router.post("/{produto_id}/fases", response_model=ProdutoFaseSchema)
async def add_fase_to_produto(
    produto_id: int, 
    fase: ProdutoFaseCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Adiciona uma fase a um produto."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se produto existe
    produto = db.query(Produto).filter(Produto.id == produto_id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Criar fase para o produto
    db_produto_fase = ProdutoFase(**fase.dict())
    db.add(db_produto_fase)
    db.commit()
    db.refresh(db_produto_fase)
    return db_produto_fase

@router.put("/{produto_id}/fases/{fase_id}", response_model=ProdutoFaseSchema)
async def update_produto_fase(
    produto_id: int, 
    fase_id: int, 
    fase: ProdutoFaseUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza uma fase de um produto."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se a fase do produto existe
    db_produto_fase = db.query(ProdutoFase).filter(
        ProdutoFase.produto_id == produto_id,
        ProdutoFase.fase_id == fase_id,
        ProdutoFase.ativo == True
    ).first()
    
    if db_produto_fase is None:
        raise HTTPException(status_code=404, detail="Fase do produto não encontrada")
    
    # Atualizar fase do produto
    fase_data = fase.dict(exclude_unset=True)
    for key, value in fase_data.items():
        setattr(db_produto_fase, key, value)
    
    db.commit()
    db.refresh(db_produto_fase)
    return db_produto_fase

@router.delete("/{produto_id}/fases/{fase_id}", response_model=ProdutoFaseSchema)
async def delete_produto_fase(
    produto_id: int, 
    fase_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa uma fase de um produto (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se a fase do produto existe
    db_produto_fase = db.query(ProdutoFase).filter(
        ProdutoFase.produto_id == produto_id,
        ProdutoFase.fase_id == fase_id
    ).first()
    
    if db_produto_fase is None:
        raise HTTPException(status_code=404, detail="Fase do produto não encontrada")
    
    # Desativar fase do produto (exclusão lógica)
    db_produto_fase.ativo = False
    db.commit()
    return db_produto_fase
