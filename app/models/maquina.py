from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class FaseMaquina(Base):
    """Tabela de associação entre Fase e Máquina com ordem de uso."""
    __tablename__ = "fases_maquinas"
    
    id = Column(Integer, primary_key=True, index=True)
    fase_id = Column(Integer, ForeignKey("fases.id"))
    maquina_id = Column(Integer, ForeignKey("maquinas.id"))
    ordem = Column(Integer, default=1)  # Ordem de utilização na fase
    
    # Relacionamentos
    fase = relationship("Fase", back_populates="maquinas_associacao")
    maquina = relationship("Maquina", back_populates="fases_associacao")

class Maquina(Base):
    __tablename__ = "maquinas"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    nome = Column(String)
    descricao = Column(String, nullable=True)
    status = Column(String, default="ativo")  # ativo, inativo, manutencao
    ativo = Column(Boolean, default=True)
    qrcode = Column(String, nullable=True)  # Para armazenar a URL ou caminho do QR code
    
    # Relacionamento muitos-para-muitos com Fase através da tabela de associação
    fases_associacao = relationship("FaseMaquina", back_populates="maquina")
    
    # Relacionamento com apontamentos
    apontamentos = relationship("Apontamento", back_populates="maquina")
    
    def to_dict(self):
        """Converte o objeto para um dicionário."""
        return {
            "id": self.id,
            "codigo": self.codigo,
            "nome": self.nome,
            "descricao": self.descricao,
            "status": self.status,
            "ativo": self.ativo,
            "qrcode": self.qrcode
        }
