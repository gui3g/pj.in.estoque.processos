from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    usuario = Column(String, unique=True, index=True)
    senha = Column(String)
    nome = Column(String)
    email = Column(String)
    role = Column(String)  # "admin" ou "operador"
    grupo = Column(String, nullable=True)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    apontamentos = relationship("Apontamento", back_populates="operador")


class Produto(Base):
    __tablename__ = "produtos"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descricao = Column(String)
    tempo_estimado_total = Column(Integer)  # em minutos
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    fases = relationship("ProdutoFase", back_populates="produto")
    lotes = relationship("ProdutoLote", back_populates="produto")
    fase_lotes = relationship("FaseLote", back_populates="produto")
    apontamentos = relationship("Apontamento", back_populates="produto")


class Fase(Base):
    __tablename__ = "fases"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descricao = Column(String)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    produtos = relationship("ProdutoFase", back_populates="fase")
    lotes = relationship("FaseLote", back_populates="fase")
    apontamentos = relationship("Apontamento", back_populates="fase")
    checklist_items = relationship("ChecklistItem", back_populates="fase")
    maquinas = relationship("Maquina", back_populates="fase")


class ProdutoFase(Base):
    __tablename__ = "produto_fases"
    
    id = Column(Integer, primary_key=True, index=True)
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    fase_id = Column(Integer, ForeignKey("fases.id"))
    ordem = Column(Integer)
    tempo_estimado = Column(Integer)  # em minutos
    tempo_prateleira_horas = Column(Integer, nullable=True)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    produto = relationship("Produto", back_populates="fases")
    fase = relationship("Fase", back_populates="produtos")


class Lote(Base):
    __tablename__ = "lotes"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descricao = Column(String)
    data_criacao = Column(DateTime, default=datetime.utcnow)
    status = Column(String)  # ex: "em_producao", "concluido", "parado"
    observacoes = Column(Text, nullable=True)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    produtos = relationship("ProdutoLote", back_populates="lote")
    fases = relationship("FaseLote", back_populates="lote")
    apontamentos = relationship("Apontamento", back_populates="lote")


class ProdutoLote(Base):
    __tablename__ = "produto_lotes"
    
    id = Column(Integer, primary_key=True, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    quantidade = Column(Integer)
    observacoes = Column(Text, nullable=True)
    data_associacao = Column(DateTime, default=datetime.utcnow)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    lote = relationship("Lote", back_populates="produtos")
    produto = relationship("Produto", back_populates="lotes")


class FaseLote(Base):
    __tablename__ = "fase_lotes"
    
    id = Column(Integer, primary_key=True, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.id"))
    fase_id = Column(Integer, ForeignKey("fases.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    ordem = Column(Integer)
    tempo_estimado = Column(Integer)  # em minutos
    tempo_prateleira_horas = Column(Integer, nullable=True)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    lote = relationship("Lote", back_populates="fases")
    fase = relationship("Fase", back_populates="lotes")
    produto = relationship("Produto", back_populates="fase_lotes")


class Operador(Base):
    __tablename__ = "operadores"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nome = Column(String)
    setor = Column(String)
    ativo = Column(Boolean, default=True)


class Apontamento(Base):
    __tablename__ = "apontamentos"
    
    id = Column(Integer, primary_key=True, index=True)
    lote_id = Column(Integer, ForeignKey("lotes.id"))
    produto_id = Column(Integer, ForeignKey("produtos.id"))
    fase_id = Column(Integer, ForeignKey("fases.id"))
    operador_id = Column(Integer, ForeignKey("usuarios.id"))
    data_inicio = Column(DateTime, default=datetime.utcnow)
    data_fim = Column(DateTime, nullable=True)
    tempo_real = Column(Integer, nullable=True)  # em minutos, calculado
    observacoes = Column(Text, nullable=True)
    status = Column(String)  # ex: "iniciado", "finalizado", "pausado"
    
    # Relacionamentos
    lote = relationship("Lote", back_populates="apontamentos")
    produto = relationship("Produto", back_populates="apontamentos")
    fase = relationship("Fase", back_populates="apontamentos")
    operador = relationship("Usuario", back_populates="apontamentos")
    checklist_respostas = relationship("ChecklistResposta", back_populates="apontamento")


class ChecklistItem(Base):
    __tablename__ = "checklist_items"
    
    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fases.id"))
    descricao = Column(String)
    obrigatorio = Column(Boolean, default=True)
    ordem = Column(Integer)
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    fase = relationship("Fase", back_populates="checklist_items")
    respostas = relationship("ChecklistResposta", back_populates="checklist_item")


class ChecklistResposta(Base):
    __tablename__ = "checklist_respostas"
    
    id = Column(Integer, primary_key=True, index=True)
    apontamento_id = Column(Integer, ForeignKey("apontamentos.id"))
    checklist_item_id = Column(Integer, ForeignKey("checklist_items.id"))
    concluido = Column(Boolean, default=False)
    observacao = Column(Text, nullable=True)
    data_resposta = Column(DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    apontamento = relationship("Apontamento", back_populates="checklist_respostas")
    checklist_item = relationship("ChecklistItem", back_populates="respostas")


class Maquina(Base):
    __tablename__ = "maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descricao = Column(String)
    setor = Column(String)
    ativo = Column(Boolean, default=True)
