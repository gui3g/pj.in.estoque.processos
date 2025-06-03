from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Schemas para autenticação
class TokenData(BaseModel):
    username: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    role: Optional[str] = None

class LoginForm(BaseModel):
    username: str
    password: str

# Schemas para usuários
class UsuarioBase(BaseModel):
    usuario: str
    nome: str
    email: EmailStr
    role: str
    grupo: Optional[str] = None
    ativo: bool = True

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    grupo: Optional[str] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = None

class Usuario(UsuarioBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para produtos
class ProdutoBase(BaseModel):
    codigo: str
    nome: str
    descricao: str
    tempo_estimado_total: int
    unidade: str
    ativo: bool = True

class ProdutoCreate(ProdutoBase):
    pass

class ProdutoUpdate(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    descricao: Optional[str] = None
    tempo_estimado_total: Optional[int] = None
    unidade: Optional[str] = None
    ativo: Optional[bool] = None

class Produto(ProdutoBase):
    id: int
    num_fases: Optional[int] = None

    class Config:
        orm_mode = True

# Schemas para fases
class FaseBase(BaseModel):
    codigo: str
    descricao: str
    ativo: bool = True

class FaseCreate(FaseBase):
    pass

class FaseUpdate(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    ativo: Optional[bool] = None

class Fase(FaseBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para produto-fase
class ProdutoFaseBase(BaseModel):
    produto_id: int
    fase_id: int
    ordem: int
    tempo_estimado: int
    tempo_prateleira_horas: Optional[int] = None
    ativo: bool = True

class ProdutoFaseCreate(ProdutoFaseBase):
    pass

class ProdutoFaseUpdate(BaseModel):
    ordem: Optional[int] = None
    tempo_estimado: Optional[int] = None
    tempo_prateleira_horas: Optional[int] = None
    ativo: Optional[bool] = None

class ProdutoFase(ProdutoFaseBase):
    id: int
    
    class Config:
        orm_mode = True

# Schemas para lotes
class LoteBase(BaseModel):
    codigo: str
    descricao: str
    status: str
    observacoes: Optional[str] = None
    ativo: bool = True

class LoteCreate(LoteBase):
    pass

class LoteUpdate(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    status: Optional[str] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None

class Lote(LoteBase):
    id: int
    data_criacao: datetime

    class Config:
        orm_mode = True

# Schemas para produto-lote
class ProdutoLoteBase(BaseModel):
    lote_id: int
    produto_id: int
    quantidade: int
    observacoes: Optional[str] = None
    ativo: bool = True

class ProdutoLoteCreate(ProdutoLoteBase):
    pass

class ProdutoLoteUpdate(BaseModel):
    quantidade: Optional[int] = None
    observacoes: Optional[str] = None
    ativo: Optional[bool] = None

class ProdutoLote(ProdutoLoteBase):
    id: int
    data_associacao: datetime

    class Config:
        orm_mode = True

# Schemas para fase-lote
class FaseLoteBase(BaseModel):
    lote_id: int
    fase_id: int
    produto_id: int
    ordem: int
    tempo_estimado: int
    tempo_prateleira_horas: Optional[int] = None
    ativo: bool = True

class FaseLoteCreate(FaseLoteBase):
    pass

class FaseLoteUpdate(BaseModel):
    ordem: Optional[int] = None
    tempo_estimado: Optional[int] = None
    tempo_prateleira_horas: Optional[int] = None
    ativo: Optional[bool] = None

class FaseLote(FaseLoteBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para operadores
class OperadorBase(BaseModel):
    codigo: str
    nome: str
    setor: str
    ativo: bool = True

class OperadorCreate(OperadorBase):
    pass

class OperadorUpdate(BaseModel):
    codigo: Optional[str] = None
    nome: Optional[str] = None
    setor: Optional[str] = None
    ativo: Optional[bool] = None

class Operador(OperadorBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para apontamentos e checklist
class ChecklistRespostaCreate(BaseModel):
    checklist_item_id: int
    resposta: str

class ApontamentoCreate(BaseModel):
    fase_lote_id: int
    observacoes: Optional[str] = None

class ApontamentoUpdate(BaseModel):
    apontamento_id: int
    observacoes: Optional[str] = None
    checklist_respostas: Optional[List[ChecklistRespostaCreate]] = None

class ApontamentoResponse(BaseModel):
    id: int
    fase_lote_id: int
    lote_id: Optional[int]
    lote_codigo: Optional[str]
    fase_id: Optional[int]
    fase_descricao: Optional[str]
    data_inicio: datetime
    data_fim: Optional[datetime]
    observacoes: Optional[str]
    tempo_estimado: Optional[float]
    requires_checklist: bool
    checklist_complete: bool

class ChecklistItemResponse(BaseModel):
    id: int
    descricao: str
    obrigatorio: bool

class ApontamentoBase(BaseModel):
    lote_id: int
    produto_id: int
    fase_id: int
    operador_id: int
    observacoes: Optional[str] = None
    status: str

class ApontamentoCreate(ApontamentoBase):
    pass

class ApontamentoUpdate(BaseModel):
    data_fim: Optional[datetime] = None
    tempo_real: Optional[int] = None
    observacoes: Optional[str] = None
    status: Optional[str] = None

class Apontamento(ApontamentoBase):
    id: int
    data_inicio: datetime
    data_fim: Optional[datetime] = None
    tempo_real: Optional[int] = None

    class Config:
        orm_mode = True

# Schemas para checklist items
class ChecklistItemBase(BaseModel):
    fase_id: int
    descricao: str
    obrigatorio: bool = True
    ordem: int
    ativo: bool = True

class ChecklistItemCreate(ChecklistItemBase):
    pass

class ChecklistItemUpdate(BaseModel):
    descricao: Optional[str] = None
    obrigatorio: Optional[bool] = None
    ordem: Optional[int] = None
    ativo: Optional[bool] = None

class ChecklistItem(ChecklistItemBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para checklist respostas
class ChecklistRespostaBase(BaseModel):
    apontamento_id: int
    checklist_item_id: int
    concluido: bool = False
    observacao: Optional[str] = None

class ChecklistRespostaCreate(ChecklistRespostaBase):
    pass

class ChecklistRespostaUpdate(BaseModel):
    concluido: Optional[bool] = None
    observacao: Optional[str] = None

class ChecklistResposta(ChecklistRespostaBase):
    id: int
    data_resposta: datetime

    class Config:
        orm_mode = True

# Schemas para máquinas
class MaquinaBase(BaseModel):
    codigo: str
    descricao: str
    setor: str
    ativo: bool = True

class MaquinaCreate(MaquinaBase):
    pass

class MaquinaUpdate(BaseModel):
    codigo: Optional[str] = None
    descricao: Optional[str] = None
    setor: Optional[str] = None
    ativo: Optional[bool] = None

class Maquina(MaquinaBase):
    id: int

    class Config:
        orm_mode = True

# Schemas para dashboard
class DashboardCounters(BaseModel):
    total_lotes: int
    lotes_em_producao: int
    apontamentos_hoje: int
    apontamentos_em_andamento: int
    tempo_medio: float
    eficiencia: float
    atrasos: int
    produtividade: float

class ChartData(BaseModel):
    labels: List[str]
    values: List[int]

class Dashboard(BaseModel):
    counters: DashboardCounters
    recent_batches: List[Dict[str, Any]]
    production_chart: ChartData
    status_chart: ChartData
