from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Lote, Fase, Apontamento
from app.models.maquina import FaseMaquina, Maquina

router = APIRouter()

@router.get("/{lote_id}")
async def get_next_steps(
    lote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna informações sobre o próximo passo para um lote específico, 
    incluindo a fase atual, dias na fase, próximos passos e máquinas associadas.
    """
    # Verificar se lote existe
    lote = db.query(Lote).filter(Lote.id == lote_id).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Buscar último apontamento do lote para determinar a fase atual
    ultimo_apontamento = db.query(Apontamento)\
        .filter(Apontamento.lote_id == lote_id)\
        .order_by(desc(Apontamento.data_hora))\
        .first()
    
    if not ultimo_apontamento:
        # Se não houver apontamentos, o lote ainda está na primeira fase
        fase_atual = db.query(Fase).filter(Fase.ativo == True).order_by(Fase.ordem).first()
        if not fase_atual:
            raise HTTPException(status_code=404, detail="Não há fases cadastradas")
        
        data_inicio = lote.data_criacao
        fase_atual_id = fase_atual.id
        ordem_atual = fase_atual.ordem
        status = "Não iniciado"
    else:
        fase_atual_id = ultimo_apontamento.fase_id
        fase_atual = db.query(Fase).filter(Fase.id == fase_atual_id).first()
        if not fase_atual:
            raise HTTPException(status_code=404, detail="Fase atual não encontrada")
        
        data_inicio = ultimo_apontamento.data_hora
        ordem_atual = fase_atual.ordem
        status = "Em processamento"
    
    # Calcular dias na fase atual
    dias_na_fase = (datetime.now() - data_inicio).days

    # Buscar máquinas da fase atual com a ordem correta
    maquinas_fase_atual = db.query(
        Maquina, FaseMaquina.ordem
    ).join(
        FaseMaquina, FaseMaquina.maquina_id == Maquina.id
    ).filter(
        FaseMaquina.fase_id == fase_atual_id,
        Maquina.ativo == True
    ).order_by(
        FaseMaquina.ordem
    ).all()
    
    maquinas_atuais = []
    for maquina, ordem in maquinas_fase_atual:
        maquinas_atuais.append({
            "id": maquina.id,
            "codigo": maquina.codigo,
            "nome": maquina.nome,
            "ordem": ordem,
            "status": maquina.status
        })
    
    # Buscar próximas fases e suas máquinas
    proximas_fases = db.query(Fase)\
        .filter(Fase.ordem > ordem_atual, Fase.ativo == True)\
        .order_by(Fase.ordem)\
        .all()
    
    proximos_passos = []
    for fase in proximas_fases:
        # Buscar máquinas para esta fase
        maquinas_fase = db.query(
            Maquina, FaseMaquina.ordem
        ).join(
            FaseMaquina, FaseMaquina.maquina_id == Maquina.id
        ).filter(
            FaseMaquina.fase_id == fase.id,
            Maquina.ativo == True
        ).order_by(
            FaseMaquina.ordem
        ).all()
        
        maquinas = []
        for maquina, ordem in maquinas_fase:
            maquinas.append({
                "id": maquina.id,
                "codigo": maquina.codigo,
                "nome": maquina.nome,
                "ordem": ordem,
                "status": maquina.status
            })
            
        proximos_passos.append({
            "fase_id": fase.id,
            "fase_nome": fase.nome,
            "fase_ordem": fase.ordem,
            "maquinas": maquinas
        })
    
    return {
        "lote_id": lote.id,
        "lote_codigo": lote.codigo,
        "produto": lote.produto.descricao if lote.produto else "Sem produto",
        "data_criacao": lote.data_criacao,
        "status": status,
        "fase_atual": {
            "id": fase_atual.id,
            "nome": fase_atual.nome,
            "ordem": fase_atual.ordem,
            "dias_na_fase": dias_na_fase,
            "maquinas": maquinas_atuais
        },
        "proximos_passos": proximos_passos
    }
