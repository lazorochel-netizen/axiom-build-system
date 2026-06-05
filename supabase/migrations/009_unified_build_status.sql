-- ============================================================
-- Axiom Build System — Unified Build Status
-- Migration: 009_unified_build_status.sql
-- Run in Supabase SQL Editor
-- ============================================================

-- Add kit manufacturing stages to the build_status enum
alter type build_status add value if not exists 'kit_designing'  after 'pending';
alter type build_status add value if not exists 'kit_production' after 'kit_designing';
alter type build_status add value if not exists 'kit_dispatched' after 'kit_production';
