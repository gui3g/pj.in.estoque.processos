from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class Maquina(Base):
    __tablename__ = "maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nome = Column(String)
    descricao = Column(String, nullable=True)
    fase_id = Column(Integer, ForeignKey("fases.id"))
    status = Column(String, default="ativo")  # ativo, inativo, manutencao
    ativo = Column(Boolean, default=True)
    
    # Relacionamentos
    fase = relationship("Fase", back_populates="maquinas")
