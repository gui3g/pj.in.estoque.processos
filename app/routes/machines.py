from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.maquina import Maquina, FaseMaquina
from app.models.models import Fase
from app.schemas.schemas import Maquina as MaquinaSchema
from app.schemas.schemas import MaquinaCreate, MaquinaUpdate
import qrcode
import io
import base64
import os
import time
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from datetime import datetime
import uuid

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")

# Diretório para armazenar QR Codes
QR_CODES_DIR = "app/static/qrcodes"
os.makedirs(QR_CODES_DIR, exist_ok=True)

# Rota para servir QR codes estáticos
@router.get("/qrcode/{filename}")
async def get_qrcode(filename: str):
    """Retorna a imagem do QR code pelo nome do arquivo."""
    qrcode_path = os.path.join(QR_CODES_DIR, filename)
    if not os.path.exists(qrcode_path):
        raise HTTPException(status_code=404, detail="QR Code não encontrado")
    return FileResponse(qrcode_path)

@router.get("/codigo/{codigo}", response_model=MaquinaSchema)
async def get_maquina_by_codigo(
    codigo: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna uma máquina pelo seu código."""
    maquina = db.query(Maquina).filter(Maquina.codigo == codigo).first()
    if not maquina:
        raise HTTPException(status_code=404, detail=f"Máquina com código {codigo} não encontrada")
    
    return maquina

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

@router.get("/admin/page", response_class=HTMLResponse)
async def machines_admin_page(request: Request, current_user: dict = Depends(get_current_user)):
    """Renderiza a página de administração de máquinas."""
    if current_user.get("role") != "admin":
        return HTMLResponse(content="<h1>Acesso não autorizado</h1>", status_code=403)
    
    return templates.TemplateResponse(
        "admin/machines.html",
        {"request": request, "active_page": "machines"}
    )

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
    
    # Gerar e salvar QR code para a máquina
    qr_code_filename = f"maquina_{int(time.time())}_{uuid.uuid4().hex[:8]}.png"
    qr_code_path = os.path.join(QR_CODES_DIR, qr_code_filename)
    
    # O QR code conterá o ID da máquina para ser escaneado pelo operador
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    
    # O conteúdo do QR code será uma URL relativa que pode ser acessada pelo operador
    # para vincular a máquina na operação
    qr_data = f"maquina:{maquina.codigo}:{maquina.nome}"
    qr.add_data(qr_data)
    qr.make(fit=True)
    
    img = qr.make_image(fill='black', back_color='white')
    img.save(qr_code_path)
    
    # Salvar o caminho relativo no banco de dados
    relative_path = f"qrcodes/{qr_code_filename}"
    db_maquina.qrcode = relative_path
    
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

@router.get("/qrcode/{maquina_id}")
async def get_qrcode(
    maquina_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a imagem do QR code de uma máquina."""
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    if not maquina or not maquina.qrcode:
        raise HTTPException(status_code=404, detail="QR Code não encontrado")
    
    file_path = f"app/static/{maquina.qrcode}"
    return FileResponse(file_path)

@router.get("/fases")
async def get_maquinas_por_fase(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna todas as máquinas agrupadas por fase."""
    # Buscar todas as fases
    fases = db.query(Fase).filter(Fase.ativo == True).all()
    
    resultado = []
    for fase in fases:
        maquinas_associadas = (
            db.query(FaseMaquina, Maquina)
            .join(Maquina, FaseMaquina.maquina_id == Maquina.id)
            .filter(FaseMaquina.fase_id == fase.id)
            .order_by(FaseMaquina.ordem)
            .all()
        )
        
        maquinas_lista = []
        for assoc, maquina in maquinas_associadas:
            maquina_dict = maquina.to_dict()
            maquina_dict["ordem"] = assoc.ordem
            maquinas_lista.append(maquina_dict)
        
        resultado.append({
            "fase_id": fase.id,
            "fase_nome": fase.nome,
            "maquinas": maquinas_lista
        })
    
    return resultado

@router.post("/associar-fase")
async def associar_maquina_fase(
    fase_id: int,
    maquina_id: int,
    ordem: int = 1,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Associa uma máquina a uma fase com uma ordem específica."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se fase e máquina existem
    fase = db.query(Fase).filter(Fase.id == fase_id).first()
    maquina = db.query(Maquina).filter(Maquina.id == maquina_id).first()
    
    if not fase or not maquina:
        raise HTTPException(status_code=404, detail="Fase ou máquina não encontrada")
    
    # Verificar se já existe uma associação entre essa fase e máquina
    existing = db.query(FaseMaquina).filter(
        FaseMaquina.fase_id == fase_id,
        FaseMaquina.maquina_id == maquina_id
    ).first()
    
    if existing:
        # Atualizar a ordem
        existing.ordem = ordem
        db.commit()
        return {"message": "Ordem da máquina atualizada na fase"}
    
    # Criar nova associação
    nova_associacao = FaseMaquina(
        fase_id=fase_id,
        maquina_id=maquina_id,
        ordem=ordem
    )
    
    db.add(nova_associacao)
    db.commit()
    
    return {"message": "Máquina associada à fase com sucesso"}

@router.delete("/desassociar-fase")
async def desassociar_maquina_fase(
    fase_id: int,
    maquina_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Remove a associação entre uma máquina e uma fase."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Buscar a associação
    associacao = db.query(FaseMaquina).filter(
        FaseMaquina.fase_id == fase_id,
        FaseMaquina.maquina_id == maquina_id
    ).first()
    
    if not associacao:
        raise HTTPException(status_code=404, detail="Associação não encontrada")
    
    # Remover a associação
    db.delete(associacao)
    db.commit()
    
    return {"message": "Associação removida com sucesso"}

@router.post("/reordenar")
async def reordenar_maquinas_fase(
    fase_id: int,
    nova_ordem: List[Dict[str, int]],  # Lista de {maquina_id: int, ordem: int}
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reordena as máquinas de uma fase."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se fase existe
    fase = db.query(Fase).filter(Fase.id == fase_id).first()
    if not fase:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    # Atualizar ordem de cada máquina
    for item in nova_ordem:
        maquina_id = item.get("maquina_id")
        ordem = item.get("ordem")
        
        associacao = db.query(FaseMaquina).filter(
            FaseMaquina.fase_id == fase_id,
            FaseMaquina.maquina_id == maquina_id
        ).first()
        
        if associacao:
            associacao.ordem = ordem
    
    db.commit()
    return {"message": "Ordem das máquinas atualizada com sucesso"}
