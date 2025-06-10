import sqlite3
from passlib.context import CryptContext

# Configuração para hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    """Gera um hash para a senha."""
    return pwd_context.hash(password)

# Conectar ao banco de dados
conn = sqlite3.connect('sistema_apontamento.db')
cursor = conn.cursor()

# Verificar se a tabela usuarios está vazia
cursor.execute('SELECT COUNT(*) FROM usuarios')
count = cursor.fetchone()[0]

if count == 0:
    print("Criando usuários...")
    
    # Inserir usuário admin
    admin_hash = get_password_hash("admin")
    cursor.execute('''
        INSERT INTO usuarios (usuario, senha, nome, email, role, ativo)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ("admin", admin_hash, "Administrador", "admin@example.com", "admin", 1))
    
    # Inserir usuário operador
    operador_hash = get_password_hash("operador")
    cursor.execute('''
        INSERT INTO usuarios (usuario, senha, nome, email, role, ativo)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', ("operador", operador_hash, "Operador", "operador@example.com", "operador", 1))
    
    # Commit das alterações
    conn.commit()
    print("Usuários criados com sucesso!")
else:
    print("Tabela de usuários já possui registros.")

# Fechar conexão
conn.close()
