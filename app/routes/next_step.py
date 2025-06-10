from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Lote, Produto, Fase, ProdutoFase, FaseLote, Apontamento
from typing import List, Optional

router = APIRouter()

@router.get("/next-steps/{lote_id}")
async def get_next_steps(
    lote_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna o próximo passo para um lote específico.
    Identifica quais fases já foram concluídas e quais são as próximas
    a serem executadas de acordo com a sequência definida no produto.
    """
    # Verificar se o lote existe
    lote = db.query(Lote).filter(Lote.id == lote_id, Lote.ativo == True).first()
    if not lote:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    # Buscar o produto associado ao lote
    produto = db.query(Produto).filter(Produto.id == lote.produto_id, Produto.ativo == True).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    # Buscar as fases do produto em ordem
    produto_fases = db.query(ProdutoFase).filter(
        ProdutoFase.produto_id == produto.id,
        ProdutoFase.ativo == True
    ).order_by(ProdutoFase.ordem).all()
    
    if not produto_fases:
        return {
            "lote": {
                "id": lote.id,
                "codigo": lote.codigo,
                "status": lote.status
            },
            "produto": {
                "id": produto.id,
                "codigo": produto.codigo,
                "descricao": produto.descricao
            },
            "proximos_passos": [],
            "progresso": 0,
            "message": "Não há fases definidas para este produto"
        }
    
    # Buscar as fases que já foram concluídas para este lote
    fases_concluidas = db.query(FaseLote).filter(
        FaseLote.lote_id == lote.id,
        FaseLote.data_fim.isnot(None),
        FaseLote.ativo == True
    ).all()
    
    fases_concluidas_ids = [fl.fase_id for fl in fases_concluidas]
    
    # Identificar próxima(s) fase(s)
    proximos_passos = []
    for pf in produto_fases:
        fase = db.query(Fase).filter(Fase.id == pf.fase_id, Fase.ativo == True).first()
        if not fase:
            continue
            
        # Verificar se a fase já foi concluída
        concluida = fase.id in fases_concluidas_ids
        
        # Adicionar informações detalhadas sobre a fase e seu status
        fase_info = {
            "fase_id": fase.id,
            "codigo": fase.codigo,
            "descricao": fase.descricao,
            "ordem": pf.ordem,
            "concluida": concluida,
            "proximo": False
        }
        
        # Se não concluída, pode ser a próxima
        if not concluida:
            # Verificar se é a próxima na sequência
            # Uma fase é considerada a próxima se todas as fases anteriores já foram concluídas
            fases_anteriores = [
                f.fase_id for f in produto_fases 
                if f.ordem < pf.ordem and f.fase_id not in fases_concluidas_ids
            ]
            
            if not fases_anteriores:
                fase_info["proximo"] = True
                
                # Verificar se já existe um apontamento em andamento para esta fase
                apontamento_em_andamento = db.query(Apontamento).filter(
                    Apontamento.lote_id == lote.id,
                    Apontamento.fase_id == fase.id,
                    Apontamento.data_inicio.isnot(None),
                    Apontamento.data_fim.is_(None),
                    Apontamento.ativo == True
                ).first()
                
                fase_info["em_andamento"] = bool(apontamento_em_andamento)
                if apontamento_em_andamento:
                    fase_info["apontamento_id"] = apontamento_em_andamento.id
                    fase_info["operador_id"] = apontamento_em_andamento.usuario_id
                    
                    # Buscar nome do operador
                    from app.models.models import Usuario
                    operador = db.query(Usuario).filter(Usuario.id == apontamento_em_andamento.usuario_id).first()
                    fase_info["operador_nome"] = operador.nome if operador else "Desconhecido"
                
        proximos_passos.append(fase_info)
    
    # Calcular progresso
    total_fases = len(produto_fases)
    fases_concluidas_count = len(fases_concluidas)
    progresso = (fases_concluidas_count / total_fases) * 100 if total_fases > 0 else 0
    
    return {
        "lote": {
            "id": lote.id,
            "codigo": lote.codigo,
            "status": lote.status
        },
        "produto": {
            "id": produto.id,
            "codigo": produto.codigo,
            "descricao": produto.descricao
        },
        "proximos_passos": proximos_passos,
        "progresso": round(progresso, 1),
        "total_fases": total_fases,
        "fases_concluidas": fases_concluidas_count
    }
