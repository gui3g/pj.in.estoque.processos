from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import authenticate_user, create_access_token, get_password_hash
from app.models.models import Usuario
from app.schemas.schemas import Token, LoginForm, UsuarioCreate, Usuario as UsuarioSchema
from datetime import timedelta
from app.core.config import settings
from pathlib import Path

router = APIRouter()

# Configuração do Jinja2 para templates
templates = Jinja2Templates(directory="app/templates")

@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    """Renderiza a página de login."""
    return templates.TemplateResponse("login.html", {"request": request})

@router.post("/token", response_model=Token)
async def login_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Gera um token de acesso para o usuário."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário ou senha incorretos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.usuario}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(request: Request, response: Response, db: Session = Depends(get_db)):
    """Endpoint para login de usuários."""
    # Obter dados do formulário
    form_data = await request.json()
    username = form_data.get("username")
    password = form_data.get("password")
    
    # Autenticar usuário
    user = authenticate_user(db, username, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nome de usuário ou senha incorretos",
        )
    
    # Gerar token de acesso
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.usuario, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    # Armazena o token em cookie seguro (sem o prefixo 'Bearer')
    response.set_cookie(
        key="access_token",
        value=access_token,  # Removido o prefixo "Bearer"
        httponly=True,
        secure=False,  # True em produção
        samesite="lax",
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/"  # Disponível em todo o site
    )
    
    # Retorna tanto o token quanto o papel do usuário
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "role": user.role
    }

@router.post("/logout")
async def logout(response: Response):
    """Endpoint para logout de usuários."""
    response.delete_cookie(key="access_token")
    return {"message": "Logout realizado com sucesso"}

@router.post("/register", response_model=UsuarioSchema)
async def register_user(user_data: UsuarioCreate, db: Session = Depends(get_db)):
    """Registra um novo usuário (apenas para administradores)."""
    # Verifica se o usuário já existe
    db_user = db.query(Usuario).filter(Usuario.usuario == user_data.usuario).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuário já existe"
        )
    
    # Cria o novo usuário
    hashed_password = get_password_hash(user_data.senha)
    db_user = Usuario(
        usuario=user_data.usuario,
        senha=hashed_password,
        nome=user_data.nome,
        email=user_data.email,
        role=user_data.role,
        grupo=user_data.grupo,
        ativo=user_data.ativo
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user
