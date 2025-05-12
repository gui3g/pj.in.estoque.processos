# Sistema de Apontamento Produtivo

Sistema web para rastreamento e gerenciamento da produção de produtos em diversas fases do processo produtivo.

## Tecnologias

### Backend
- Python 3.10+
- FastAPI
- PostgreSQL
- SQLAlchemy
- JWT (autenticação)

### Frontend
- HTML, CSS, JavaScript
- Bootstrap
- Bibliotecas JS para gráficos e QR Code

## Estrutura do Projeto

```
app/
├── core/           # Configurações centrais
├── models/         # Modelos SQLAlchemy
├── schemas/        # Esquemas Pydantic
├── routes/         # Endpoints da API
├── services/       # Lógica de negócio
├── templates/      # Templates HTML
├── static/         # Arquivos estáticos (CSS, JS)
├── utils/          # Utilitários
```

## Instalação

1. Clone o repositório
2. Crie um ambiente virtual: `python -m venv venv`
3. Ative o ambiente: `source venv/bin/activate` (Linux/Mac) ou `venv\Scripts\activate` (Windows)
4. Instale as dependências: `pip install -r requirements.txt`
5. Configure as variáveis de ambiente (crie um arquivo `.env`)
6. Execute as migrações do banco de dados: `alembic upgrade head`
7. Inicie o servidor: `uvicorn app.main:app --reload`

## Funcionalidades

- Autenticação e autorização
- Gestão de produtos e fases de produção
- Gestão de lotes
- Apontamento de produção
- Dashboard administrativo
- Controle de qualidade
