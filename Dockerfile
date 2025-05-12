# Use uma imagem oficial do Python como base
FROM python:3.12-slim

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências para o container
COPY requirements.txt ./

# Instala as dependências
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código do projeto para o container
COPY . .

# Permissões para que o conteúdo seja acessível externamente
RUN chmod -R 755 /app

# Expõe a porta padrão do FastAPI/Uvicorn
EXPOSE 8000

# Define a variável de ambiente para evitar problemas de buffering
ENV PYTHONUNBUFFERED=1

# Comando para rodar o servidor
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
