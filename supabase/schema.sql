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
  user_id uuid not null unique references auth.users(id) on delete cascade,
  raw_note text not null,
  expanded_note text not null,
  sections jsonb not null,
  suggestions text[] not null default '{}',
  created_at timestamptz not null default timezone('utc'::text, now())
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

drop policy if exists "Users manage own prompt preferences" on public.user_prompt_preferences;
create policy "Users manage own prompt preferences"
on public.user_prompt_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);