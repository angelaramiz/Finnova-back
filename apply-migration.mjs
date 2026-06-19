/**
 * Aplica la migración de allowed_emails y account_requests
 * usando la Supabase Management API (requiere Personal Access Token)
 * 
 * Uso: node apply-migration.mjs <SUPABASE_ACCESS_TOKEN>
 * 
 * Obtén el token en: https://supabase.com/dashboard/account/tokens
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = 'mzuskyallekjvlcmmmjw';
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error('❌ Uso: node apply-migration.mjs <PERSONAL_ACCESS_TOKEN>');
  console.error('   Genera tu token en: https://supabase.com/dashboard/account/tokens');
  process.exit(1);
}

const SQL = `
-- allowed_emails
create table if not exists public.allowed_emails (
    email text primary key,
    role text not null default 'student' check (role in ('student', 'instructor', 'admin')),
    "fullName" text,
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.allowed_emails enable row level security;

drop policy if exists "Admins can manage allowed emails" on public.allowed_emails;
create policy "Admins can manage allowed emails"
    on public.allowed_emails for all
    using (exists (select 1 from public.profiles where profiles.id = auth.uid() and role = 'admin'));

drop policy if exists "Service role bypass RLS allowed_emails" on public.allowed_emails;
create policy "Service role bypass RLS allowed_emails"
    on public.allowed_emails for select using (true);

-- account_requests
create table if not exists public.account_requests (
    id text primary key,
    "fullName" text not null,
    email text not null unique,
    role text not null check (role in ('student', 'instructor')),
    specialty text,
    status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
    "createdAt" timestamp with time zone default timezone('utc'::text, now()) not null
);
alter table public.account_requests enable row level security;

drop policy if exists "Anyone can submit a registration request" on public.account_requests;
create policy "Anyone can submit a registration request"
    on public.account_requests for insert with check (true);

drop policy if exists "Admins can view and manage registration requests" on public.account_requests;
create policy "Admins can view and manage registration requests"
    on public.account_requests for all
    using (exists (select 1 from public.profiles where profiles.id = auth.uid() and role = 'admin'));

-- Recargar schema cache de PostgREST
notify pgrst, 'reload schema';

select 'OK' as result;
`;

console.log('🚀 Aplicando migración via Management API...\n');

const resp = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ query: SQL })
});

const body = await resp.json();

if (!resp.ok) {
  console.error(`❌ Error ${resp.status}:`, JSON.stringify(body, null, 2));
  process.exit(1);
}

console.log('✅ Migración aplicada exitosamente!');
console.log('   Resultado:', JSON.stringify(body));
