import sqlite3
import os
import sys
from passlib.context import CryptContext

# Configuração para hash de senha
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    """Verifica se a senha corresponde ao hash."""
    return pwd_context.verify(plain_password, hashed_password)

def diagnose_login():
    """Realiza diagnóstico direto no banco de dados para problemas de login."""
    print("=== DIAGNÓSTICO DE LOGIN ===")

    # Conectar diretamente ao SQLite
    conn = sqlite3.connect('sistema_apontamento.db')
    cursor = conn.cursor()
    
    # Verificar se a tabela usuarios existe
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='usuarios'")
    if not cursor.fetchone():
        print("ERRO: A tabela 'usuarios' não existe no banco de dados")
        return

    # Verificar a estrutura da tabela usuarios
    cursor.execute("PRAGMA table_info(usuarios)")
    columns = cursor.fetchall()
    print(f"Estrutura da tabela 'usuarios': {columns}")
    
    # Buscar todos os usuários
    cursor.execute("SELECT * FROM usuarios")
    users = cursor.fetchall()
    print(f"Número de usuários encontrados: {len(users)}")
    
    # Mostrar colunas e usuários
    if users:
        column_names = [description[0] for description in cursor.description]
        print(f"Colunas: {column_names}")
        for user in users:
            print(f"Usuário: {dict(zip(column_names, user))}")
            
        # Testar autenticação para usuários conhecidos
        test_credentials = [
            ("admin", "admin"),
            ("operador", "operador")
        ]
        
        for username, password in test_credentials:
            print(f"\nTestando login para {username}:{password}")
            cursor.execute(f"SELECT * FROM usuarios WHERE usuario = ?", (username,))
            user = cursor.fetchone()
            
            if not user:
                print(f"ERRO: Usuário '{username}' não encontrado")
                continue
            
            user_dict = dict(zip(column_names, user))
            if 'senha' not in user_dict:
                print("ERRO: A coluna 'senha' não foi encontrada")
                continue
            
            hashed_password = user_dict['senha']
            try:
                password_match = verify_password(password, hashed_password)
                print(f"Verificação de senha: {password_match}")
            except Exception as e:
                print(f"ERRO ao verificar senha: {str(e)}")
    
    else:
        print("Nenhum usuário encontrado no banco de dados")
    
    conn.close()

if __name__ == "__main__":
    diagnose_login()
