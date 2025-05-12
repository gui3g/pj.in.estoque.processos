from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Fase, ChecklistItem
from app.schemas.schemas import Fase as FaseSchema
from app.schemas.schemas import FaseCreate, FaseUpdate
from app.schemas.schemas import ChecklistItem as ChecklistItemSchema
from app.schemas.schemas import ChecklistItemCreate, ChecklistItemUpdate

router = APIRouter()

@router.get("/", response_model=List[FaseSchema])
async def get_fases(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de fases ativas."""
    fases = db.query(Fase).filter(Fase.ativo == True).offset(skip).limit(limit).all()
    return fases

@router.get("/{fase_id}", response_model=FaseSchema)
async def get_fase(
    fase_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna uma fase específica pelo ID."""
    fase = db.query(Fase).filter(Fase.id == fase_id, Fase.ativo == True).first()
    if fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    return fase

@router.post("/", response_model=FaseSchema)
async def create_fase(
    fase: FaseCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria uma nova fase."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe fase com o mesmo código
    db_fase = db.query(Fase).filter(Fase.codigo == fase.codigo).first()
    if db_fase:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de fase já existe"
        )
    
    # Criar nova fase
    db_fase = Fase(**fase.dict())
    db.add(db_fase)
    db.commit()
    db.refresh(db_fase)
    return db_fase

@router.put("/{fase_id}", response_model=FaseSchema)
async def update_fase(
    fase_id: int, 
    fase: FaseUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza uma fase existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se fase existe
    db_fase = db.query(Fase).filter(Fase.id == fase_id).first()
    if db_fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    # Verificar se está tentando atualizar para um código já existente
    if fase.codigo and fase.codigo != db_fase.codigo:
        existing_fase = db.query(Fase).filter(Fase.codigo == fase.codigo).first()
        if existing_fase:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de fase já existe"
            )
    
    # Atualizar fase
    fase_data = fase.dict(exclude_unset=True)
    for key, value in fase_data.items():
        setattr(db_fase, key, value)
    
    db.commit()
    db.refresh(db_fase)
    return db_fase

@router.delete("/{fase_id}", response_model=FaseSchema)
async def delete_fase(
    fase_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa uma fase (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se fase existe
    db_fase = db.query(Fase).filter(Fase.id == fase_id).first()
    if db_fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    # Desativar fase (exclusão lógica)
    db_fase.ativo = False
    db.commit()
    return db_fase

# Rotas para gerenciar checklist de uma fase
@router.get("/{fase_id}/checklist", response_model=List[ChecklistItemSchema])
async def get_fase_checklist(
    fase_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna o checklist de uma fase."""
    fase = db.query(Fase).filter(Fase.id == fase_id, Fase.ativo == True).first()
    if fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    checklist_items = db.query(ChecklistItem).filter(
        ChecklistItem.fase_id == fase_id,
        ChecklistItem.ativo == True
    ).order_by(ChecklistItem.ordem).all()
    
    return checklist_items

@router.post("/{fase_id}/checklist", response_model=ChecklistItemSchema)
async def add_checklist_item(
    fase_id: int, 
    checklist_item: ChecklistItemCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Adiciona um item ao checklist de uma fase."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se fase existe
    fase = db.query(Fase).filter(Fase.id == fase_id, Fase.ativo == True).first()
    if fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    # Criar item de checklist
    db_checklist_item = ChecklistItem(**checklist_item.dict())
    db.add(db_checklist_item)
    db.commit()
    db.refresh(db_checklist_item)
    return db_checklist_item

@router.put("/{fase_id}/checklist/{item_id}", response_model=ChecklistItemSchema)
async def update_checklist_item(
    fase_id: int, 
    item_id: int, 
    checklist_item: ChecklistItemUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um item do checklist de uma fase."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se item de checklist existe
    db_checklist_item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.fase_id == fase_id,
        ChecklistItem.ativo == True
    ).first()
    
    if db_checklist_item is None:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    
    # Atualizar item de checklist
    checklist_item_data = checklist_item.dict(exclude_unset=True)
    for key, value in checklist_item_data.items():
        setattr(db_checklist_item, key, value)
    
    db.commit()
    db.refresh(db_checklist_item)
    return db_checklist_item

@router.delete("/{fase_id}/checklist/{item_id}", response_model=ChecklistItemSchema)
async def delete_checklist_item(
    fase_id: int, 
    item_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um item do checklist de uma fase (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se item de checklist existe
    db_checklist_item = db.query(ChecklistItem).filter(
        ChecklistItem.id == item_id,
        ChecklistItem.fase_id == fase_id
    ).first()
    
    if db_checklist_item is None:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    
    # Desativar item de checklist (exclusão lógica)
    db_checklist_item.ativo = False
    db.commit()
    return db_checklist_item
