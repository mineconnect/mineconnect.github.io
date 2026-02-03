-- ==========================================
-- 1. CREACIÓN DE ESTRUCTURA BASE (Tablas)
-- ==========================================

-- Tabla de Empresas (Tenants)
create table public.companies (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  plan text default 'basic', -- 'basic', 'pro', 'enterprise'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en companies
alter table public.companies enable row level security;

-- Tabla de Perfiles de Usuario (Vincula auth.users con companies)
-- Asumimos que esta tabla no existía en el schema anterior
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  company_id uuid references public.companies(id) on delete restrict not null,
  role text default 'user', -- 'admin', 'user', 'super_admin'
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS en profiles
alter table public.profiles enable row level security;

-- ==========================================
-- 2. MODIFICACIÓN DE TABLAS EXISTENTES
-- ==========================================

-- Añadir company_id a VEHICLES
alter table public.vehicles 
add column if not exists company_id uuid references public.companies(id) on delete cascade;

-- Añadir company_id a SECURITY_EVENTS
alter table public.security_events 
add column if not exists company_id uuid references public.companies(id) on delete cascade;

-- ==========================================
-- 3. UPDATES DE DATOS EXISTENTES (Migración)
-- ==========================================

-- ¡IMPORTANTE! 
-- Si ya tienes datos, estos comandos asignarán una empresa por defecto para no romper la integridad.
-- Si es una base lavada (nueva), estos inserts de ejemplo ayudan a testear.

-- Insertar empresas de ejemplo
insert into public.companies (id, name, plan)
values 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Empresa A (Transportes del Norte)', 'enterprise'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Empresa B (Logística Sur)', 'basic')
on conflict (id) do nothing;

-- Actualizar vehículos existentes para que pertenezcan a la Empresa A (por defecto)
update public.vehicles 
set company_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
where company_id is null;

-- Hacer la columna obligatoria AHORA que tiene datos
alter table public.vehicles alter column company_id set not null;
alter table public.security_events alter column company_id set not null;

-- ==========================================
-- 4. POLÍTICAS DE SEGURIDAD (RLS)
-- ==========================================

-- Función Helper para obtener el company_id del usuario actual
-- Esto optimiza las políticas y hace el código más limpio
create or replace function public.get_my_company_id()
returns uuid as $$
  select company_id 
  from public.profiles 
  where id = auth.uid()
  limit 1;
$$ language sql stable security definer;

-- --- POLÍTICAS PARA COMPANIES ---
-- Los usuarios solo pueden ver su propia empresa
create policy "Users can view own company"
on public.companies for select
using ( id = public.get_my_company_id() );

-- --- POLÍTICAS PARA PROFILES ---
-- Los usuarios pueden ver los perfiles de sus compañeros de empresa
create policy "Users can view profiles from same company"
on public.profiles for select
using ( company_id = public.get_my_company_id() );

-- Permitir que el usuario edite su propio perfil
create policy "Users can update own profile"
on public.profiles for update
using ( id = auth.uid() );

-- Trigger para crear perfil automáticamente al registrarse (Opcional pero recomendado)
-- Nota: Esto requiere una función trigger que asigne una empresa por defecto o maneje invitaciones.
-- Por simplicidad, asumiremos inserción manual o desde el frontend en el registro por ahora.

-- --- POLÍTICAS PARA VEHICLES ---
-- Eliminar políticas antiguas si existen para evitar conflictos
drop policy if exists "Allow public read access" on vehicles;
drop policy if exists "Allow public update access" on vehicles;

-- Política de aislamiento estricto
create policy "Tenant Isolation Select Vehicles"
on public.vehicles for select
using ( company_id = public.get_my_company_id() );

create policy "Tenant Isolation Insert Vehicles"
on public.vehicles for insert
with check ( company_id = public.get_my_company_id() );

create policy "Tenant Isolation Update Vehicles"
on public.vehicles for update
using ( company_id = public.get_my_company_id() );

create policy "Tenant Isolation Delete Vehicles"
on public.vehicles for delete
using ( company_id = public.get_my_company_id() );

-- --- POLÍTICAS PARA SECURITY_EVENTS ---
drop policy if exists "Allow authenticated insert" on security_events;
drop policy if exists "Allow authenticated read" on security_events;

create policy "Tenant Isolation Select Events"
on public.security_events for select
using ( company_id = public.get_my_company_id() );

create policy "Tenant Isolation Insert Events"
on public.security_events for insert
with check ( company_id = public.get_my_company_id() );

-- ==========================================
-- 5. SEGURIDAD EXTRA (Super Admin Bypass)
-- ==========================================
-- Esta función verifica si el usuario es super_admin
create or replace function public.is_super_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'super_admin'
  );
$$ language sql stable security definer;

-- Ejemplo de cómo aplicar bypass (Opcional, si quieres que el super admin vea todo)
-- Modificarías las políticas USING así:
-- using ( company_id = public.get_my_company_id() OR public.is_super_admin() )
