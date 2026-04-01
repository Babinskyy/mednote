create extension if not exists pgcrypto;

create table if not exists public.abbreviations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  shortcut text not null,
  expansion text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (user_id, shortcut)
);

create table if not exists public.medical_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_note text not null,
  expanded_note text not null,
  conversation_history jsonb not null default '[]'::jsonb,
  sections jsonb not null,
  suggestions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.medical_documents
add column if not exists conversation_history jsonb not null default '[]'::jsonb;

update public.medical_documents
set conversation_history = jsonb_build_array(
  jsonb_build_object(
    'kind', 'initial',
    'content', raw_note,
    'created_at', created_at
  )
)
where conversation_history = '[]'::jsonb;

alter table public.medical_documents drop constraint if exists medical_documents_user_id_key;

create index if not exists medical_documents_user_id_created_at_idx
on public.medical_documents(user_id, created_at desc, id desc);

create or replace function public.prune_medical_documents_history()
returns trigger
language plpgsql
as $$
begin
  delete from public.medical_documents
  where id in (
    select id
    from public.medical_documents
    where user_id = new.user_id
    order by created_at desc, id desc
    offset 10
  );

  return new;
end;
$$;

drop trigger if exists prune_medical_documents_history_after_insert on public.medical_documents;
create trigger prune_medical_documents_history_after_insert
after insert on public.medical_documents
for each row
execute function public.prune_medical_documents_history();

create table if not exists public.user_active_documents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_document_id uuid references public.medical_documents(id) on delete set null,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create table if not exists public.user_prompt_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sections_system_prompt text not null,
  sections_user_prompt text not null,
  suggestions_system_prompt text not null,
  suggestions_user_prompt text not null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.abbreviations enable row level security;
alter table public.medical_documents enable row level security;
alter table public.user_active_documents enable row level security;
alter table public.user_prompt_preferences enable row level security;

drop policy if exists "Users manage own abbreviations" on public.abbreviations;
create policy "Users manage own abbreviations"
on public.abbreviations
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own medical documents" on public.medical_documents;
create policy "Users manage own medical documents"
on public.medical_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own active document" on public.user_active_documents;
create policy "Users manage own active document"
on public.user_active_documents
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users manage own prompt preferences" on public.user_prompt_preferences;
create policy "Users manage own prompt preferences"
on public.user_prompt_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);