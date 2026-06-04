-- ============================================================
-- Axiom Build System — Row Level Security
-- Migration: 005_row_level_security.sql
-- Run in Supabase SQL Editor
--
-- IMPORTANT: The app uses two Supabase clients:
--   • createClient()      → regular auth client  (subject to RLS)
--   • createAdminClient() → service role client  (bypasses RLS)
-- Public pages (portal, QR job) already use admin client for reads.
-- ============================================================


-- ============================================================
-- HELPER: get role of the currently authenticated user
-- ============================================================
create or replace function get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from users where id = auth.uid()
$$;


-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
alter table users           enable row level security;
alter table customers       enable row level security;
alter table vehicles        enable row level security;
alter table tasks           enable row level security;
alter table qr_codes        enable row level security;
alter table photos          enable row level security;
alter table job_fitters     enable row level security;
alter table task_fitters    enable row level security;
alter table task_templates  enable row level security;
alter table activity_log    enable row level security;
alter table documents       enable row level security;
alter table invoices        enable row level security;
alter table quotations      enable row level security;
alter table invoice_items   enable row level security;


-- ============================================================
-- USERS TABLE
-- ============================================================
-- Everyone authenticated can read all users (needed for fitter lists, name display)
create policy "users: authenticated can read"
  on users for select to authenticated using (true);

-- Users can update only their own row
create policy "users: can update own row"
  on users for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Only ops managers can insert / delete users
create policy "users: ops can insert"
  on users for insert to authenticated
  with check (get_my_role() = 'operations_manager');

create policy "users: ops can delete"
  on users for delete to authenticated
  using (get_my_role() = 'operations_manager');


-- ============================================================
-- CUSTOMERS TABLE
-- ============================================================
create policy "customers: authenticated can read"
  on customers for select to authenticated using (true);

create policy "customers: ops can insert"
  on customers for insert to authenticated
  with check (get_my_role() = 'operations_manager');

create policy "customers: ops can update"
  on customers for update to authenticated
  using (get_my_role() = 'operations_manager');

create policy "customers: ops can delete"
  on customers for delete to authenticated
  using (get_my_role() = 'operations_manager');


-- ============================================================
-- VEHICLES TABLE
-- ============================================================
create policy "vehicles: authenticated can read"
  on vehicles for select to authenticated using (true);

create policy "vehicles: ops can insert"
  on vehicles for insert to authenticated
  with check (get_my_role() = 'operations_manager');

create policy "vehicles: ops can update"
  on vehicles for update to authenticated
  using (get_my_role() = 'operations_manager');

create policy "vehicles: ops can delete"
  on vehicles for delete to authenticated
  using (get_my_role() = 'operations_manager');


-- ============================================================
-- TASKS TABLE
-- ============================================================
create policy "tasks: authenticated can read"
  on tasks for select to authenticated using (true);

-- Ops can insert/delete
create policy "tasks: ops can insert"
  on tasks for insert to authenticated
  with check (get_my_role() = 'operations_manager');

create policy "tasks: ops can delete"
  on tasks for delete to authenticated
  using (get_my_role() = 'operations_manager');

-- Both ops and fitters can update tasks
-- (fitters update status; ops update everything)
create policy "tasks: authenticated can update"
  on tasks for update to authenticated
  using (true);


-- ============================================================
-- QR CODES TABLE
-- ============================================================
create policy "qr_codes: authenticated can read"
  on qr_codes for select to authenticated using (true);

create policy "qr_codes: ops can manage"
  on qr_codes for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');


-- ============================================================
-- PHOTOS TABLE
-- ============================================================
create policy "photos: authenticated can read"
  on photos for select to authenticated using (true);

-- All authenticated users can insert photos (fitters upload via QR)
create policy "photos: authenticated can insert"
  on photos for insert to authenticated
  with check (true);

-- Ops can update visibility / delete
create policy "photos: ops can update"
  on photos for update to authenticated
  using (get_my_role() = 'operations_manager');

create policy "photos: ops can delete"
  on photos for delete to authenticated
  using (get_my_role() = 'operations_manager');


-- ============================================================
-- JOB FITTERS TABLE
-- ============================================================
create policy "job_fitters: authenticated can read"
  on job_fitters for select to authenticated using (true);

create policy "job_fitters: ops can manage"
  on job_fitters for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');


-- ============================================================
-- TASK FITTERS TABLE
-- ============================================================
create policy "task_fitters: authenticated can read"
  on task_fitters for select to authenticated using (true);

create policy "task_fitters: ops can manage"
  on task_fitters for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');


-- ============================================================
-- TASK TEMPLATES TABLE (read-only for fitters)
-- ============================================================
create policy "task_templates: authenticated can read"
  on task_templates for select to authenticated using (true);

create policy "task_templates: ops can manage"
  on task_templates for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');


-- ============================================================
-- ACTIVITY LOG TABLE
-- ============================================================
-- Ops can read everything; fitters can only read their assigned vehicles
create policy "activity_log: ops can read all"
  on activity_log for select to authenticated
  using (get_my_role() = 'operations_manager');

create policy "activity_log: fitters can read their vehicles"
  on activity_log for select to authenticated
  using (
    get_my_role() = 'fitter'
    and vehicle_id in (
      select vehicle_id from job_fitters where user_id = auth.uid()
    )
  );

-- All authenticated users can insert logs
create policy "activity_log: authenticated can insert"
  on activity_log for insert to authenticated
  with check (true);


-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
create policy "documents: authenticated can read"
  on documents for select to authenticated using (true);

create policy "documents: authenticated can insert"
  on documents for insert to authenticated
  with check (true);

create policy "documents: ops can delete"
  on documents for delete to authenticated
  using (get_my_role() = 'operations_manager');


-- ============================================================
-- INVOICES & QUOTATIONS (ops only)
-- ============================================================
create policy "invoices: ops can manage"
  on invoices for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');

create policy "quotations: ops can manage"
  on quotations for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');

create policy "invoice_items: ops can manage"
  on invoice_items for all to authenticated
  using (get_my_role() = 'operations_manager')
  with check (get_my_role() = 'operations_manager');


-- ============================================================
-- VERIFY: list all policies created
-- ============================================================
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
