# Projeto ProntoGestao

Projeto de sistema responsavel por gerenciar indicadores e orcamento da unidade hospitalar.

Sistema web para gestao de indicadores, check-ins periodicos, planos de acao, orcamento, relatorios e configuracoes operacionais.

## Visao Geral

O projeto foi gerado a partir do Anything e esta organizado como um monorepo Yarn. A aplicacao principal fica em `apps/web` e roda com Next.js na porta `4000`.

Principais modulos:

- Dashboard de indicadores
- Cadastro e acompanhamento de indicadores
- Check-in mensal/semanal de resultados
- Historico de lancamentos
- Planos de acao para indicadores fora da meta
- Orcamento
- Relatorios
- Configuracoes, usuarios, perfis e integracoes

## Stack

- Node.js
- Yarn 4
- Next.js
- React
- TypeScript
- Tailwind CSS
- Neon/PostgreSQL
- Better Auth
- TanStack Query
- Recharts

## Estrutura

```text
.
+-- apps/
|   +-- web/       # Aplicacao web Next.js
|   +-- mobile/    # Aplicacao mobile/Expo gerada pelo Anything
+-- publisher/     # Scripts auxiliares de publicacao/build
+-- package.json   # Workspaces e resolucoes do monorepo
+-- yarn.lock
```

## Requisitos

- Node.js LTS instalado
- Git instalado
- Acesso a um banco PostgreSQL/Neon
- Yarn via Corepack

Verifique as versoes:

```powershell
node --version
corepack --version
git --version
```

## Configuracao Local

Na raiz do projeto, habilite o Corepack e instale as dependencias:

```powershell
corepack enable
corepack yarn install
```

Crie o arquivo `apps/web/.env` com as variaveis necessarias:

```env
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"
BETTER_AUTH_URL="http://localhost:4000"
ANYTHING_PROJECT_TOKEN="seu_token_do_anything"
```

Nunca envie o `.env` para o GitHub. Ele ja esta listado no `.gitignore`.

## Rodando o Projeto

Para iniciar a aplicacao web:

```powershell
corepack yarn workspace web dev
```

Acesse:

```text
http://localhost:4000
```

## Scripts Uteis

```powershell
# Desenvolvimento web
corepack yarn workspace web dev

# Build da aplicacao web
corepack yarn workspace web build

# Iniciar build de producao
corepack yarn workspace web start

# Checagem TypeScript
corepack yarn workspace web typecheck
```

## Banco de Dados

A aplicacao usa PostgreSQL/Neon por meio da variavel `DATABASE_URL`.

Observacoes importantes:

- A tabela `resultados` deve manter apenas um lancamento por `indicador_id` e `competencia_date`.
- Foi criado um indice unico para evitar duplicidade de check-ins no mesmo periodo.
- Ao lancar novamente o mesmo mes/ano, a API atualiza o registro existente em vez de criar outro.

## Git

Repositorio remoto:

```text
https://github.com/lukevladthagi/Projeto_ProntoGestao
```

Fluxo sugerido:

```powershell
git status
git add .
git commit -m "Descricao da alteracao"
git push
```

## Notas de Seguranca

- Nao commitar `.env`, tokens, senhas ou strings reais de conexao.
- Se uma credencial for exposta acidentalmente, revogue-a e gere uma nova.
- Use variaveis de ambiente no ambiente de hospedagem.

