from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Maquina
from app.schemas.schemas import Maquina as MaquinaSchema
from app.schemas.schemas import MaquinaCreate, MaquinaUpdate

router = APIRouter()

@router.get("/", response_model=List[MaquinaSchema])
async def get_maquinas(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de máquinas ativas."""
    maquinas = db.query(Maquina).filter(Maquina.ativo == True).offset(skip).limit(limit).all()
    return maquinas

@router.get("/{maquina_id}", response_model=MaquinaSchema)
async def get_maquina(
    maquina_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna uma máquina específica pelo ID."""
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id, Maquina.ativo == True).first()
    if maquina is None:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    return maquina

@router.post("/", response_model=MaquinaSchema)
async def create_maquina(
    maquina: MaquinaCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria uma nova máquina."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe máquina com o mesmo código
    db_maquina = db.query(Maquina).filter(Maquina.codigo == maquina.codigo).first()
    if db_maquina:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de máquina já existe"
        )
    
    # Criar nova máquina
    db_maquina = Maquina(**maquina.dict())
    db.add(db_maquina)
    db.commit()
    db.refresh(db_maquina)
    return db_maquina

@router.put("/{maquina_id}", response_model=MaquinaSchema)
async def update_maquina(
    maquina_id: int, 
    maquina: MaquinaUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza uma máquina existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se máquina existe
    db_maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if db_maquina is None:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    
    # Verificar se está tentando atualizar para um código já existente
    if maquina.codigo and maquina.codigo != db_maquina.codigo:
        existing_maquina = db.query(Maquina).filter(Maquina.codigo == maquina.codigo).first()
        if existing_maquina:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de máquina já existe"
            )
    
    # Atualizar máquina
    maquina_data = maquina.dict(exclude_unset=True)
    for key, value in maquina_data.items():
        setattr(db_maquina, key, value)
    
    db.commit()
    db.refresh(db_maquina)
    return db_maquina

@router.delete("/{maquina_id}", response_model=MaquinaSchema)
async def delete_maquina(
    maquina_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa uma máquina (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se máquina existe
    db_maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if db_maquina is None:
        raise HTTPException(status_code=404, detail="Máquina não encontrada")
    
    # Desativar máquina (exclusão lógica)
    db_maquina.ativo = False
    db.commit()
    return db_maquina
