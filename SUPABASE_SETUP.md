# Configurando o Supabase para o GDScribe

O GDScribe usa o [Supabase](https://supabase.com) como backend: Postgres (banco), Auth (login) e
Storage (upload de imagens de tema). Siga os passos abaixo — leva uns 10 minutos.

## 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (ou entre).
2. Clique em **New Project**.
3. Escolha uma organização, dê um nome (ex: `gdscribe`), defina uma senha de banco forte e a região
   mais próxima de você.
4. Aguarde a criação do projeto (leva 1-2 minutos).

## 2. Rodar o schema SQL

1. No painel do projeto, abra **SQL Editor** (menu lateral).
2. Clique em **New query**.
3. Abra o arquivo [`supabase/schema.sql`](supabase/schema.sql) deste repositório, copie todo o
   conteúdo e cole no editor.
4. Clique em **Run**. Isso cria todas as tabelas (`projects`, `gdd_modules`, `inventory_types`,
   `inventory_items`, `kanban_columns`, `kanban_cards`, `ideas`, `project_themes`), as políticas de
   Row Level Security (cada usuário só vê os próprios projetos) e o bucket de storage
   `project-assets` com suas políticas de acesso.

Se precisar rodar de novo (ex: depois de um `reset`), o script é idempotente — pode rodar quantas
vezes quiser.

## 3. Pegar a URL e a chave anônima

1. Vá em **Project Settings → API**.
2. Copie o **Project URL** e a chave em **Project API keys → anon public**.

Essa chave é segura para expor no frontend: ela só permite o que as políticas de RLS liberarem, e o
schema acima já restringe tudo ao dono de cada projeto.

## 4. Configurar o app localmente

Na raiz do projeto:

```bash
cp .env.example .env.local
```

Edite `.env.local` e preencha:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
```

Rode `npm run dev` e crie uma conta pela tela de signup do app.

## 5. Confirmação de e-mail (opcional)

Por padrão o Supabase exige confirmação de e-mail antes do primeiro login. Para testar mais rápido
em desenvolvimento, você pode desativar isso em **Authentication → Providers → Email → Confirm
email** (desligue a opção). Em produção, o recomendado é deixar ligado.

## 6. Deploy (GitHub Pages)

Para o app publicado no GitHub Pages também falar com o Supabase, adicione as mesmas duas variáveis
como **Repository secrets** no GitHub (`Settings → Secrets and variables → Actions`):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

O workflow em [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) já está configurado
para injetá-las no build.
