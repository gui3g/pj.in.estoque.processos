from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Usuario, Apontamento, Lote, Produto, Fase, ProdutoLote
from app.schemas.schemas import Usuario as UsuarioSchema
from app.schemas.schemas import UsuarioCreate, UsuarioUpdate
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/users", response_model=List[UsuarioSchema])
async def get_users(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna a lista de usuários (apenas para administradores)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    usuarios = db.query(Usuario).offset(skip).limit(limit).all()
    return usuarios

@router.get("/users/{user_id}", response_model=UsuarioSchema)
async def get_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um usuário específico pelo ID (apenas para administradores)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    usuario = db.query(Usuario).filter(Usuario.id == user_id).first()
    if usuario is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@router.post("/users", response_model=UsuarioSchema)
async def create_user(
    usuario: UsuarioCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Cria um novo usuário (apenas para administradores)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se já existe usuário com o mesmo nome de usuário
    db_user = db.query(Usuario).filter(Usuario.usuario == usuario.usuario).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Nome de usuário já existe"
        )
    
    # Importar hash de senha
    from app.core.security import get_password_hash
    
    # Criar novo usuário
    hashed_password = get_password_hash(usuario.senha)
    db_user = Usuario(
        usuario=usuario.usuario,
        senha=hashed_password,
        nome=usuario.nome,
        email=usuario.email,
        role=usuario.role,
        grupo=usuario.grupo,
        ativo=usuario.ativo
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.put("/users/{user_id}", response_model=UsuarioSchema)
async def update_user(
    user_id: int, 
    usuario: UsuarioUpdate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Atualiza um usuário existente (apenas para administradores)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se usuário existe
    db_user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Verificar se está tentando atualizar para um nome de usuário já existente
    if usuario.usuario and usuario.usuario != db_user.usuario:
        existing_user = db.query(Usuario).filter(Usuario.usuario == usuario.usuario).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Nome de usuário já existe"
            )
    
    # Importar hash de senha
    from app.core.security import get_password_hash
    
    # Atualizar usuário
    usuario_data = usuario.dict(exclude_unset=True)
    if "senha" in usuario_data and usuario_data["senha"]:
        usuario_data["senha"] = get_password_hash(usuario_data["senha"])
    
    for key, value in usuario_data.items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/users/{user_id}", response_model=UsuarioSchema)
async def delete_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Desativa um usuário (apenas para administradores)."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Verificar se usuário existe
    db_user = db.query(Usuario).filter(Usuario.id == user_id).first()
    if db_user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    # Não permitir que o usuário desative sua própria conta
    if db_user.id == current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é possível desativar sua própria conta"
        )
    
    # Desativar usuário
    db_user.ativo = False
    db.commit()
    return db_user

@router.get("/dashboard/summary")
async def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna um resumo para o dashboard administrativo."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Total de lotes ativos
    total_lotes = db.query(func.count(Lote.id)).filter(Lote.ativo == True).scalar()
    
    # Lotes em produção
    lotes_em_producao = db.query(func.count(Lote.id)).filter(
        Lote.ativo == True,
        Lote.status == "em_producao"
    ).scalar()
    
    # Lotes concluídos
    lotes_concluidos = db.query(func.count(Lote.id)).filter(
        Lote.ativo == True,
        Lote.status == "concluido"
    ).scalar()
    
    # Total de produtos
    total_produtos = db.query(func.count(Produto.id)).filter(Produto.ativo == True).scalar()
    
    # Total de apontamentos hoje
    hoje = datetime.utcnow().date()
    apontamentos_hoje = db.query(func.count(Apontamento.id)).filter(
        func.date(Apontamento.data_inicio) == hoje
    ).scalar()
    
    # Apontamentos em andamento
    apontamentos_em_andamento = db.query(func.count(Apontamento.id)).filter(
        Apontamento.status == "iniciado"
    ).scalar()
    
    return {
        "total_lotes": total_lotes,
        "lotes_em_producao": lotes_em_producao,
        "lotes_concluidos": lotes_concluidos,
        "total_produtos": total_produtos,
        "apontamentos_hoje": apontamentos_hoje,
        "apontamentos_em_andamento": apontamentos_em_andamento
    }

@router.get("/dashboard/kpis")
async def get_dashboard_kpis(
    periodo: int = 30,  # Período em dias
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna KPIs para o dashboard administrativo."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    # Data de início do período
    data_inicio = datetime.utcnow() - timedelta(days=periodo)
    
    # Apontamentos concluídos no período
    apontamentos = db.query(Apontamento).filter(
        Apontamento.data_inicio >= data_inicio,
        Apontamento.status == "finalizado"
    ).all()
    
    # Cálculo dos KPIs
    if not apontamentos:
        return {
            "tempo_medio_producao": 0,
            "aderencia_tempo_planejado": 0,
            "produtividade_por_operador": [],
            "total_apontamentos": 0
        }
    
    # Tempo médio de produção (em minutos)
    tempo_total = sum(a.tempo_real for a in apontamentos if a.tempo_real)
    tempo_medio = tempo_total / len(apontamentos) if apontamentos else 0
    
    # Aderência ao tempo planejado
    aderencia_total = 0
    aderencia_count = 0
    
    for a in apontamentos:
        if a.tempo_real is None:
            continue
        
        produto_fase = db.query(ProdutoLote).filter(
            ProdutoLote.produto_id == a.produto_id,
            ProdutoLote.lote_id == a.lote_id
        ).first()
        
        if produto_fase and produto_fase.tempo_estimado > 0:
            aderencia = (a.tempo_real / produto_fase.tempo_estimado) * 100
            aderencia_total += aderencia
            aderencia_count += 1
    
    aderencia_media = aderencia_total / aderencia_count if aderencia_count > 0 else 0
    
    # Produtividade por operador
    produtividade_operadores = {}
    
    for a in apontamentos:
        operador_id = a.operador_id
        
        if operador_id not in produtividade_operadores:
            operador = db.query(Usuario).filter(Usuario.id == operador_id).first()
            produtividade_operadores[operador_id] = {
                "id": operador_id,
                "nome": operador.nome if operador else "Desconhecido",
                "apontamentos": 0,
                "tempo_total": 0
            }
        
        produtividade_operadores[operador_id]["apontamentos"] += 1
        if a.tempo_real:
            produtividade_operadores[operador_id]["tempo_total"] += a.tempo_real
    
    # Converter para lista
    produtividade_lista = list(produtividade_operadores.values())
    
    # Ordenar por número de apontamentos (do maior para o menor)
    produtividade_lista.sort(key=lambda x: x["apontamentos"], reverse=True)
    
    return {
        "tempo_medio_producao": round(tempo_medio, 2),
        "aderencia_tempo_planejado": round(aderencia_media, 2),
        "produtividade_por_operador": produtividade_lista,
        "total_apontamentos": len(apontamentos)
    }

@router.get("/dashboard/lotes_recentes")
async def get_lotes_recentes(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Retorna os lotes mais recentes para o dashboard."""
    # Verificar se usuário é administrador
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Não autorizado"
        )
    
    lotes = db.query(Lote).filter(
        Lote.ativo == True
    ).order_by(desc(Lote.data_criacao)).limit(limit).all()
    
    # Adicionar informações adicionais a cada lote
    lotes_info = []
    
    for lote in lotes:
        # Contar produtos no lote
        produtos_count = db.query(func.count(ProdutoLote.id)).filter(
            ProdutoLote.lote_id == lote.id,
            ProdutoLote.ativo == True
        ).scalar()
        
        # Contar apontamentos do lote
        apontamentos_count = db.query(func.count(Apontamento.id)).filter(
            Apontamento.lote_id == lote.id
        ).scalar()
        
        # Contar apontamentos finalizados
        apontamentos_finalizados = db.query(func.count(Apontamento.id)).filter(
            Apontamento.lote_id == lote.id,
            Apontamento.status == "finalizado"
        ).scalar()
        
        lotes_info.append({
            "id": lote.id,
            "codigo": lote.codigo,
            "descricao": lote.descricao,
            "status": lote.status,
            "data_criacao": lote.data_criacao,
            "produtos_count": produtos_count,
            "apontamentos_count": apontamentos_count,
            "apontamentos_finalizados": apontamentos_finalizados,
            "progresso": (apontamentos_finalizados / apontamentos_count * 100) if apontamentos_count > 0 else 0
        })
    
    return lotes_info

@router.get("/dashboard/counters", response_model=Dict[str, Any])
async def get_dashboard_counters(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém os contadores e KPIs para o dashboard administrativo."""
    # Verificar se o usuário é admin
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar esta funcionalidade"
        )
    
    # Obter data de hoje
    hoje = datetime.utcnow().date()
    
    # Total de lotes
    total_lotes = db.query(Lote).filter(Lote.ativo == True).count()
    
    # Lotes em produção
    lotes_em_producao = db.query(Lote).filter(
        Lote.status == "em_producao",
        Lote.ativo == True
    ).count()
    
    # Apontamentos de hoje
    apontamentos_hoje = db.query(Apontamento).filter(
        func.date(Apontamento.data_inicio) == hoje,
        Apontamento.ativo == True
    ).count()
    
    # Apontamentos em andamento (iniciados mas não finalizados)
    apontamentos_em_andamento = db.query(Apontamento).filter(
        Apontamento.data_inicio.isnot(None),
        Apontamento.data_fim.is_(None),
        Apontamento.ativo == True
    ).count()
    
    # Tempo médio de produção (em minutos)
    # Consideramos apenas apontamentos finalizados
    tempo_medio_query = db.query(
        func.avg(
            func.extract('epoch', Apontamento.data_fim) - 
            func.extract('epoch', Apontamento.data_inicio)
        ) / 60
    ).filter(
        Apontamento.data_fim.isnot(None),
        Apontamento.ativo == True
    ).scalar()
    
    tempo_medio = round(tempo_medio_query or 0, 2)
    
    # Eficiência média (realizado/estimado * 100) - representada como uma porcentagem
    # Para simplificar, consideramos que cada fase tem um tempo estimado no modelo ProdutoFase
    eficiencia = 90  # Valor fictício para exemplo - deve ser calculado com dados reais
    
    # Total de atrasos (apontamentos que excederam o tempo estimado)
    atrasos = db.query(Apontamento).filter(
        Apontamento.data_fim.isnot(None),
        Apontamento.excedeu_tempo == True,
        Apontamento.ativo == True
    ).count()
    
    # Produtividade (apontamentos concluídos por dia nos últimos 7 dias)
    # Simplificando, usamos o número médio de apontamentos por dia
    data_limite = hoje - timedelta(days=7)
    
    produtividade_query = db.query(
        func.count(Apontamento.id) / 7.0
    ).filter(
        func.date(Apontamento.data_fim) >= data_limite,
        Apontamento.data_fim.isnot(None),
        Apontamento.ativo == True
    ).scalar()
    
    produtividade = round(produtividade_query or 0, 2)
    
    return {
        "total_lotes": total_lotes,
        "lotes_em_producao": lotes_em_producao,
        "apontamentos_hoje": apontamentos_hoje,
        "apontamentos_em_andamento": apontamentos_em_andamento,
        "tempo_medio": tempo_medio,
        "eficiencia": eficiencia,
        "atrasos": atrasos,
        "produtividade": produtividade
    }

@router.get("/dashboard/recent-batches")
async def get_recent_batches(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Obtém os lotes mais recentes para o dashboard."""
    # Verificar se o usuário é admin
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar esta funcionalidade"
        )
    
    # Obter lotes mais recentes
    lotes = db.query(Lote).filter(
        Lote.ativo == True
    ).order_by(
        Lote.data_criacao.desc()
    ).limit(limit).all()
    
    result = []
    for lote in lotes:
        # Obter produtos associados ao lote
        produto_lote = db.query(ProdutoLote).filter(
            ProdutoLote.lote_id == lote.id,
            ProdutoLote.ativo == True
        ).first()
        
        produto_nome = ""
        if produto_lote:
            produto = db.query(Produto).filter(
                Produto.id == produto_lote.produto_id
            ).first()
            if produto:
                produto_nome = produto.descricao
        
        # Mapear status para exibição amigável
        status_map = {
            "em_producao": "Em Produção",
            "em_pausa": "Em Pausa",
            "concluido": "Concluído",
            "cancelado": "Cancelado"
        }
        
        result.append({
            "id": lote.id,
            "codigo": lote.codigo,
            "produto": produto_nome,
            "data_criacao": lote.data_criacao.strftime("%d/%m/%Y"),
            "status": lote.status,
            "status_display": status_map.get(lote.status, lote.status)
        })
    
    return result

@router.get("/dashboard/production-by-product", response_model=Dict[str, Any])
async def get_production_by_product(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém dados de produção por produto para gráficos."""
    # Verificar se o usuário é admin
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar esta funcionalidade"
        )
    
    # Contar lotes por produto
    produtos = db.query(
        Produto.descricao, 
        func.count(ProdutoLote.lote_id).label("total")
    ).join(
        ProdutoLote, Produto.id == ProdutoLote.produto_id
    ).filter(
        Produto.ativo == True,
        ProdutoLote.ativo == True
    ).group_by(
        Produto.descricao
    ).all()
    
    labels = [p[0] for p in produtos]
    values = [p[1] for p in produtos]
    
    return {
        "labels": labels,
        "values": values
    }

@router.get("/dashboard/batch-status", response_model=Dict[str, Any])
async def get_batch_status(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém dados de status dos lotes para gráficos."""
    # Verificar se o usuário é admin
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar esta funcionalidade"
        )
    
    # Status possíveis
    status_labels = {
        "em_producao": "Em Produção",
        "em_pausa": "Em Pausa",
        "concluido": "Concluído",
        "cancelado": "Cancelado",
    }
    
    # Contar lotes por status
    status_counts = {}
    
    for status_key in status_labels.keys():
        count = db.query(Lote).filter(
            Lote.status == status_key,
            Lote.ativo == True
        ).count()
        status_counts[status_key] = count
    
    labels = [status_labels[k] for k in status_counts.keys()]
    values = list(status_counts.values())
    
    return {
        "labels": labels,
        "values": values
    }

@router.get("/users")
async def get_users(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Obtém a lista de usuários (apenas para admins)."""
    # Verificar se o usuário é admin
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem acessar esta funcionalidade"
        )
    
    from app.models.models import Usuario
    
    users = db.query(Usuario).filter(Usuario.ativo == True).all()
    
    result = []
    for user in users:
        result.append({
            "id": user.id,
            "usuario": user.usuario,
            "nome": user.nome,
            "email": user.email,
            "role": user.role,
            "grupo": user.grupo,
            "ativo": user.ativo
        })
    
    return result
