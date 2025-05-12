from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Apontamento, ProdutoLote, FaseLote, ChecklistItem, ChecklistResposta
from app.schemas.schemas import (
    ApontamentoCreate, ApontamentoUpdate, ApontamentoResponse, 
    ChecklistRespostaCreate, ChecklistItemResponse
)
from app.schemas.schemas import Apontamento as ApontamentoSchema
from app.schemas.schemas import ChecklistResposta as ChecklistRespostaSchema
from app.schemas.schemas import ChecklistRespostaCreate
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/", response_model=List[ApontamentoSchema])
async def get_apontamentos(
    skip: int = 0, 
    limit: int = 100,
    lote_id: Optional[int] = None,
    produto_id: Optional[int] = None,
    fase_id: Optional[int] = None,
    operador_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de apontamentos, com filtros opcionais."""
    query = db.query(Apontamento)
    
    if lote_id:
        query = query.filter(Apontamento.lote_id == lote_id)
    if produto_id:
        query = query.filter(Apontamento.produto_id == produto_id)
    if fase_id:
        query = query.filter(Apontamento.fase_id == fase_id)
    if operador_id:
        query = query.filter(Apontamento.operador_id == operador_id)
    if status:
        query = query.filter(Apontamento.status == status)
    
    apontamentos = query.order_by(Apontamento.data_inicio.desc()).offset(skip).limit(limit).all()
    return apontamentos

@router.get("/{apontamento_id}", response_model=ApontamentoSchema)
async def get_apontamento(
    apontamento_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um apontamento específico pelo ID."""
    apontamento = db.query(Apontamento).filter(Apontamento.id == apontamento_id).first()
    if apontamento is None:
        raise HTTPException(status_code=404, detail="Apontamento não encontrado")
    return apontamento

@router.post("/", response_model=ApontamentoSchema)
async def create_apontamento(
    apontamento: ApontamentoCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Inicia um novo apontamento (início de uma fase)."""
    # Verificar se lote, produto e fase existem
    lote = db.query(Lote).filter(Lote.id == apontamento.lote_id, Lote.ativo == True).first()
    if lote is None:
        raise HTTPException(status_code=404, detail="Lote não encontrado")
    
    produto = db.query(Produto).filter(Produto.id == apontamento.produto_id, Produto.ativo == True).first()
    if produto is None:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    
    fase = db.query(Fase).filter(Fase.id == apontamento.fase_id, Fase.ativo == True).first()
    if fase is None:
        raise HTTPException(status_code=404, detail="Fase não encontrada")
    
    # Verificar se já existe um apontamento em andamento para este lote, produto e fase
    apontamento_em_andamento = db.query(Apontamento).filter(
        Apontamento.lote_id == apontamento.lote_id,
        Apontamento.produto_id == apontamento.produto_id,
        Apontamento.fase_id == apontamento.fase_id,
        Apontamento.status == "iniciado"
    ).first()
    
    if apontamento_em_andamento:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um apontamento em andamento para este lote, produto e fase"
        )
    
    # Criar novo apontamento
    db_apontamento = Apontamento(
        lote_id=apontamento.lote_id,
        produto_id=apontamento.produto_id,
        fase_id=apontamento.fase_id,
        operador_id=current_user["id"],  # Usar o ID do usuário atual
        data_inicio=datetime.utcnow(),
        status="iniciado",
        observacoes=apontamento.observacoes
    )
    
    db.add(db_apontamento)
    db.commit()
    db.refresh(db_apontamento)
    return db_apontamento

@router.put("/{apontamento_id}", response_model=ApontamentoSchema)
async def update_apontamento(
    apontamento_id: int, 
    apontamento: ApontamentoUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um apontamento (finalização ou alteração de uma fase)."""
    # Verificar se apontamento existe
    db_apontamento = db.query(Apontamento).filter(Apontamento.id == apontamento_id).first()
    if db_apontamento is None:
        raise HTTPException(status_code=404, detail="Apontamento não encontrado")
    
    # Se estiver finalizando o apontamento, verificar se todos os itens obrigatórios do checklist foram concluídos
    if apontamento.status == "finalizado":
        checklist_items = db.query(ChecklistItem).filter(
            ChecklistItem.fase_id == db_apontamento.fase_id,
            ChecklistItem.obrigatorio == True,
            ChecklistItem.ativo == True
        ).all()
        
        for item in checklist_items:
            resposta = db.query(ChecklistResposta).filter(
                ChecklistResposta.apontamento_id == apontamento_id,
                ChecklistResposta.checklist_item_id == item.id,
                ChecklistResposta.concluido == True
            ).first()
            
            if not resposta:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item obrigatório do checklist não concluído: {item.descricao}"
                )
        
        # Definir data de fim e calcular tempo real
        apontamento.data_fim = datetime.utcnow()
        delta = apontamento.data_fim - db_apontamento.data_inicio
        apontamento.tempo_real = int(delta.total_seconds() // 60)  # Tempo em minutos
    
    # Atualizar apontamento
    apontamento_data = apontamento.dict(exclude_unset=True)
    for key, value in apontamento_data.items():
        setattr(db_apontamento, key, value)
    
    db.commit()
    db.refresh(db_apontamento)
    return db_apontamento

@router.get("/{apontamento_id}/checklist", response_model=List[ChecklistRespostaSchema])
async def get_apontamento_checklist(
    apontamento_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna o checklist de um apontamento."""
    apontamento = db.query(Apontamento).filter(Apontamento.id == apontamento_id).first()
    if apontamento is None:
        raise HTTPException(status_code=404, detail="Apontamento não encontrado")
    
    checklist_respostas = db.query(ChecklistResposta).filter(
        ChecklistResposta.apontamento_id == apontamento_id
    ).all()
    
    return checklist_respostas

@router.post("/{apontamento_id}/checklist", response_model=ChecklistRespostaSchema)
async def answer_checklist_item(
    apontamento_id: int, 
    resposta: ChecklistRespostaCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Responde a um item do checklist de um apontamento."""
    # Verificar se apontamento existe
    apontamento = db.query(Apontamento).filter(Apontamento.id == apontamento_id).first()
    if apontamento is None:
        raise HTTPException(status_code=404, detail="Apontamento não encontrado")
    
    # Verificar se checklist item existe e pertence à fase do apontamento
    checklist_item = db.query(ChecklistItem).filter(
        ChecklistItem.id == resposta.checklist_item_id,
        ChecklistItem.fase_id == apontamento.fase_id,
        ChecklistItem.ativo == True
    ).first()
    
    if checklist_item is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Item de checklist não encontrado ou não pertence à fase deste apontamento"
        )
    
    # Verificar se já existe uma resposta para este item
    existing_resposta = db.query(ChecklistResposta).filter(
        ChecklistResposta.apontamento_id == apontamento_id,
        ChecklistResposta.checklist_item_id == resposta.checklist_item_id
    ).first()
    
    if existing_resposta:
        # Atualizar resposta existente
        existing_resposta.concluido = resposta.concluido
        existing_resposta.observacao = resposta.observacao
        existing_resposta.data_resposta = datetime.utcnow()
        db.commit()
        db.refresh(existing_resposta)
        return existing_resposta
    else:
        # Criar nova resposta
        db_resposta = ChecklistResposta(
            apontamento_id=apontamento_id,
            checklist_item_id=resposta.checklist_item_id,
            concluido=resposta.concluido,
            observacao=resposta.observacao,
            data_resposta=datetime.utcnow()
        )
        
        db.add(db_resposta)
        db.commit()
        db.refresh(db_resposta)
        return db_resposta

@router.get("/appointments/active", response_model=ApontamentoResponse)
async def get_active_appointment(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém o apontamento ativo do usuário atual."""
    user_id = current_user["id"]
    
    # Buscar apontamento ativo (com data_inicio mas sem data_fim)
    apontamento = db.query(Apontamento).filter(
        Apontamento.usuario_id == user_id,
        Apontamento.data_inicio.isnot(None),
        Apontamento.data_fim.is_(None),
        Apontamento.ativo == True
    ).first()
    
    if not apontamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Nenhum apontamento ativo encontrado"
        )
    
    # Buscar fase do lote relacionada
    fase_lote = db.query(FaseLote).filter(
        FaseLote.id == apontamento.fase_lote_id,
        FaseLote.ativo == True
    ).first()
    
    if not fase_lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fase do lote não encontrada"
        )
    
    # Buscar fase
    from app.models.models import Fase
    fase = db.query(Fase).filter(
        Fase.id == fase_lote.fase_id,
        Fase.ativo == True
    ).first()
    
    # Buscar lote
    from app.models.models import Lote
    lote = db.query(Lote).filter(
        Lote.id == fase_lote.lote_id,
        Lote.ativo == True
    ).first()
    
    # Verificar se há checklist para essa fase
    requires_checklist = db.query(ChecklistItem).filter(
        ChecklistItem.fase_id == fase_lote.fase_id,
        ChecklistItem.ativo == True
    ).count() > 0
    
    # Verificar se o checklist já foi preenchido
    checklist_complete = False
    if requires_checklist:
        checklist_count = db.query(ChecklistResposta).filter(
            ChecklistResposta.apontamento_id == apontamento.id,
            ChecklistResposta.ativo == True
        ).count()
        
        # Se há respostas para todos os itens do checklist, está completo
        required_items = db.query(ChecklistItem).filter(
            ChecklistItem.fase_id == fase_lote.fase_id,
            ChecklistItem.ativo == True
        ).count()
        
        checklist_complete = (checklist_count >= required_items)
    
    # Construir resposta
    response = {
        "id": apontamento.id,
        "fase_lote_id": apontamento.fase_lote_id,
        "lote_id": lote.id if lote else None,
        "lote_codigo": lote.codigo if lote else None,
        "fase_id": fase.id if fase else None,
        "fase_descricao": fase.descricao if fase else None,
        "data_inicio": apontamento.data_inicio,
        "data_fim": apontamento.data_fim,
        "observacoes": apontamento.observacoes,
        "tempo_estimado": fase_lote.tempo_estimado or 0,
        "requires_checklist": requires_checklist,
        "checklist_complete": checklist_complete
    }
    
    return response

@router.post("/appointments/start", response_model=ApontamentoResponse)
async def start_appointment(
    data: ApontamentoCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Inicia um novo apontamento para uma fase de lote."""
    user_id = current_user["id"]
    
    # Verificar se já existe um apontamento ativo para o usuário
    apontamento_ativo = db.query(Apontamento).filter(
        Apontamento.usuario_id == user_id,
        Apontamento.data_inicio.isnot(None),
        Apontamento.data_fim.is_(None),
        Apontamento.ativo == True
    ).first()
    
    if apontamento_ativo:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Já existe um apontamento em andamento. Finalize-o antes de iniciar outro."
        )
    
    # Verificar se a fase do lote existe
    fase_lote = db.query(FaseLote).filter(
        FaseLote.id == data.fase_lote_id,
        FaseLote.ativo == True
    ).first()
    
    if not fase_lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fase do lote não encontrada"
        )
    
    # Verificar se a fase já foi concluída
    if fase_lote.data_fim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta fase já foi concluída"
        )
    
    # Verificar se já existe algum apontamento em andamento para esta fase
    apontamento_existente = db.query(Apontamento).filter(
        Apontamento.fase_lote_id == data.fase_lote_id,
        Apontamento.data_inicio.isnot(None),
        Apontamento.data_fim.is_(None),
        Apontamento.ativo == True
    ).first()
    
    if apontamento_existente:
        if apontamento_existente.usuario_id == user_id:
            # Retornar o apontamento existente se for do mesmo usuário
            return await get_active_appointment(current_user, db)
        else:
            # Se for de outro usuário, gerar erro
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta fase já está sendo executada por outro operador"
            )
    
    # Criar novo apontamento
    novo_apontamento = Apontamento(
        fase_lote_id=data.fase_lote_id,
        usuario_id=user_id,
        data_inicio=datetime.utcnow(),
        observacoes=data.observacoes,
        ativo=True
    )
    
    db.add(novo_apontamento)
    db.commit()
    db.refresh(novo_apontamento)
    
    # Atualizar a fase do lote com data de início se não tiver
    if not fase_lote.data_inicio:
        fase_lote.data_inicio = datetime.utcnow()
        db.commit()
        db.refresh(fase_lote)
    
    # Buscar fase
    from app.models.models import Fase
    fase = db.query(Fase).filter(
        Fase.id == fase_lote.fase_id,
        Fase.ativo == True
    ).first()
    
    # Buscar lote
    from app.models.models import Lote
    lote = db.query(Lote).filter(
        Lote.id == fase_lote.lote_id,
        Lote.ativo == True
    ).first()
    
    # Verificar se há checklist para essa fase
    requires_checklist = db.query(ChecklistItem).filter(
        ChecklistItem.fase_id == fase_lote.fase_id,
        ChecklistItem.ativo == True
    ).count() > 0
    
    # Construir resposta
    response = {
        "id": novo_apontamento.id,
        "fase_lote_id": novo_apontamento.fase_lote_id,
        "lote_id": lote.id if lote else None,
        "lote_codigo": lote.codigo if lote else None,
        "fase_id": fase.id if fase else None,
        "fase_descricao": fase.descricao if fase else None,
        "data_inicio": novo_apontamento.data_inicio,
        "data_fim": None,
        "observacoes": novo_apontamento.observacoes,
        "tempo_estimado": fase_lote.tempo_estimado or 0,
        "requires_checklist": requires_checklist,
        "checklist_complete": False
    }
    
    return response

@router.post("/appointments/finish")
async def finish_appointment(
    data: ApontamentoUpdate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Finaliza um apontamento em andamento."""
    user_id = current_user["id"]
    
    # Buscar o apontamento pelo ID
    apontamento = db.query(Apontamento).filter(
        Apontamento.id == data.apontamento_id,
        Apontamento.ativo == True
    ).first()
    
    if not apontamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Apontamento não encontrado"
        )
    
    # Verificar se o apontamento pertence ao usuário atual
    if apontamento.usuario_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para finalizar este apontamento"
        )
    
    # Verificar se o apontamento já foi finalizado
    if apontamento.data_fim:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Este apontamento já foi finalizado"
        )
    
    # Buscar fase do lote
    fase_lote = db.query(FaseLote).filter(
        FaseLote.id == apontamento.fase_lote_id,
        FaseLote.ativo == True
    ).first()
    
    if not fase_lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fase do lote não encontrada"
        )
    
    # Verificar se há checklist para essa fase
    checklist_items = db.query(ChecklistItem).filter(
        ChecklistItem.fase_id == fase_lote.fase_id,
        ChecklistItem.ativo == True
    ).all()
    
    # Se houver checklist e não foram enviadas respostas
    if checklist_items and not data.checklist_respostas:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Esta fase requer o preenchimento do checklist"
        )
    
    # Processar respostas do checklist, se houver
    if data.checklist_respostas:
        # Registrar respostas do checklist
        for resposta_data in data.checklist_respostas:
            nova_resposta = ChecklistResposta(
                apontamento_id=apontamento.id,
                checklist_item_id=resposta_data.checklist_item_id,
                resposta=resposta_data.resposta,
                ativo=True
            )
            db.add(nova_resposta)
    
    # Atualizar apontamento
    apontamento.data_fim = datetime.utcnow()
    
    if data.observacoes:
        apontamento.observacoes = data.observacoes
    
    # Calcular tempo excedido
    if fase_lote.tempo_estimado:
        tempo_real = (apontamento.data_fim - apontamento.data_inicio).total_seconds() / 60
        apontamento.excedeu_tempo = tempo_real > fase_lote.tempo_estimado
        apontamento.tempo_atraso = max(0, tempo_real - fase_lote.tempo_estimado) if apontamento.excedeu_tempo else 0
    
    db.commit()
    
    # Verificar se é a última fase do lote a ser concluída
    from app.models.models import Lote
    lote = db.query(Lote).filter(
        Lote.id == fase_lote.lote_id,
        Lote.ativo == True
    ).first()
    
    # Atualizar fase do lote
    fase_lote.data_fim = datetime.utcnow()
    db.commit()
    
    # Verificar se todas as fases foram concluídas
    fases_pendentes = db.query(FaseLote).filter(
        FaseLote.lote_id == lote.id,
        FaseLote.data_fim == None,
        FaseLote.ativo == True
    ).count()
    
    # Se não houver mais fases pendentes, finalizar o lote
    if fases_pendentes == 0 and lote.status != "concluido":
        lote.status = "concluido"
        lote.data_conclusao = datetime.utcnow()
        db.commit()
    
    return {"message": "Apontamento finalizado com sucesso"}

@router.get("/appointments/{apontamento_id}/checklist", response_model=List[ChecklistItemResponse])
async def get_appointment_checklist(
    apontamento_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém os itens de checklist para um apontamento."""
    # Verificar se o apontamento existe
    apontamento = db.query(Apontamento).filter(
        Apontamento.id == apontamento_id,
        Apontamento.ativo == True
    ).first()
    
    if not apontamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Apontamento não encontrado"
        )
    
    # Verificar se o apontamento pertence ao usuário atual
    if apontamento.usuario_id != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Você não tem permissão para acessar este apontamento"
        )
    
    # Buscar fase do lote
    fase_lote = db.query(FaseLote).filter(
        FaseLote.id == apontamento.fase_lote_id,
        FaseLote.ativo == True
    ).first()
    
    if not fase_lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Fase do lote não encontrada"
        )
    
    # Buscar itens do checklist para essa fase
    checklist_items = db.query(ChecklistItem).filter(
        ChecklistItem.fase_id == fase_lote.fase_id,
        ChecklistItem.ativo == True
    ).all()
    
    # Formatar resposta
    result = []
    for item in checklist_items:
        result.append({
            "id": item.id,
            "descricao": item.descricao,
            "obrigatorio": item.obrigatorio
        })
    
    return result

@router.get("/batches/available")
async def get_available_batches(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém os lotes disponíveis para o operador."""
    from app.models.models import Lote, Produto
    
    # Buscar lotes que não estejam concluídos ou cancelados
    lotes = db.query(Lote).filter(
        Lote.status.in_(["em_producao", "em_pausa"]),
        Lote.ativo == True
    ).order_by(Lote.data_criacao.desc()).all()
    
    result = []
    for lote in lotes:
        # Buscar produto associado ao lote
        produto_lote = db.query(ProdutoLote).filter(
            ProdutoLote.lote_id == lote.id,
            ProdutoLote.ativo == True
        ).first()
        
        produto_nome = ""
        if produto_lote:
            produto = db.query(Produto).filter(
                Produto.id == produto_lote.produto_id,
                Produto.ativo == True
            ).first()
            if produto:
                produto_nome = produto.descricao
        
        result.append({
            "id": lote.id,
            "codigo": lote.codigo,
            "produto": produto_nome,
            "status": lote.status
        })
    
    return result

@router.get("/batches/{lote_id}")
async def get_batch_details(
    lote_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém os detalhes de um lote específico."""
    from app.models.models import Lote, Produto
    
    # Buscar lote
    lote = db.query(Lote).filter(
        Lote.id == lote_id,
        Lote.ativo == True
    ).first()
    
    if not lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lote não encontrado"
        )
    
    # Buscar produto associado ao lote
    produto_lote = db.query(ProdutoLote).filter(
        ProdutoLote.lote_id == lote.id,
        ProdutoLote.ativo == True
    ).first()
    
    produto_nome = ""
    produto_id = None
    if produto_lote:
        produto = db.query(Produto).filter(
            Produto.id == produto_lote.produto_id,
            Produto.ativo == True
        ).first()
        if produto:
            produto_nome = produto.descricao
            produto_id = produto.id
    
    return {
        "id": lote.id,
        "codigo": lote.codigo,
        "produto": produto_nome,
        "produto_id": produto_id,
        "data_criacao": lote.data_criacao,
        "status": lote.status,
        "observacoes": lote.observacoes
    }

@router.get("/batches/{lote_id}/phases")
async def get_batch_phases(
    lote_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém as fases de um lote específico."""
    from app.models.models import Fase
    
    # Verificar se o lote existe
    from app.models.models import Lote
    lote = db.query(Lote).filter(
        Lote.id == lote_id,
        Lote.ativo == True
    ).first()
    
    if not lote:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lote não encontrado"
        )
    
    # Buscar fases do lote
    fases_lote = db.query(FaseLote).filter(
        FaseLote.lote_id == lote_id,
        FaseLote.ativo == True
    ).order_by(FaseLote.ordem).all()
    
    result = []
    for fase_lote in fases_lote:
        # Buscar fase
        fase = db.query(Fase).filter(
            Fase.id == fase_lote.fase_id,
            Fase.ativo == True
        ).first()
        
        if fase:
            result.append({
                "id": fase_lote.id,
                "fase_id": fase.id,
                "fase_descricao": fase.descricao,
                "ordem": fase_lote.ordem,
                "tempo_estimado": fase_lote.tempo_estimado,
                "data_inicio": fase_lote.data_inicio,
                "data_fim": fase_lote.data_fim
            })
    
    return result

@router.get("/appointments/history")
async def get_appointment_history(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 100
):
    """Obtém o histórico de apontamentos do operador."""
    user_id = current_user["id"]
    
    # Buscar apontamentos do usuário
    apontamentos = db.query(Apontamento).filter(
        Apontamento.usuario_id == user_id,
        Apontamento.ativo == True
    ).order_by(Apontamento.data_inicio.desc()).limit(limit).all()
    
    result = []
    for apontamento in apontamentos:
        # Buscar fase do lote
        fase_lote = db.query(FaseLote).filter(
            FaseLote.id == apontamento.fase_lote_id,
            FaseLote.ativo == True
        ).first()
        
        if not fase_lote:
            continue
        
        # Buscar fase
        from app.models.models import Fase
        fase = db.query(Fase).filter(
            Fase.id == fase_lote.fase_id,
            Fase.ativo == True
        ).first()
        
        # Buscar lote
        from app.models.models import Lote, Produto
        lote = db.query(Lote).filter(
            Lote.id == fase_lote.lote_id,
            Lote.ativo == True
        ).first()
        
        if not lote:
            continue
        
        # Buscar produto
        produto_lote = db.query(ProdutoLote).filter(
            ProdutoLote.lote_id == lote.id,
            ProdutoLote.ativo == True
        ).first()
        
        produto_nome = ""
        if produto_lote:
            produto = db.query(Produto).filter(
                Produto.id == produto_lote.produto_id,
                Produto.ativo == True
            ).first()
            if produto:
                produto_nome = produto.descricao
        
        # Calcular tempo real em minutos
        tempo_real = None
        if apontamento.data_inicio and apontamento.data_fim:
            tempo_real = round((apontamento.data_fim - apontamento.data_inicio).total_seconds() / 60, 2)
        
        # Determinar status
        status = "Em andamento"
        if apontamento.data_fim:
            status = "Finalizado"
            if apontamento.excedeu_tempo:
                status = "Atrasado"
        
        result.append({
            "id": apontamento.id,
            "data": apontamento.data_inicio.strftime("%d/%m/%Y"),
            "lote_codigo": lote.codigo,
            "produto": produto_nome,
            "fase": fase.descricao if fase else "",
            "inicio": apontamento.data_inicio.strftime("%H:%M"),
            "fim": apontamento.data_fim.strftime("%H:%M") if apontamento.data_fim else "-",
            "tempo_real": f"{tempo_real} min" if tempo_real else "-",
            "status": status
        })
    
    return result
