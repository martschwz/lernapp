-- Lernapp: PINs für Eltern und Kinder
-- Nach 0001_init.sql im SQL Editor ausführen (einfach einfügen und "Run" klicken).

-- PIN eines Profils (verschlüsselt gespeichert, nie im Klartext)
alter table public.profiles add column if not exists pin_hash text;

-- Einstellungen der Familie, z. B. die Eltern-PIN
create table if not exists public.family_settings (
  owner uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  parent_pin_hash text,
  updated_at timestamptz not null default now()
);

alter table public.family_settings enable row level security;
drop policy if exists "own rows" on public.family_settings;
create policy "own rows" on public.family_settings for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
