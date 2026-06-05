-- ============================================================
-- Axiom Build System — Manufacturer Role & Kit Orders
-- Migration: 008_manufacturer_role_and_kit_orders.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add 'manufacturer' to the user_role enum
alter type user_role add value if not exists 'manufacturer';

-- 2. Add 'waiting_for_kit' kit status enum
create type kit_status as enum ('designing', 'production', 'completed', 'dispatched');

-- 3. Kit orders table — one row per job, tracks overseas kit manufacture
create table if not exists kit_orders (
  id                  uuid primary key default gen_random_uuid(),
  vehicle_id          uuid not null references vehicles(id) on delete cascade,
  status              kit_status not null default 'designing',
  manufacturer_notes  text,          -- notes back from manufacturer to ops
  updated_by          uuid references users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(vehicle_id)  -- one kit order per job
);

-- Auto-update updated_at
create or replace function kit_orders_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger kit_orders_updated_at
  before update on kit_orders
  for each row execute procedure kit_orders_updated_at();

-- Index
create index if not exists kit_orders_vehicle_id_idx on kit_orders(vehicle_id);

-- RLS
alter table kit_orders enable row level security;

-- Authenticated users can read all kit orders
create policy "kit_orders: authenticated can read"
  on kit_orders for select to authenticated using (true);

-- Manufacturers can insert and update
create policy "kit_orders: manufacturer can insert"
  on kit_orders for insert to authenticated
  with check (get_my_role() = 'manufacturer');

create policy "kit_orders: manufacturer can update"
  on kit_orders for update to authenticated
  using (get_my_role() = 'manufacturer');

-- Ops can manage everything
create policy "kit_orders: ops can manage"
  on kit_orders for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');
