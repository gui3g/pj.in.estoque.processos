import os
import sys
import qrcode
from sqlalchemy.orm import Session
from pathlib import Path

# Adicionar o diretório raiz ao path para importar módulos da aplicação
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import get_db
from app.models.models import Lote, Produto

# Diretório para salvar os QR codes
QR_CODE_DIR = Path(__file__).parent.parent / "app" / "static" / "qrcodes"

def create_directories():
    """Cria os diretórios necessários para os QR codes."""
    lotes_dir = QR_CODE_DIR / "lotes"
    produtos_dir = QR_CODE_DIR / "produtos"
    
    # Criar diretórios se não existirem
    lotes_dir.mkdir(parents=True, exist_ok=True)
    produtos_dir.mkdir(parents=True, exist_ok=True)
    
    return lotes_dir, produtos_dir

def generate_qr_for_lotes(db: Session, lotes_dir: Path):
    """Gera QR codes para todos os lotes ativos."""
    lotes = db.query(Lote).filter(Lote.ativo == True).all()
    print(f"Gerando QR codes para {len(lotes)} lotes...")
    
    for lote in lotes:
        qr_data = {
            "type": "lote",
            "id": lote.id,
            "codigo": lote.codigo
        }
        
        # Criar QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        # Criar imagem
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Salvar imagem
        filename = f"{lote.codigo}.png"
        filepath = lotes_dir / filename
        img.save(filepath)
        print(f"QR code gerado para lote {lote.codigo} em {filepath}")

def generate_qr_for_produtos(db: Session, produtos_dir: Path):
    """Gera QR codes para todos os produtos ativos."""
    produtos = db.query(Produto).filter(Produto.ativo == True).all()
    print(f"Gerando QR codes para {len(produtos)} produtos...")
    
    for produto in produtos:
        qr_data = {
            "type": "produto",
            "id": produto.id,
            "codigo": produto.codigo
        }
        
        # Criar QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(str(qr_data))
        qr.make(fit=True)
        
        # Criar imagem
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Salvar imagem
        filename = f"{produto.codigo}.png"
        filepath = produtos_dir / filename
        img.save(filepath)
        print(f"QR code gerado para produto {produto.codigo} em {filepath}")

def main():
    """Função principal para gerar QR codes."""
    print("Iniciando geração de QR codes...")
    
    # Criar diretórios
    lotes_dir, produtos_dir = create_directories()
    
    # Obter sessão do banco de dados
    db = next(get_db())
    
    try:
        # Gerar QR codes para lotes
        generate_qr_for_lotes(db, lotes_dir)
        
        # Gerar QR codes para produtos
        generate_qr_for_produtos(db, produtos_dir)
        
        print("Geração de QR codes concluída com sucesso!")
        
    except Exception as e:
        print(f"Erro ao gerar QR codes: {e}")
    
    finally:
        db.close()

if __name__ == "__main__":
    main()
