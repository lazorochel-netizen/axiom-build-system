-- ============================================================
-- Axiom Build System — Task Templates
-- Migration: 002_task_templates.sql
-- Date: 2026-06-01
--
-- Build types:
--   'Hiace SLWB'          Toyota Hiace Super LWB  $19,999
--   'Hiace LWB'           Toyota Hiace LWB         $15,999
--   'Hiace LWB High Roof' Toyota Hiace LWB HiRoof  $17,999
--   'Axiom 30'            Toyota Estima
--   'Axiom 20'            Nissan Elgrand
-- ============================================================


-- ============================================================
-- HELPER: insert template for multiple build types at once
-- ============================================================
create or replace function insert_template(
  p_build_types  text[],
  p_task_name    text,
  p_category     text,
  p_task_order   int,
  p_photo_req    boolean default false
) returns void language plpgsql as $$
declare
  bt text;
begin
  foreach bt in array p_build_types loop
    insert into task_templates
      (build_type, task_name, task_category, task_order, role_required, is_required, photo_required)
    values
      (bt, p_task_name, p_category, p_task_order, 'fitter', true, p_photo_req);
  end loop;
end;
$$;


-- ============================================================
-- CLEAR existing templates (safe to re-run)
-- ============================================================
delete from task_templates;


-- ============================================================
-- SHARED: all 3 Hiace variants share these tasks
-- ============================================================

-- STRUCTURE & MATERIALS
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install aluminium profile framework',      'Structure & Materials', 1,  true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install birch plywood cabinetry',           'Structure & Materials', 2,  true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Lay automotive-grade vinyl flooring',       'Structure & Materials', 3,  true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Build integrated storage',                  'Structure & Materials', 4,  false);

-- WATER & PLUMBING
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install rear outdoor shower',               'Water & Plumbing',      8,  false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install automatic pressure water pump',     'Water & Plumbing',      9,  false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Test water system — no leaks',              'Water & Plumbing',      10, false);

-- SLEEPING & LIVING
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install 8cm custom mattress',               'Sleeping & Living',     13, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install detachable folding table',          'Sleeping & Living',     14, false);

-- KITCHEN & UTILITY
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install pull-out outdoor kitchen',          'Kitchen & Utility',     20, true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Dometic NRX60 fridge/freezer (12V)','Kitchen & Utility',     21, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install 20L microwave',                    'Kitchen & Utility',     22, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install induction cooktop',                 'Kitchen & Utility',     23, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install integrated sink',                   'Kitchen & Utility',     24, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Test kitchen appliances',                   'Kitchen & Utility',     25, false);

-- ELECTRICAL SYSTEM
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Renogy 200Ah lithium battery',      'Electrical System',     30, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Renogy 50A DC-DC + MPPT charger',  'Electrical System',     31, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Renogy 175W roof solar panel',      'Electrical System',     32, true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Renogy 2000W sine wave inverter',   'Electrical System',     33, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Run 6× 240V outlets + full wiring',        'Electrical System',     34, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install 2× 12V outlets',                   'Electrical System',     35, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install USB + Type-C outlet',              'Electrical System',     36, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install Axiom EM Lite control module',     'Electrical System',     37, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Test all electrical circuits',             'Electrical System',     38, false);

-- LIGHTING
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install 6× LED roof lights',               'Lighting',              42, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Install 1× LED bar light',                 'Lighting',              43, false);

-- INTERIOR & LAYOUT
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Complete interior fit-out to standard layout','Interior & Layout',  50, true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Confirm ready-to-camp interior',           'Interior & Layout',     51, true);

-- SIGN-OFF & QC
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Full system test — electrical + water',    'Sign-off & QC',         60, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'QC inspection',                           'Sign-off & QC',         61, true);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Fitter sign-off',                         'Sign-off & QC',         62, false);
select insert_template(array['Hiace SLWB','Hiace LWB','Hiace LWB High Roof'], 'Customer handover + demonstration',        'Sign-off & QC',         63, false);


-- ============================================================
-- SLWB-SPECIFIC tasks (differ from LWB)
-- ============================================================
insert into task_templates (build_type, task_name, task_category, task_order, role_required, is_required, photo_required)
values
  ('Hiace SLWB', 'Install portable fresh & grey water tank',   'Water & Plumbing', 6, 'fitter', true, false),
  ('Hiace SLWB', 'Install pull-out double bed',                'Sleeping & Living', 12, 'fitter', true, true);


-- ============================================================
-- LWB & LWB HIGH ROOF-SPECIFIC tasks
-- ============================================================
select insert_template(array['Hiace LWB','Hiace LWB High Roof'], 'Install custom S/S tank with digital level gauges', 'Water & Plumbing', 6, false);
select insert_template(array['Hiace LWB','Hiace LWB High Roof'], 'Install pull-out double bed / folding double bed',  'Sleeping & Living', 12, true);


-- ============================================================
-- AXIOM 30 (Toyota Estima) + AXIOM 20 (Nissan Elgrand)
-- Same spec based on current documentation.
-- Update Axiom 20 tasks here once confirmed different.
-- ============================================================

-- STRUCTURE & MATERIALS
select insert_template(array['Axiom 30','Axiom 20'], 'Install aluminium profile framework',             'Structure & Materials', 1,  true);
select insert_template(array['Axiom 30','Axiom 20'], 'Install birch plywood cabinetry',                'Structure & Materials', 2,  true);
select insert_template(array['Axiom 30','Axiom 20'], 'Lay automotive-grade vinyl flooring',            'Structure & Materials', 3,  true);
select insert_template(array['Axiom 30','Axiom 20'], 'Build integrated storage',                       'Structure & Materials', 4,  false);

-- WATER & PLUMBING
select insert_template(array['Axiom 30','Axiom 20'], 'Install fixed S/S fresh & grey water tank with digital level gauges', 'Water & Plumbing', 6, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install outdoor shower',                         'Water & Plumbing',      8,  false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install automatic pressure water pump',          'Water & Plumbing',      9,  false);
select insert_template(array['Axiom 30','Axiom 20'], 'Test water system — no leaks',                   'Water & Plumbing',      10, false);

-- SLEEPING & LIVING
select insert_template(array['Axiom 30','Axiom 20'], 'Install folded double bed',                      'Sleeping & Living',     12, true);
select insert_template(array['Axiom 30','Axiom 20'], 'Install 8cm custom mattress',                    'Sleeping & Living',     13, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install detachable folding table',               'Sleeping & Living',     14, false);

-- KITCHEN & UTILITY
select insert_template(array['Axiom 30','Axiom 20'], 'Install 20L compressor fridge/freezer (12V)',   'Kitchen & Utility',     21, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install 20L microwave',                         'Kitchen & Utility',     22, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install induction cooktop',                      'Kitchen & Utility',     23, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install integrated sink',                        'Kitchen & Utility',     24, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Test kitchen appliances',                        'Kitchen & Utility',     25, false);

-- ELECTRICAL SYSTEM
select insert_template(array['Axiom 30','Axiom 20'], 'Install Renogy 100Ah lithium battery',          'Electrical System',     30, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install Renogy 30A DC-DC charger with MPPT',   'Electrical System',     31, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install Renogy 100W roof solar panel',          'Electrical System',     32, true);
select insert_template(array['Axiom 30','Axiom 20'], 'Install Renogy 2000W pure sine wave inverter',  'Electrical System',     33, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Run 6× 240V outlets + full wiring',            'Electrical System',     34, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install 2× 12V outlets',                       'Electrical System',     35, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install USB + Type-C outlet',                  'Electrical System',     36, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install Axiom EM Lite control module',         'Electrical System',     37, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Test all electrical circuits',                  'Electrical System',     38, false);

-- LIGHTING
select insert_template(array['Axiom 30','Axiom 20'], 'Install 4× LED roof lights',                   'Lighting',              42, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Install 1× LED bar light',                     'Lighting',              43, false);

-- INTERIOR & LAYOUT
select insert_template(array['Axiom 30','Axiom 20'], 'Complete interior fit-out to standard layout',  'Interior & Layout',     50, true);
select insert_template(array['Axiom 30','Axiom 20'], 'Confirm ready-to-camp interior',               'Interior & Layout',     51, true);

-- SIGN-OFF & QC
select insert_template(array['Axiom 30','Axiom 20'], 'Full system test — electrical + water',        'Sign-off & QC',         60, false);
select insert_template(array['Axiom 30','Axiom 20'], 'QC inspection',                               'Sign-off & QC',         61, true);
select insert_template(array['Axiom 30','Axiom 20'], 'Fitter sign-off',                             'Sign-off & QC',         62, false);
select insert_template(array['Axiom 30','Axiom 20'], 'Customer handover + demonstration',            'Sign-off & QC',         63, false);


-- ============================================================
-- CLEAN UP helper function (not needed after migration)
-- ============================================================
drop function if exists insert_template(text[], text, text, int, boolean);


-- ============================================================
-- VERIFY
-- ============================================================
select build_type, count(*) as task_count
from task_templates
group by build_type
order by build_type;
