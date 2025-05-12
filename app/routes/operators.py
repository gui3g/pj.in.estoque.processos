from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Operador
from app.schemas.schemas import Operador as OperadorSchema
from app.schemas.schemas import OperadorCreate, OperadorUpdate

router = APIRouter()

@router.get("/", response_model=List[OperadorSchema])
async def get_operadores(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de operadores ativos."""
    operadores = db.query(Operador).filter(Operador.ativo == True).offset(skip).limit(limit).all()
    return operadores

@router.get("/{operador_id}", response_model=OperadorSchema)
async def get_operador(
    operador_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um operador específico pelo ID."""
    operador = db.query(Operador).filter(Operador.id == operador_id, Operador.ativo == True).first()
    if operador is None:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    return operador

@router.post("/", response_model=OperadorSchema)
async def create_operador(
    operador: OperadorCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo operador."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe operador com o mesmo código
    db_operador = db.query(Operador).filter(Operador.codigo == operador.codigo).first()
    if db_operador:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de operador já existe"
        )
    
    # Criar novo operador
    db_operador = Operador(**operador.dict())
    db.add(db_operador)
    db.commit()
    db.refresh(db_operador)
    return db_operador

@router.put("/{operador_id}", response_model=OperadorSchema)
async def update_operador(
    operador_id: int, 
    operador: OperadorUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um operador existente."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se operador existe
    db_operador = db.query(Operador).filter(Operador.id == operador_id).first()
    if db_operador is None:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    
    # Verificar se está tentando atualizar para um código já existente
    if operador.codigo and operador.codigo != db_operador.codigo:
        existing_operador = db.query(Operador).filter(Operador.codigo == operador.codigo).first()
        if existing_operador:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Código de operador já existe"
            )
    
    # Atualizar operador
    operador_data = operador.dict(exclude_unset=True)
    for key, value in operador_data.items():
        setattr(db_operador, key, value)
    
    db.commit()
    db.refresh(db_operador)
    return db_operador

@router.delete("/{operador_id}", response_model=OperadorSchema)
async def delete_operador(
    operador_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um operador (exclusão lógica)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se operador existe
    db_operador = db.query(Operador).filter(Operador.id == operador_id).first()
    if db_operador is None:
        raise HTTPException(status_code=404, detail="Operador não encontrado")
    
    # Desativar operador (exclusão lógica)
    db_operador.ativo = False
    db.commit()
    return db_operador
