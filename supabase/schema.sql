-- GDScribe — Supabase schema
-- Cole este arquivo inteiro no SQL Editor do seu projeto Supabase e rode.
-- Idempotente: pode rodar de novo sempre que este arquivo for atualizado
-- (ex: depois de puxar uma versão nova do app) para aplicar migrações.

create extension if not exists "pgcrypto";

-- ============================================================
-- projects
-- ============================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  status text not null default 'pre_production',
  primary_genre text,
  secondary_genre text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);

-- ============================================================
-- project_themes (1:1 with projects)
-- ============================================================
create table if not exists public.project_themes (
  project_id uuid primary key references public.projects (id) on delete cascade,
  primary_color text not null default '#ff3b30',
  accent_color text not null default '#ffd60a',
  background_color text not null default '#0b0b0c',
  surface_color text not null default '#17171a',
  text_color text not null default '#f3efe3',
  logo_url text,
  cover_image_url text,
  font_choice text not null default 'default',
  chart_colors jsonb not null default '["#ff3b30","#0a84ff","#ffd60a","#30d158","#bf5af2"]'::jsonb
);

-- ============================================================
-- project_phases — fases do projeto, totalmente editáveis (nome, ordem)
-- ============================================================
create table if not exists public.project_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_phases_project_id_idx on public.project_phases (project_id);

-- ============================================================
-- project_sectors — setores do projeto (marketing, programação, arte...),
-- totalmente editáveis, usados como filtro/marcação em vários módulos.
-- ============================================================
create table if not exists public.project_sectors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  color text not null default '#ffd60a',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_sectors_project_id_idx on public.project_sectors (project_id);

-- ============================================================
-- gdd_modules
-- ============================================================
create table if not exists public.gdd_modules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  parent_id uuid references public.gdd_modules (id) on delete cascade,
  key text not null,
  title text not null,
  icon text not null default 'FileText',
  -- Guarda a *key* de uma fase de public.project_phases (ou 'all'). Sem FK
  -- de propósito: fases são livremente editáveis/removíveis pelo usuário.
  phase text not null default 'all',
  status text,
  sort_order integer not null default 0,
  is_custom boolean not null default false,
  content text not null default '',
  extra_fields jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists gdd_modules_project_id_idx on public.gdd_modules (project_id);

-- ============================================================
-- inventory_types + inventory_items
-- ============================================================
create table if not exists public.inventory_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  icon text not null default 'Box',
  fields_schema jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0
);

create index if not exists inventory_types_project_id_idx on public.inventory_types (project_id);

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  type_id uuid not null references public.inventory_types (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  status text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_type_id_idx on public.inventory_items (type_id);
create index if not exists inventory_items_project_id_idx on public.inventory_items (project_id);

-- ============================================================
-- kanban_boards + kanban_columns + kanban_cards
-- Um projeto pode ter vários quadros (Ações, MoSCoW, etc).
-- ============================================================
create table if not exists public.kanban_boards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null default 'Ações',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kanban_boards_project_id_idx on public.kanban_boards (project_id);

create table if not exists public.kanban_columns (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  board_id uuid references public.kanban_boards (id) on delete cascade,
  name text not null,
  color text not null default '#ffd60a',
  sort_order integer not null default 0
);

create index if not exists kanban_columns_project_id_idx on public.kanban_columns (project_id);

create table if not exists public.kanban_cards (
  id uuid primary key default gen_random_uuid(),
  column_id uuid not null references public.kanban_columns (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  board_id uuid references public.kanban_boards (id) on delete cascade,
  title text not null,
  description text,
  tags text[] not null default '{}',
  icon text,
  cover_image_url text,
  checklist jsonb not null default '[]'::jsonb,
  extra_fields jsonb not null default '[]'::jsonb,
  start_date date,
  due_date date,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kanban_cards_column_id_idx on public.kanban_cards (column_id);
create index if not exists kanban_cards_project_id_idx on public.kanban_cards (project_id);

-- ============================================================
-- ideas
-- ============================================================
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  body text,
  tags text[] not null default '{}',
  status text not null default 'new' check (status in ('new', 'considering', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ideas_project_id_idx on public.ideas (project_id);

-- ============================================================
-- story_blocks — blocos de história/narrativa
-- ============================================================
create table if not exists public.story_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  parent_id uuid references public.story_blocks (id) on delete cascade,
  title text not null,
  content text not null default '',
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists story_blocks_project_id_idx on public.story_blocks (project_id);
-- índice de parent_id fica lá embaixo, depois da migração que garante a coluna
-- (bancos que já tinham story_blocks antes não ganham a coluna pelo create table acima)

-- ============================================================
-- game_references — referências externas + checklist do que aproveitar
-- ("references" é palavra reservada em SQL, por isso o nome mais específico)
-- ============================================================
create table if not exists public.game_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  source_url text,
  image_url text,
  notes text not null default '',
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_references_project_id_idx on public.game_references (project_id);

-- ============================================================
-- moodboard_folders + moodboard_images
-- ============================================================
create table if not exists public.moodboard_folders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  parent_id uuid references public.moodboard_folders (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists moodboard_folders_project_id_idx on public.moodboard_folders (project_id);

create table if not exists public.moodboard_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  folder_id uuid references public.moodboard_folders (id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create index if not exists moodboard_images_project_id_idx on public.moodboard_images (project_id);
create index if not exists moodboard_images_folder_id_idx on public.moodboard_images (folder_id);

-- ============================================================
-- reminders — eventos/lembretes com notificações configuráveis
-- ============================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time time,
  notes text,
  notifications jsonb not null default '[]'::jsonb,
  tags text[] not null default '{}',
  image_url text,
  importance text not null default 'normal',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_project_id_idx on public.reminders (project_id);
create index if not exists reminders_event_date_idx on public.reminders (event_date);

-- ============================================================
-- Migrações — garante as colunas novas em bancos criados com uma
-- versão anterior deste arquivo.
-- ============================================================
alter table public.gdd_modules add column if not exists status text;
alter table public.gdd_modules add column if not exists extra_fields jsonb not null default '[]'::jsonb;
alter table public.inventory_items add column if not exists status text;
alter table public.projects add column if not exists primary_genre text;
alter table public.projects add column if not exists secondary_genre text;
alter table public.project_themes add column if not exists surface_color text not null default '#17171a';
alter table public.project_themes add column if not exists text_color text not null default '#f3efe3';
alter table public.project_themes add column if not exists chart_colors jsonb not null default '["#ff3b30","#0a84ff","#ffd60a","#30d158","#bf5af2"]'::jsonb;
alter table public.story_blocks add column if not exists parent_id uuid references public.story_blocks (id) on delete cascade;
create index if not exists story_blocks_parent_id_idx on public.story_blocks (parent_id);
alter table public.kanban_cards add column if not exists extra_fields jsonb not null default '[]'::jsonb;
alter table public.reminders add column if not exists tags text[] not null default '{}';
alter table public.reminders add column if not exists image_url text;
alter table public.reminders add column if not exists importance text not null default 'normal';
alter table public.kanban_cards add column if not exists icon text;
alter table public.kanban_cards add column if not exists cover_image_url text;
alter table public.kanban_cards add column if not exists checklist jsonb not null default '[]'::jsonb;
alter table public.kanban_cards add column if not exists start_date date;
alter table public.kanban_cards add column if not exists due_date date;

alter table public.gdd_modules drop constraint if exists gdd_modules_phase_check;
alter table public.gdd_modules add column if not exists parent_id uuid references public.gdd_modules (id) on delete cascade;
create index if not exists gdd_modules_parent_id_idx on public.gdd_modules (parent_id);

alter table public.moodboard_folders add column if not exists parent_id uuid references public.moodboard_folders (id) on delete cascade;
create index if not exists moodboard_folders_parent_id_idx on public.moodboard_folders (parent_id);

alter table public.kanban_columns add column if not exists board_id uuid references public.kanban_boards (id) on delete cascade;
alter table public.kanban_cards add column if not exists board_id uuid references public.kanban_boards (id) on delete cascade;
create index if not exists kanban_columns_board_id_idx on public.kanban_columns (board_id);
create index if not exists kanban_cards_board_id_idx on public.kanban_cards (board_id);

-- Setores (marcação livre, tipo "todos" tratado no app como ausência de filtro)
alter table public.reminders add column if not exists sectors text[] not null default '{}';
alter table public.gdd_modules add column if not exists sectors text[] not null default '{}';
alter table public.kanban_cards add column if not exists sectors text[] not null default '{}';
alter table public.inventory_items add column if not exists sectors text[] not null default '{}';
alter table public.ideas add column if not exists sectors text[] not null default '{}';

-- Tags por item de inventário (filtráveis dentro de cada tipo)
alter table public.inventory_items add column if not exists tags text[] not null default '{}';

-- Duração de lembretes/tarefas no calendário
alter table public.reminders add column if not exists end_date date;

-- Múltiplas imagens por referência
alter table public.game_references add column if not exists image_urls text[] not null default '{}';

-- Imagem de capa do projeto, exibida no cartão da tela inicial
alter table public.projects add column if not exists cover_image_url text;

-- Cria um quadro "Ações" para projetos que já tinham colunas/cards de uma
-- versão anterior (sem o conceito de múltiplos quadros) e associa esse
-- quadro a essas colunas/cards que ainda estão com board_id nulo.
do $$
declare
  proj record;
  new_board_id uuid;
begin
  for proj in
    select distinct project_id from public.kanban_columns where board_id is null
  loop
    insert into public.kanban_boards (project_id, name, sort_order)
    values (proj.project_id, 'Ações', 0)
    returning id into new_board_id;

    update public.kanban_columns set board_id = new_board_id
      where project_id = proj.project_id and board_id is null;
    update public.kanban_cards set board_id = new_board_id
      where project_id = proj.project_id and board_id is null;
  end loop;
end $$;

-- Cria as 3 fases padrão para projetos que ainda não têm nenhuma fase
-- cadastrada em project_phases (todo projeto criado antes dessa versão).
insert into public.project_phases (project_id, key, label, sort_order)
select p.id, v.key, v.label, v.sort_order
from public.projects p
cross join (
  values
    ('pre_production', 'Pré-produção', 0),
    ('production', 'Produção', 1),
    ('post_production', 'Pós-produção', 2)
) as v(key, label, sort_order)
where not exists (
  select 1 from public.project_phases pp where pp.project_id = p.id
);

-- ============================================================
-- updated_at triggers
-- ============================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.gdd_modules;
create trigger set_updated_at before update on public.gdd_modules
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.inventory_items;
create trigger set_updated_at before update on public.inventory_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.ideas;
create trigger set_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.story_blocks;
create trigger set_updated_at before update on public.story_blocks
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.game_references;
create trigger set_updated_at before update on public.game_references
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.reminders;
create trigger set_updated_at before update on public.reminders
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — tudo restrito ao dono do projeto
-- ============================================================
alter table public.projects enable row level security;
alter table public.project_themes enable row level security;
alter table public.project_phases enable row level security;
alter table public.project_sectors enable row level security;
alter table public.gdd_modules enable row level security;
alter table public.inventory_types enable row level security;
alter table public.inventory_items enable row level security;
alter table public.kanban_boards enable row level security;
alter table public.kanban_columns enable row level security;
alter table public.kanban_cards enable row level security;
alter table public.ideas enable row level security;
alter table public.story_blocks enable row level security;
alter table public.game_references enable row level security;
alter table public.reminders enable row level security;
alter table public.moodboard_folders enable row level security;
alter table public.moodboard_images enable row level security;

drop policy if exists "own projects" on public.projects;
create policy "own projects" on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "own project_themes" on public.project_themes;
create policy "own project_themes" on public.project_themes
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own project_phases" on public.project_phases;
create policy "own project_phases" on public.project_phases
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own project_sectors" on public.project_sectors;
create policy "own project_sectors" on public.project_sectors
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own gdd_modules" on public.gdd_modules;
create policy "own gdd_modules" on public.gdd_modules
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own inventory_types" on public.inventory_types;
create policy "own inventory_types" on public.inventory_types
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own inventory_items" on public.inventory_items;
create policy "own inventory_items" on public.inventory_items
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own kanban_boards" on public.kanban_boards;
create policy "own kanban_boards" on public.kanban_boards
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own kanban_columns" on public.kanban_columns;
create policy "own kanban_columns" on public.kanban_columns
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own kanban_cards" on public.kanban_cards;
create policy "own kanban_cards" on public.kanban_cards
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own ideas" on public.ideas;
create policy "own ideas" on public.ideas
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own story_blocks" on public.story_blocks;
create policy "own story_blocks" on public.story_blocks
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own game_references" on public.game_references;
create policy "own game_references" on public.game_references
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own reminders" on public.reminders;
create policy "own reminders" on public.reminders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own moodboard_folders" on public.moodboard_folders;
create policy "own moodboard_folders" on public.moodboard_folders
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

drop policy if exists "own moodboard_images" on public.moodboard_images;
create policy "own moodboard_images" on public.moodboard_images
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid())
  );

-- ============================================================
-- Storage bucket para logos, capas e imagens embutidas em texto
-- ============================================================
insert into storage.buckets (id, name, public)
values ('project-assets', 'project-assets', true)
on conflict (id) do nothing;

-- Caminho esperado: <user_id>/<project_id>/pasta/arquivo.ext — o primeiro
-- segmento do path precisa ser o id do usuário autenticado. Esse é o padrão
-- recomendado pela própria Supabase (auth.uid() direto, sem join), evita
-- qualquer ambiguidade de tipo/índice que o padrão anterior (baseado em
-- project_id + join na tabela projects) podia disparar.
drop policy if exists "own project assets read" on storage.objects;
drop policy if exists "project assets read" on storage.objects;
create policy "project assets read" on storage.objects
  for select using (
    bucket_id = 'project-assets'
  );

drop policy if exists "own project assets write" on storage.objects;
drop policy if exists "project assets write" on storage.objects;
create policy "project assets write" on storage.objects
  for insert with check (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own project assets update" on storage.objects;
drop policy if exists "project assets update" on storage.objects;
create policy "project assets update" on storage.objects
  for update using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "own project assets delete" on storage.objects;
drop policy if exists "project assets delete" on storage.objects;
create policy "project assets delete" on storage.objects
  for delete using (
    bucket_id = 'project-assets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
