-- ============================================================
-- Axiom Build System — Upgrades & Add-Ons
-- Migration: 003_upgrades.sql
-- Date: 2026-06-01
--
-- Adds base_price and is_upgrade columns to task_templates.
-- Inserts all popular upgrades as optional (is_required = false)
-- tasks that can be added to any job.
-- ============================================================

-- Add price and upgrade flag to task_templates
alter table task_templates
  add column if not exists base_price  numeric(10,2) default 0,
  add column if not exists is_upgrade  boolean not null default false;

-- Clear any existing upgrades to allow safe re-run
delete from task_templates where is_upgrade = true;


-- ============================================================
-- UPGRADES — apply to all Hiace build types
-- Axiom 30 / Axiom 20 upgrades can be added once confirmed.
-- ============================================================

-- COMFORT & CLIMATE
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, is_upgrade, photo_required, base_price)
values
  ('Hiace SLWB',          'Install Maxxair roof fan',                         'Comfort & Climate', 70, 'fitter', false, true, true,  1200.00),
  ('Hiace LWB',           'Install Maxxair roof fan',                         'Comfort & Climate', 70, 'fitter', false, true, true,  1200.00),
  ('Hiace LWB High Roof', 'Install Maxxair roof fan',                         'Comfort & Climate', 70, 'fitter', false, true, true,  1200.00),
  ('Axiom 30',            'Install Maxxair roof fan',                         'Comfort & Climate', 70, 'fitter', false, true, true,  1200.00),
  ('Axiom 20',            'Install Maxxair roof fan',                         'Comfort & Climate', 70, 'fitter', false, true, true,  1200.00),

  ('Hiace SLWB',          'Install Sirocco fan',                              'Comfort & Climate', 71, 'fitter', false, true, true,  400.00),
  ('Hiace LWB',           'Install Sirocco fan',                              'Comfort & Climate', 71, 'fitter', false, true, true,  400.00),
  ('Hiace LWB High Roof', 'Install Sirocco fan',                              'Comfort & Climate', 71, 'fitter', false, true, true,  400.00),
  ('Axiom 30',            'Install Sirocco fan',                              'Comfort & Climate', 71, 'fitter', false, true, true,  400.00),
  ('Axiom 20',            'Install Sirocco fan',                              'Comfort & Climate', 71, 'fitter', false, true, true,  400.00),

  ('Hiace SLWB',          'Install 10L hot water system',                     'Comfort & Climate', 72, 'fitter', false, true, true,  1500.00),
  ('Hiace LWB',           'Install 10L hot water system',                     'Comfort & Climate', 72, 'fitter', false, true, true,  1500.00),
  ('Hiace LWB High Roof', 'Install 10L hot water system',                     'Comfort & Climate', 72, 'fitter', false, true, true,  1500.00),
  ('Axiom 30',            'Install 10L hot water system',                     'Comfort & Climate', 72, 'fitter', false, true, true,  1500.00),
  ('Axiom 20',            'Install 10L hot water system',                     'Comfort & Climate', 72, 'fitter', false, true, true,  1500.00),

  ('Hiace SLWB',          'Install curtains',                                 'Comfort & Climate', 73, 'fitter', false, true, true,  850.00),
  ('Hiace LWB',           'Install curtains',                                 'Comfort & Climate', 73, 'fitter', false, true, true,  850.00),
  ('Hiace LWB High Roof', 'Install curtains',                                 'Comfort & Climate', 73, 'fitter', false, true, true,  850.00),
  ('Axiom 30',            'Install curtains',                                 'Comfort & Climate', 73, 'fitter', false, true, true,  850.00),
  ('Axiom 20',            'Install curtains',                                 'Comfort & Climate', 73, 'fitter', false, true, true,  850.00),

  ('Hiace SLWB',          'Install 2.5R Earthwool insulation + sound deadening','Comfort & Climate',74,'fitter', false, true, true,  1500.00),
  ('Hiace LWB',           'Install 2.5R Earthwool insulation + sound deadening','Comfort & Climate',74,'fitter', false, true, true,  1500.00),
  ('Hiace LWB High Roof', 'Install 2.5R Earthwool insulation + sound deadening','Comfort & Climate',74,'fitter', false, true, true,  1500.00),
  ('Axiom 30',            'Install 2.5R Earthwool insulation + sound deadening','Comfort & Climate',74,'fitter', false, true, true,  1500.00),
  ('Axiom 20',            'Install 2.5R Earthwool insulation + sound deadening','Comfort & Climate',74,'fitter', false, true, true,  1500.00);

-- KITCHEN & APPLIANCES
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, is_upgrade, photo_required, base_price)
values
  ('Hiace SLWB',          'Upgrade to Dometic induction cooktop',             'Kitchen & Appliances', 80, 'fitter', false, true, true,  500.00),
  ('Hiace LWB',           'Upgrade to Dometic induction cooktop',             'Kitchen & Appliances', 80, 'fitter', false, true, true,  500.00),
  ('Hiace LWB High Roof', 'Upgrade to Dometic induction cooktop',             'Kitchen & Appliances', 80, 'fitter', false, true, true,  500.00),
  ('Axiom 30',            'Upgrade to Dometic induction cooktop',             'Kitchen & Appliances', 80, 'fitter', false, true, true,  500.00),
  ('Axiom 20',            'Upgrade to Dometic induction cooktop',             'Kitchen & Appliances', 80, 'fitter', false, true, true,  500.00),

  ('Hiace SLWB',          'Upgrade to 80L Dometic fridge',                    'Kitchen & Appliances', 81, 'fitter', false, true, true,  480.00),
  ('Hiace LWB',           'Upgrade to 80L Dometic fridge',                    'Kitchen & Appliances', 81, 'fitter', false, true, true,  480.00),
  ('Hiace LWB High Roof', 'Upgrade to 80L Dometic fridge',                    'Kitchen & Appliances', 81, 'fitter', false, true, true,  480.00),
  ('Axiom 30',            'Upgrade to 80L Dometic fridge',                    'Kitchen & Appliances', 81, 'fitter', false, true, true,  480.00),
  ('Axiom 20',            'Upgrade to 80L Dometic fridge',                    'Kitchen & Appliances', 81, 'fitter', false, true, true,  480.00),

  ('Hiace SLWB',          'Install sliding window flyscreen',                 'Kitchen & Appliances', 82, 'fitter', false, true, false, 200.00),
  ('Hiace LWB',           'Install sliding window flyscreen',                 'Kitchen & Appliances', 82, 'fitter', false, true, false, 200.00),
  ('Hiace LWB High Roof', 'Install sliding window flyscreen',                 'Kitchen & Appliances', 82, 'fitter', false, true, false, 200.00),
  ('Axiom 30',            'Install sliding window flyscreen',                 'Kitchen & Appliances', 82, 'fitter', false, true, false, 200.00),
  ('Axiom 20',            'Install sliding window flyscreen',                 'Kitchen & Appliances', 82, 'fitter', false, true, false, 200.00);

-- ELECTRICAL & POWER
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, is_upgrade, photo_required, base_price)
values
  ('Hiace SLWB',          'Upgrade to 300Ah lithium battery',                 'Electrical & Power', 90, 'fitter', false, true, false, 500.00),
  ('Hiace LWB',           'Upgrade to 300Ah lithium battery',                 'Electrical & Power', 90, 'fitter', false, true, false, 500.00),
  ('Hiace LWB High Roof', 'Upgrade to 300Ah lithium battery',                 'Electrical & Power', 90, 'fitter', false, true, false, 500.00),
  ('Axiom 30',            'Upgrade to 200Ah lithium battery',                 'Electrical & Power', 90, 'fitter', false, true, false, 500.00),
  ('Axiom 20',            'Upgrade to 200Ah lithium battery',                 'Electrical & Power', 90, 'fitter', false, true, false, 500.00),

  ('Hiace SLWB',          'Upgrade solar panel to 350W',                      'Electrical & Power', 91, 'fitter', false, true, true,  500.00),
  ('Hiace LWB',           'Upgrade solar panel to 350W',                      'Electrical & Power', 91, 'fitter', false, true, true,  500.00),
  ('Hiace LWB High Roof', 'Upgrade solar panel to 350W',                      'Electrical & Power', 91, 'fitter', false, true, true,  500.00),
  ('Axiom 30',            'Upgrade solar panel to 350W',                      'Electrical & Power', 91, 'fitter', false, true, true,  500.00),
  ('Axiom 20',            'Upgrade solar panel to 350W',                      'Electrical & Power', 91, 'fitter', false, true, true,  500.00),

  ('Hiace SLWB',          'Upgrade inverter to 3000W',                        'Electrical & Power', 92, 'fitter', false, true, false, 280.00),
  ('Hiace LWB',           'Upgrade inverter to 3000W',                        'Electrical & Power', 92, 'fitter', false, true, false, 280.00),
  ('Hiace LWB High Roof', 'Upgrade inverter to 3000W',                        'Electrical & Power', 92, 'fitter', false, true, false, 280.00),
  ('Axiom 30',            'Upgrade inverter to 3000W',                        'Electrical & Power', 92, 'fitter', false, true, false, 280.00),
  ('Axiom 20',            'Upgrade inverter to 3000W',                        'Electrical & Power', 92, 'fitter', false, true, false, 280.00);

-- EXTERIOR & INTERIOR
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, is_upgrade, photo_required, base_price)
values
  ('Hiace SLWB',          'Install 3m awning with roof brackets',              'Exterior & Interior', 100, 'fitter', false, true, true, 1250.00),
  ('Hiace LWB',           'Install 3m awning with roof brackets',              'Exterior & Interior', 100, 'fitter', false, true, true, 1250.00),
  ('Hiace LWB High Roof', 'Install 3m awning with roof brackets',              'Exterior & Interior', 100, 'fitter', false, true, true, 1250.00),
  ('Axiom 30',            'Install 3m awning with roof brackets',              'Exterior & Interior', 100, 'fitter', false, true, true, 1250.00),
  ('Axiom 20',            'Install 3m awning with roof brackets',              'Exterior & Interior', 100, 'fitter', false, true, true, 1250.00),

  ('Hiace SLWB',          'Install 2.5m awning with roof brackets',            'Exterior & Interior', 101, 'fitter', false, true, true, 950.00),
  ('Hiace LWB',           'Install 2.5m awning with roof brackets',            'Exterior & Interior', 101, 'fitter', false, true, true, 950.00),
  ('Hiace LWB High Roof', 'Install 2.5m awning with roof brackets',            'Exterior & Interior', 101, 'fitter', false, true, true, 950.00),
  ('Axiom 30',            'Install 2.5m awning with roof brackets',            'Exterior & Interior', 101, 'fitter', false, true, true, 950.00),
  ('Axiom 20',            'Install 2.5m awning with roof brackets',            'Exterior & Interior', 101, 'fitter', false, true, true, 950.00),

  ('Hiace SLWB',          'Overhead carpentry — driver''s side (Mocca Firwood 5483)', 'Exterior & Interior', 102, 'fitter', false, true, true, 2000.00),
  ('Hiace LWB',           'Overhead carpentry — driver''s side (Mocca Firwood 5483)', 'Exterior & Interior', 102, 'fitter', false, true, true, 2000.00),
  ('Hiace LWB High Roof', 'Overhead carpentry — driver''s side (Mocca Firwood 5483)', 'Exterior & Interior', 102, 'fitter', false, true, true, 2000.00),

  ('Hiace SLWB',          'Panel wrapping — black carpet',                    'Exterior & Interior', 103, 'fitter', false, true, true, 1300.00),
  ('Hiace LWB',           'Panel wrapping — black carpet',                    'Exterior & Interior', 103, 'fitter', false, true, true, 1300.00),
  ('Hiace LWB High Roof', 'Panel wrapping — black carpet',                    'Exterior & Interior', 103, 'fitter', false, true, true, 1300.00),

  ('Hiace SLWB',          'Bench top upgrade (Mocca Firwood 5483)',            'Exterior & Interior', 104, 'fitter', false, true, true, 500.00),
  ('Hiace LWB',           'Bench top upgrade (Mocca Firwood 5483)',            'Exterior & Interior', 104, 'fitter', false, true, true, 500.00),
  ('Hiace LWB High Roof', 'Bench top upgrade (Mocca Firwood 5483)',            'Exterior & Interior', 104, 'fitter', false, true, true, 500.00);

-- CUSTOM LAYOUT
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, is_upgrade, photo_required, base_price)
values
  ('Hiace SLWB',          'Custom design layout — SLWB',                      'Custom Layout', 110, 'fitter', false, true, true, 5000.00),
  ('Hiace LWB High Roof', 'Custom design layout — LWB High Roof',             'Custom Layout', 110, 'fitter', false, true, true, 5000.00);


-- ============================================================
-- VERIFY
-- ============================================================
select
  build_type,
  sum(case when is_upgrade = false then 1 else 0 end) as standard_tasks,
  sum(case when is_upgrade = true  then 1 else 0 end) as upgrade_tasks
from task_templates
group by build_type
order by build_type;
