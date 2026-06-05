-- ============================================================
-- Axiom Build System — Fitter PINs
-- Migration: 007_fitter_pins.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- Add PIN column to users (4-digit string, nullable — ops managers don't need one)
alter table users add column if not exists pin text;

-- Optional: add a comment for documentation
comment on column users.pin is '4-digit PIN used by fitters to check in via QR job page';
