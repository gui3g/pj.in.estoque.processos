import uvicorn
import os
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

if __name__ == "__main__":
    # Obter a porta do arquivo .env ou usar 8000 como padrão
    port = int(os.getenv("PORT", 8000))
    
    # Iniciar o servidor
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )
    
    print(f"Servidor iniciado em http://localhost:{port}")
