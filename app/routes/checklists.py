from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import ChecklistItem, ChecklistResposta
from app.schemas.schemas import ChecklistItem as ChecklistItemSchema
from app.schemas.schemas import ChecklistItemCreate, ChecklistItemUpdate

router = APIRouter()

@router.get("/", response_model=List[ChecklistItemSchema])
async def get_checklist_items(
    skip: int = 0, 
    limit: int = 100, 
    fase_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de itens de checklist, opcionalmente filtrados por fase."""
    query = db.query(ChecklistItem).filter(ChecklistItem.ativo == True)
    
    if fase_id:
        query = query.filter(ChecklistItem.fase_id == fase_id)
    
    checklist_items = query.order_by(ChecklistItem.fase_id, ChecklistItem.ordem).offset(skip).limit(limit).all()
    return checklist_items

@router.get("/{item_id}", response_model=ChecklistItemSchema)
async def get_checklist_item(
    item_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um item de checklist específico pelo ID."""
    item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id, ChecklistItem.ativo == True).first()
    if item is None:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    return item

@router.post("/", response_model=ChecklistItemSchema)
async def create_checklist_item(
    item: ChecklistItemCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo item de checklist."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Criar novo item de checklist
    db_item = ChecklistItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/{item_id}", response_model=ChecklistItemSchema)
async def update_checklist_item(
    item_id: int, 
    item: ChecklistItemUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um item de checklist existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se item existe
    db_item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    
    # Atualizar item
    item_data = item.dict(exclude_unset=True)
    for key, value in item_data.items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}", response_model=ChecklistItemSchema)
async def delete_checklist_item(
    item_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um item de checklist (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se item existe
    db_item = db.query(ChecklistItem).filter(ChecklistItem.id == item_id).first()
    if db_item is None:
        raise HTTPException(status_code=404, detail="Item de checklist não encontrado")
    
    # Desativar item (exclusão lógica)
    db_item.ativo = False
    db.commit()
    return db_item
