-- Lernapp: Grundgerüst der Datenbank
-- In Supabase unter "SQL Editor" einfügen und auf "Run" klicken.
-- Jede Familie (ein Login) sieht nur ihre eigenen Daten (Row Level Security).

create extension if not exists pgcrypto;

-- Lernende: Kinder und Erwachsene einer Familie
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  avatar text not null default '🦊',
  grade int not null default 6,          -- Klassenstufe, 0 = erwachsen
  daily_goal int not null default 20,
  subjects text[] not null default array['lang','math'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sprachen (frei anlegbar, z. B. Englisch, Latein, Polnisch, Schlesisch)
create table if not exists public.languages (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  short text not null,
  tts text,                               -- Sprachcode für Vorlesen, z. B. en-GB; null = keine Stimme
  chars text not null default '',         -- Sonderzeichen-Tasten, z. B. ąćęłńóśźż
  info_label text not null default 'Hinweis',
  lenient boolean not null default false, -- großzügigere Prüfung der Schreibweise
  color text not null default '#5b6782',
  default_dir text not null default 'de', -- 'de' = Deutsch → Fremdsprache, 'fs' = umgekehrt
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lektionen gehören zu einem Profil
create table if not exists public.units (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  language_id uuid not null references public.languages(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Karteikarten (Vokabeln, später auch Fachbegriffe)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  term text not null,           -- Fremdsprache
  translation text not null,    -- Deutsch
  info text not null default '',
  extra jsonb not null default '{}'::jsonb,  -- für spätere Erweiterungen (z. B. dritte Seite, Audio)
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Lernstand im Karteikasten, pro Profil und Lernelement
-- item_key: "card:<uuid>" für Vokabeln, "mul:7:8" usw. für Mathe
create table if not exists public.progress (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  item_key text not null,
  box int not null default 0,
  due timestamptz not null default now(),
  right_count int not null default 0,
  wrong_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, item_key)
);

-- Tagesstatistik pro Profil
create table if not exists public.activity (
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  answers int not null default 0,
  correct int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (profile_id, day)
);

create index if not exists units_profile_idx on public.units(profile_id);
create index if not exists cards_unit_idx on public.cards(unit_id);

-- Row Level Security: jede Familie sieht nur ihre eigenen Zeilen
do $$
declare t text;
begin
  foreach t in array array['profiles','languages','units','cards','progress','activity'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()))', t);
  end loop;
end $$;
