from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
import uvicorn
import os
from app.core.config import settings
from app.core.database import engine, get_db
from app.core.security import get_current_user
from app.models import models
import app.routes.auth as auth
import app.routes.admin as admin
import app.routes.products as products
import app.routes.phases as phases
import app.routes.batches as batches
import app.routes.operators as operators
import app.routes.appointments as appointments
import app.routes.checklists as checklists
import app.routes.machines as machines
import app.routes.next_steps as next_steps

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Sistema de Apontamento Produtivo")

# Configuração de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montando as rotas
# Rotas de autenticação
app.include_router(auth.router, tags=["Autenticação"])

# Rotas de API
app.include_router(products.router, prefix="/api/products", tags=["Produtos"])
app.include_router(phases.router, prefix="/api/phases", tags=["Fases"])
app.include_router(batches.router, prefix="/api/batches", tags=["Lotes"])
app.include_router(operators.router, prefix="/api/operators", tags=["Operadores"])
app.include_router(appointments.router, prefix="/api", tags=["Apontamentos"])
app.include_router(admin.router, prefix="/api", tags=["Administração"])
app.include_router(checklists.router, prefix="/api/checklists", tags=["Checklists"])
app.include_router(machines.router, prefix="/api/machines", tags=["Máquinas"])
app.include_router(next_steps.router, prefix="/api/next-steps", tags=["Próximos Passos"])

# Configuração dos arquivos estáticos
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Configuração dos templates
templates = Jinja2Templates(directory="app/templates")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    """Redireciona para a página de login."""
    return RedirectResponse(url="/login")

@app.get("/login", response_class=HTMLResponse)
async def login_page(request):
    """Renderiza a página de login."""
    return templates.TemplateResponse("login.html", {"request": request})

@app.get("/admin", response_class=HTMLResponse)
async def admin_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página do painel de administração."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/index.html", {"request": request, "user": current_user})

@app.get("/operator", response_class=HTMLResponse)
async def operator_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página da interface do operador."""
    return templates.TemplateResponse("operator/index.html", {"request": request, "user": current_user})

@app.get("/admin/produtos", response_class=HTMLResponse)
async def admin_products_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página de gerenciamento de produtos."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/products.html", {"request": request, "user": current_user})

@app.get("/admin/fases", response_class=HTMLResponse)
async def admin_phases_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página de gerenciamento de fases."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/phases.html", {"request": request, "user": current_user})

@app.get("/admin/lotes", response_class=HTMLResponse)
async def admin_batches_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página de gerenciamento de lotes."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/batches.html", {"request": request, "user": current_user})

@app.get("/admin/usuarios", response_class=HTMLResponse)
async def admin_users_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página de gerenciamento de usuários."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/users.html", {"request": request, "user": current_user})

@app.get("/admin/maquinas", response_class=HTMLResponse)
async def admin_machines_page(request: Request, current_user=Depends(get_current_user)):
    """Renderiza a página de gerenciamento de máquinas."""
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores podem acessar esta página."
        )
    return templates.TemplateResponse("admin/machines.html", {"request": request, "user": current_user})

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
