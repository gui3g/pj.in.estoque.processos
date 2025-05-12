# Prompt para Desenvolvimento do Sistema de Apontamento Produtivo

## Visão Geral do Sistema

O Sistema de Apontamento Produtivo é uma aplicação web que permite rastrear e gerenciar a produção de produtos em diversas fases do processo produtivo. O sistema é voltado para indústrias que necessitam monitorar lotes de produtos à medida que eles passam por diferentes etapas de fabricação.

## Arquitetura do Sistema

O sistema será desenvolvido com a seguinte arquitetura:

### Backend
- **Linguagem**: Python 3.10+
- **Framework**: FastAPI
- **Banco de Dados**: PostgreSQL
- **ORM**: SQLAlchemy
- **Autenticação**: JWT (JSON Web Tokens) com cookies seguros
- **Estrutura de Pastas**:
  - `app/` - Diretório principal da aplicação
  - `app/models/` - Modelos de dados SQLAlchemy
  - `app/schemas/` - Esquemas Pydantic para validação de dados
  - `app/routes/` - Endpoints da API
  - `app/services/` - Lógica de negócio
  - `app/templates/` - Templates HTML
  - `app/static/` - Arquivos estáticos (CSS, JS, imagens)
  - `app/utils/` - Utilitários e funções auxiliares
  - `app/core/` - Configurações e funcionalidades centrais

### Frontend
- **Tecnologias**: HTML, CSS, JavaScript
- **Framework CSS**: Bootstrap ou estilo próprio
- **Bibliotecas JS**: 
  - Gráficos para dashboard
  - HTML5-QRCode para leitura de QR Code
  - Biblioteca para gerenciamento de notificações

## Funcionalidades Principais

### 1. Autenticação e Autorização
- [x] Sistema de login seguro com proteção contra ataques de força bruta
- [x] Diferentes níveis de acesso: Administrador e Operador
- [x] Proteção de rotas para garantir acesso apenas a usuários autenticados
- [x] Geração e validação de tokens JWT
- [x] Logout funcional em todas as interfaces (admin e operador)
- [x] Armazenamento seguro de senhas com hash e salt

### 2. Gestão de Produtos
- [x] Cadastro de produtos com código, descrição e tempo estimado total
- [x] Associação de produtos a fases de produção
- [x] Visualização da lista de produtos
- [x] Edição e atualização de produtos existentes
- [x] Inativação lógica de produtos (ao invés de exclusão física)

### 3. Gestão de Fases de Produção
- [x] Cadastro de fases com código, descrição e sequência
- [x] Configuração de tempo estimado para cada fase
- [x] Definição de tempo de prateleira (shelf life) entre fases
- [x] Associação de checklist a fases específicas

### 4. Gestão de Lotes
- [x] Criação de lotes de produção com código e descrição
- [x] Duplicação de lotes para reutilização de configurações
- [x] Associação de produtos e suas respectivas fases a lotes
- [x] Visualização do status atual de cada lote
- [x] Histórico de processamento do lote

### 5. Apontamento de Produção
- [x] Interface para operadores registrarem o início e término de fases
- [x] Leitura de QR Code para identificação rápida de lotes/produtos
- [x] Registro de tempo real de produção
- [x] Adição de observações durante o apontamento
- [x] Alertas para tempos de produção acima do estimado
- [x] Checklist obrigatório para finalização de fases

### 6. Gestão de Operadores
- [x] Cadastro de operadores com informações relevantes
- [x] Associação de operadores a apontamentos realizados
- [x] Histórico de atividades por operador

### 7. Dashboard Administrativo
- [x] Visualização consolidada dos lotes em produção
- [x] Indicadores de desempenho (KPIs) como:
  - Tempo médio de produção
  - Aderência ao tempo planejado
  - Produtividade por operador
  - Status geral da produção
- [x] Relatórios exportáveis

### 8. Controle de Qualidade
- [x] Implementação de checklists configuráveis para fases
- [x] Registro de não-conformidades durante a produção
- [x] Alerta para situações críticas

## Modelos de Dados

### Usuario
- id (PK)
- usuario (string, único)
- senha (string, hash)
- nome (string)
- email (string)
- role (string: "admin" ou "operador")
- grupo (string, opcional)
- ativo (boolean)

### Produto
- id (PK)
- codigo (string, único)
- descricao (string)
- tempo_estimado_total (int, minutos)
- ativo (boolean)

### Fase
- id (PK)
- codigo (string, único)
- descricao (string)
- ativo (boolean)

### ProdutoFase
- id (PK)
- produto_id (FK)
- fase_id (FK)
- ordem (int)
- tempo_estimado (int, minutos)
- tempo_prateleira_horas (int, opcional)
- ativo (boolean)

### Lote
- id (PK)
- codigo (string, único)
- descricao (string)
- data_criacao (datetime)
- status (string)
- observacoes (text, opcional)
- ativo (boolean)

### ProdutoLote
- id (PK)
- lote_id (FK)
- produto_id (FK)
- quantidade (int)
- observacoes (text, opcional)
- data_associacao (datetime)
- ativo (boolean)

### FaseLote
- id (PK)
- lote_id (FK)
- fase_id (FK)
- produto_id (FK)
- ordem (int)
- tempo_estimado (int, minutos)
- tempo_prateleira_horas (int, opcional)
- ativo (boolean)

### Operador
- id (PK)
- codigo (string, único)
- nome (string)
- setor (string)
- ativo (boolean)

### Apontamento
- id (PK)
- lote_id (FK)
- produto_id (FK)
- fase_id (FK)
- operador_id (FK)
- data_inicio (datetime)
- data_fim (datetime, opcional)
- tempo_real (int, minutos, calculado)
- observacoes (text, opcional)
- status (string)

### ChecklistItem
- id (PK)
- fase_id (FK)
- descricao (string)
- obrigatorio (boolean)
- ordem (int)
- ativo (boolean)

### ChecklistResposta
- id (PK)
- apontamento_id (FK)
- checklist_item_id (FK)
- concluido (boolean)
- observacao (text, opcional)
- data_resposta (datetime)

### Maquina
- id (PK)
- codigo (string, único)
- descricao (string)
- setor (string)
- ativo (boolean)

## Fluxos Principais do Sistema

### 1. Fluxo de Login
1. Usuário acessa a página de login
2. Insere suas credenciais (usuário e senha)
3. Sistema valida as credenciais no backend
4. Se válido, gera token JWT e armazena em cookie seguro
5. Redireciona para a interface adequada (admin ou operador)

### 2. Fluxo de Cadastro de Produto e Fases
1. Administrador acessa a interface admin
2. Cadastra um novo produto com informações básicas
3. Adiciona fases ao produto, especificando ordem e tempos
4. Configura checklist para fases específicas quando necessário

### 3. Fluxo de Criação de Lote
1. Administrador cria novo lote
2. Seleciona produtos a serem produzidos
3. Define quantidades
4. Opcionalmente, duplica configurações de lote existente
5. Finaliza a criação do lote para produção

### 4. Fluxo de Apontamento de Produção
1. Operador faz login no sistema
2. Escaneia QR Code do lote/produto ou seleciona manualmente
3. Visualiza as fases disponíveis para o produto
4. Inicia a fase desejada
5. Preenche checklist obrigatório ao finalizar a fase
6. Registra observações se necessário
7. Finaliza o apontamento

### 5. Fluxo de Monitoramento (Dashboard)
1. Administrador acessa o dashboard
2. Visualiza status atual da produção
3. Identifica gargalos ou atrasos
4. Analisa KPIs de produtividade
5. Exporta relatórios conforme necessário

## Requisitos de Interface

### Tela de Login
- Design limpo e minimalista
- Formulário com campos de usuário e senha
- Mensagens de erro claras e informativas
- Opção de "Lembrar-me"
- Segurança com proteção contra tentativas excessivas (rate limiting)

### Interface do Administrador
- Menu de navegação com todas as funcionalidades disponíveis
- Tabelas responsivas para listagem de dados
- Formulários para cadastro e edição
- Dashboard com gráficos e indicadores
- Área de gerenciamento de usuários
- Função de logout claramente visível

### Interface do Operador
- Foco no apontamento de produção
- Leitor de QR Code em destaque
- Listagem clara das fases do produto selecionado
- Indicadores visuais de tempo (cores para mostrar status)
- Checklist interativo para finalização de fases
- Função de logout claramente visível
- Design simplificado para uso em tablets ou dispositivos industriais

## Requisitos Técnicos

### Segurança
- Implementação de autenticação JWT
- Uso de HTTPS (em produção)
- Proteção contra CSRF
- Proteção contra SQL Injection através do ORM
- Sanitização de entradas do usuário
- Rate limiting para evitar ataques de força bruta
- Validação de dados no backend com Pydantic

### Performance
- Otimização de consultas ao banco de dados
- Cache de dados frequentemente acessados
- Lazy loading para recursos pesados
- Paginação para listagens extensas

### Qualidade de Código
- Implementação de testes unitários
- Documentação de endpoints com Swagger/OpenAPI
- Uso de linters e formatadores de código
- Versionamento semântico
- Commits claros e descritivos

## Melhorias Críticas a Implementar

1. **Proteção de Acesso Admin**: Garantir que a página de administração exija autenticação e verifique o nível de acesso do usuário.

2. **Botão de Logout**: Implementar botão de logout em todas as interfaces (admin e operador) e garantir a invalidação correta da sessão.

3. **Versionamento de Lotes**: Implementar funcionalidade para duplicar lotes existentes, permitindo reutilizar configurações de produtos.

4. **Exibição Dinâmica de Produtos**: Atualizar a interface do operador para buscar produtos do backend API em vez de usar dados hardcoded no JavaScript.

5. **Sessão Persistente**: Garantir que a sessão do usuário seja mantida corretamente e verificada em todas as requisições.

## Considerações de Implantação

### Ambiente de Desenvolvimento
- Configuração de PostgreSQL local ou em container Docker
- Script para criação inicial do banco de dados e tabelas
- Script para geração de dados de teste
- Configuração via variáveis de ambiente (.env)

### Ambiente de Produção
- Banco de dados PostgreSQL com configurações otimizadas
- Uso de HTTPS com certificados válidos
- Configuração de backups automáticos do banco de dados
- Monitoramento de erros e performance

## Roadmap de Desenvolvimento

### Fase 1: Estrutura Básica
- [x] Configuração do projeto FastAPI
- [x] Implementação do banco de dados e modelos
- [x] Estrutura base do frontend

### Fase 2: Funcionalidades Core
- [x] Sistema de autenticação
- [x] CRUD de produtos, fases e operadores
- [x] CRUD de lotes

### Fase 3: Apontamento de Produção
- [x] Interface do operador
- [x] Leitor de QR Code
- [x] Registro de apontamentos

### Fase 4: Dashboard e Relatórios
- [x] Implementação do dashboard
- [x] Geração de relatórios
- [x] KPIs de produção

### Fase 5: Melhorias e Otimizações
- [x] Melhorias de UX/UI
- [x] Otimizações de performance
- [x] Testes e correção de bugs
- [x] Documentação final

## Conclusão

Este prompt fornece uma visão detalhada para reconstruir o Sistema de Apontamento Produtivo, abordando todos os aspectos necessários para um desenvolvimento bem-sucedido. A implementação deve seguir as práticas modernas de desenvolvimento web, com foco em segurança, usabilidade e performance.

O sistema deve ser robusto o suficiente para uso em ambiente industrial, mas também simples o bastante para operação por usuários com diferentes níveis de habilidade técnica. As melhorias identificadas nas análises anteriores devem ser priorizadas para garantir que o sistema atenda completamente às necessidades dos usuários.
