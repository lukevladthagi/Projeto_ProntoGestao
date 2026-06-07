# Projeto ProntoGestão

Sistema web do Hospital Prontocardio para gestão de indicadores, orçamento, check-ins operacionais, planos de ação e acompanhamento de desempenho das áreas.

O ProntoGestão foi criado para centralizar informações de gestão hospitalar, permitindo que a liderança acompanhe metas, resultados, pendências e ações corretivas em um único ambiente.

## Visão Geral

O projeto está organizado como um monorepo Yarn. A aplicação principal fica em `apps/web` e roda com Next.js na porta `4000`.

Principais módulos:

- Dashboard de indicadores.
- Cadastro e acompanhamento de indicadores.
- Check-ins mensais e periódicos.
- Histórico de lançamentos.
- Planos de ação para indicadores fora da meta.
- Orçamento e acompanhamento financeiro.
- Relatórios gerenciais.
- Configurações operacionais.
- Gestão de usuários, perfis e permissões.

## Stack

- Node.js
- Yarn 4
- Next.js
- React
- TypeScript
- Tailwind CSS
- PostgreSQL/Neon
- Better Auth
- TanStack Query
- Recharts
- Docker

## Estrutura

```text
.
+-- apps/
|   +-- web/       # Aplicação web Next.js
|   +-- mobile/    # Aplicação mobile/Expo gerada pelo Anything
+-- publisher/     # Scripts auxiliares de publicação/build
+-- Dockerfile     # Build de produção
+-- docker-compose.yml
+-- package.json   # Workspaces e resoluções do monorepo
+-- yarn.lock
```

## Requisitos

- Node.js LTS
- Git
- Corepack/Yarn
- Acesso ao banco PostgreSQL/Neon
- Docker, caso vá rodar em produção ou ambiente semelhante ao servidor

Verifique as versões:

```powershell
node --version
corepack --version
git --version
docker --version
```

## Configuração Local

Na raiz do projeto, habilite o Corepack e instale as dependências:

```powershell
corepack enable
corepack yarn install
```

Crie o arquivo `apps/web/.env` com as variáveis necessárias:

```env
DATABASE_URL="postgresql://usuario:senha@host/banco?sslmode=require"
BETTER_AUTH_URL="http://localhost:4000"
ANYTHING_PROJECT_TOKEN="seu_token_do_anything"
```

Nunca envie arquivos `.env` para o GitHub.

## Rodando Localmente

Para iniciar a aplicação web:

```powershell
corepack yarn workspace web dev
```

Acesse:

```text
http://localhost:4000
```

## Scripts Úteis

```powershell
# Desenvolvimento web
corepack yarn workspace web dev

# Build da aplicação web
corepack yarn workspace web build

# Iniciar build de produção
corepack yarn workspace web start

# Checagem TypeScript
corepack yarn workspace web typecheck
```

## Deploy Atual

No servidor do Hospital Prontocardio, o ProntoGestão está publicado em Docker:

```text
http://x.x.x.x:4000
```

Container:

```text
pronto-gestao
```

Porta:

```text
4000 -> 4000
```

O `docker-compose.yml` usa o arquivo:

```text
apps/web/.env.production
```

Esse arquivo contém variáveis sensíveis e não deve ser versionado.

## Banco de Dados

A aplicação usa PostgreSQL/Neon por meio da variável `DATABASE_URL`.

Observações importantes:

- A tabela `resultados` deve manter apenas um lançamento por `indicador_id` e `competencia_date`.
- Há controle para evitar duplicidade de check-ins no mesmo período.
- Ao lançar novamente o mesmo mês/ano, a API atualiza o registro existente quando aplicável.

## Fluxo Git

Repositório remoto:

```text
https://github.com/lukevladthagi/Projeto_ProntoGestao.git
```

Fluxo sugerido:

```powershell
git status
git add .
git commit -m "Descrição da alteração"
git push
```

## Segurança

- Não commitar `.env`, tokens, senhas ou strings reais de conexão.
- Se uma credencial for exposta acidentalmente, revogue-a e gere uma nova.
- Use variáveis de ambiente no ambiente de hospedagem.
- Controle permissões por perfil para evitar acesso indevido a dados sensíveis.

## Próximos Passos Sugeridos

- Revisar perfis de acesso por área.
- Documentar rotinas de backup do banco.
- Adicionar auditoria de alterações críticas.
- Criar rotina de homologação antes de publicação em produção.
