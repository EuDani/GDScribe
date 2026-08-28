# GDScribe

O GDD do seu jogo, vivo e sempre atualizado. Um app para escrever e manter o Game Design Document
de forma modular, com inventário de objetos do jogo, kanban de ações e hub de ideias — e exportar o
documento completo a qualquer momento.

## Módulos

- **GDD por fase** — módulos de documentação organizados em pré-produção, produção e pós-produção,
  escritos em Markdown. Vêm 8 módulos padrão por projeto, e você pode criar/editar/excluir os seus.
- **Inventário modular** — crie tipos de objeto (NPCs, armas, itens…) com campos customizados
  (texto, número, seleção, imagem) e liste quantas entradas quiser de cada tipo.
- **Kanban** — quadro de ações por projeto, colunas customizáveis, arraste e solte.
- **Hub de ideias** — espaço para registrar e priorizar ideias antes de virarem escopo.
- **Tema por projeto** — cores, logo e capa próprios para cada jogo.
- **Exportação viva** — baixe o GDD completo em Markdown, ou abra uma versão pronta para
  impressão/PDF, sempre refletindo o estado atual do projeto.

## Stack

Vite + React + TypeScript + Tailwind CSS v4, [Supabase](https://supabase.com) (Postgres + Auth +
Storage), React Query, React Router, `@dnd-kit`, [Motion](https://motion.dev).

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha com os dados do seu projeto Supabase — veja SUPABASE_SETUP.md
npm run dev
```

Antes do primeiro uso, siga o [tutorial de setup do Supabase](SUPABASE_SETUP.md) — é preciso criar
um projeto Supabase e rodar o [`supabase/schema.sql`](supabase/schema.sql) uma vez.

## Build

```bash
npm run build
npm run preview
```

## Deploy no GitHub Pages

O workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builda e publica em
GitHub Pages a cada push em `main`. Antes de habilitar:

1. Em **Settings → Pages**, defina a fonte como **GitHub Actions**.
2. Em **Settings → Secrets and variables → Actions**, adicione `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY`.

O app roda como SPA estática com `HashRouter`, então não precisa de configuração extra de rewrite
para funcionar em rotas profundas no GitHub Pages.
