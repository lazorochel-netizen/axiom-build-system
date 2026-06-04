-- ============================================================
-- Axiom Build System — Invoice Line Items
-- Migration: 004_invoice_items.sql
-- Run in Supabase SQL Editor
-- ============================================================

create table if not exists invoice_items (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references invoices(id) on delete cascade,
  description text not null,
  quantity    numeric(10,2) not null default 1,
  unit_price  numeric(10,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- Index for fast lookups by invoice
create index if not exists invoice_items_invoice_id_idx on invoice_items(invoice_id);

-- RLS: follow same pattern as invoices table
alter table invoice_items enable row level security;

-- Allow authenticated users full access (adjust to match your invoices RLS policy)
create policy "Authenticated users can manage invoice_items"
  on invoice_items for all
  to authenticated
  using (true)
  with check (true);
