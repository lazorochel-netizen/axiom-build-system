-- ============================================================
-- Axiom Build System — Initial Schema
-- Migration: 001_initial_schema.sql
-- Date: 2026-06-01
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('operations_manager', 'fitter');

create type build_status as enum (
  'pending',
  'in_progress',
  'waiting_on_parts',
  'waiting_on_compliance',
  'completed',
  'delivered'
);

create type task_status as enum ('pending', 'in_progress', 'completed');

create type quotation_status as enum ('draft', 'sent', 'accepted', 'declined');

create type invoice_status as enum ('draft', 'sent', 'paid', 'overdue');


-- ============================================================
-- USERS
-- Staff only. Customers are a separate table.
-- ============================================================

create table users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null unique,
  role        user_role not null,
  created_at  timestamptz not null default now()
);

-- Auto-create a user profile when a new auth user signs up
create or replace function handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'fitter')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_auth_user();


-- ============================================================
-- CUSTOMERS
-- Not system users — access via portal token only.
-- ============================================================

create table customers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text,
  phone         text,
  portal_token  text not null unique default encode(gen_random_bytes(24), 'hex'),
  created_at    timestamptz not null default now()
);


-- ============================================================
-- VEHICLES
-- ============================================================

create table vehicles (
  id                        uuid primary key default gen_random_uuid(),
  job_id                    text not null unique,
  vin                       text,
  stock_number              text,
  registration              text,
  customer_id               uuid references customers(id) on delete set null,
  vehicle_make              text not null,
  vehicle_model             text not null,
  vehicle_year              int,
  build_type                text not null,
  build_status              build_status not null default 'pending',
  estimated_completion_date date,
  handover_date             date,
  created_by                uuid references users(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- Auto-generate job_id: AXM-YYYYMM-NNNN
create sequence job_id_seq;

create or replace function generate_job_id()
returns trigger language plpgsql as $$
begin
  new.job_id := 'AXM-' ||
    to_char(now(), 'YYYYMM') || '-' ||
    lpad(nextval('job_id_seq')::text, 4, '0');
  return new;
end;
$$;

create trigger set_job_id
  before insert on vehicles
  for each row
  when (new.job_id is null or new.job_id = '')
  execute procedure generate_job_id();

-- Auto-update updated_at
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger vehicles_updated_at
  before update on vehicles
  for each row execute procedure touch_updated_at();


-- ============================================================
-- QR CODES
-- ============================================================

create table qr_codes (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references vehicles(id) on delete cascade,
  token         text not null unique default encode(gen_random_bytes(16), 'hex'),
  generated_by  uuid references users(id) on delete set null,
  generated_at  timestamptz not null default now(),
  is_active     boolean not null default true
);


-- ============================================================
-- TASKS
-- ============================================================

create table tasks (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    uuid not null references vehicles(id) on delete cascade,
  task_name     text not null,
  task_category text not null,
  task_order    int not null default 0,
  role_required user_role not null default 'fitter',
  is_required   boolean not null default true,
  photo_required boolean not null default false,
  assigned_to   uuid references users(id) on delete set null,
  completed_by  uuid references users(id) on delete set null,
  status        task_status not null default 'pending',
  notes         text,
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now()
);


-- ============================================================
-- TASK TEMPLATES
-- Pre-defined checklists per build type.
-- ============================================================

create table task_templates (
  id            uuid primary key default gen_random_uuid(),
  build_type    text not null,
  task_name     text not null,
  task_category text not null,
  task_order    int not null default 0,
  role_required user_role not null default 'fitter',
  is_required   boolean not null default true,
  photo_required boolean not null default false
);


-- ============================================================
-- QUOTATIONS
-- ============================================================

create table quotations (
  id           uuid primary key default gen_random_uuid(),
  vehicle_id   uuid not null references vehicles(id) on delete cascade,
  customer_id  uuid references customers(id) on delete set null,
  created_by   uuid references users(id) on delete set null,
  total_amount numeric(10, 2) not null default 0,
  status       quotation_status not null default 'draft',
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger quotations_updated_at
  before update on quotations
  for each row execute procedure touch_updated_at();


-- ============================================================
-- INVOICES
-- ============================================================

create table invoices (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles(id) on delete cascade,
  quotation_id   uuid references quotations(id) on delete set null,
  customer_id    uuid references customers(id) on delete set null,
  created_by     uuid references users(id) on delete set null,
  total_amount   numeric(10, 2) not null default 0,
  status         invoice_status not null default 'draft',
  due_date       date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger invoices_updated_at
  before update on invoices
  for each row execute procedure touch_updated_at();


-- ============================================================
-- DOCUMENTS
-- ============================================================

create table documents (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles(id) on delete cascade,
  document_name  text not null,
  document_type  text not null,
  file_url       text not null,
  uploaded_by    uuid references users(id) on delete set null,
  uploaded_at    timestamptz not null default now()
);


-- ============================================================
-- PHOTOS
-- ============================================================

create table photos (
  id                   uuid primary key default gen_random_uuid(),
  vehicle_id           uuid not null references vehicles(id) on delete cascade,
  task_id              uuid references tasks(id) on delete set null,
  image_url            text not null,
  uploaded_by          uuid references users(id) on delete set null,
  is_customer_visible  boolean not null default false,
  approved_by          uuid references users(id) on delete set null,
  uploaded_at          timestamptz not null default now()
);


-- ============================================================
-- ACTIVITY LOG
-- Audit trail for compliance traceability.
-- ============================================================

create table activity_log (
  id          uuid primary key default gen_random_uuid(),
  vehicle_id  uuid references vehicles(id) on delete set null,
  task_id     uuid references tasks(id) on delete set null,
  user_id     uuid references users(id) on delete set null,
  action      text not null,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
alter table users          enable row level security;
alter table customers      enable row level security;
alter table vehicles       enable row level security;
alter table qr_codes       enable row level security;
alter table tasks          enable row level security;
alter table task_templates enable row level security;
alter table quotations     enable row level security;
alter table invoices       enable row level security;
alter table documents      enable row level security;
alter table photos         enable row level security;
alter table activity_log   enable row level security;

-- Helper: get current user's role
create or replace function current_user_role()
returns user_role language sql security definer as $$
  select role from public.users where id = auth.uid()
$$;

-- Operations Manager: full access to everything
create policy "ops_manager_full_access" on vehicles
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on tasks
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on customers
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on quotations
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on invoices
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on documents
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on photos
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on qr_codes
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on activity_log
  for all to authenticated
  using (current_user_role() = 'operations_manager');

create policy "ops_manager_full_access" on task_templates
  for all to authenticated
  using (current_user_role() = 'operations_manager');

-- Fitters: read vehicles assigned to them, update their own tasks
create policy "fitters_read_vehicles" on vehicles
  for select to authenticated
  using (
    current_user_role() = 'fitter' and
    exists (
      select 1 from tasks
      where tasks.vehicle_id = vehicles.id
      and tasks.assigned_to = auth.uid()
    )
  );

create policy "fitters_update_own_tasks" on tasks
  for update to authenticated
  using (
    current_user_role() = 'fitter' and
    assigned_to = auth.uid()
  );

create policy "fitters_read_own_tasks" on tasks
  for select to authenticated
  using (
    current_user_role() = 'fitter' and
    assigned_to = auth.uid()
  );

create policy "fitters_upload_photos" on photos
  for insert to authenticated
  with check (current_user_role() = 'fitter');

-- Users can read their own profile
create policy "users_read_own_profile" on users
  for select to authenticated
  using (id = auth.uid());
