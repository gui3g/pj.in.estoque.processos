#!/usr/bin/env python
# Script para adicionar a coluna maquina_id à tabela apontamentos
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / 'sistema_apontamento.db'

def add_maquina_id_to_apontamentos():
    print(f"Conectando ao banco de dados: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Verificar se a coluna já existe
        cursor.execute("PRAGMA table_info(apontamentos)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'maquina_id' not in columns:
            print("Adicionando coluna maquina_id à tabela apontamentos...")
            cursor.execute("ALTER TABLE apontamentos ADD COLUMN maquina_id INTEGER REFERENCES maquinas(id)")
            print("Coluna adicionada com sucesso!")
        else:
            print("A coluna maquina_id já existe na tabela.")
        
        conn.commit()
        print("Migração concluída com sucesso!")
    except Exception as e:
        conn.rollback()
        print(f"Erro durante a migração: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    add_maquina_id_to_apontamentos()
