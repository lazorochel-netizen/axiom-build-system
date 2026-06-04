-- ============================================================
-- Axiom Build System — Add notes column to vehicles
-- Migration: 006_vehicles_notes.sql
-- Run in Supabase SQL Editor
-- ============================================================

alter table vehicles add column if not exists notes text;
