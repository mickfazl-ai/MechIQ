-- First get the asset IDs for demo company
-- Run this to find them:
-- select id, name from assets where company_id = 'de000000-0000-0000-0000-000000000001';

-- Oil samples for demo assets (using asset_name match since we don't have IDs)
-- We'll use a subquery to get asset IDs

INSERT INTO oil_samples (company_id, asset_name, asset_id, component, sample_date, hours_on_oil, iron, copper, aluminium, silicon, sodium, lead, tin, viscosity, water, notes)
SELECT 
  'de000000-0000-0000-0000-000000000001',
  'CAT 320 Excavator',
  a.id,
  'Engine',
  CURRENT_DATE - 30,
  250, 45, 12, 8, 15, 5, 8, 3, 105, 0.05,
  'Routine sample - 250hr interval'
FROM assets a WHERE a.name = 'CAT 320 Excavator' AND a.company_id = 'de000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO oil_samples (company_id, asset_name, asset_id, component, sample_date, hours_on_oil, iron, copper, aluminium, silicon, sodium, lead, tin, viscosity, water, notes)
SELECT 
  'de000000-0000-0000-0000-000000000001',
  'CAT 320 Excavator',
  a.id,
  'Hydraulic System',
  CURRENT_DATE - 15,
  500, 18, 8, 12, 28, 3, 4, 2, 46, 0.02,
  'Silicon slightly elevated - check air filter sealing'
FROM assets a WHERE a.name = 'CAT 320 Excavator' AND a.company_id = 'de000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO oil_samples (company_id, asset_name, asset_id, component, sample_date, hours_on_oil, iron, copper, aluminium, silicon, sodium, lead, tin, viscosity, water, notes)
SELECT 
  'de000000-0000-0000-0000-000000000001',
  'Komatsu D65 Dozer',
  a.id,
  'Engine',
  CURRENT_DATE - 45,
  500, 185, 35, 22, 18, 8, 15, 7, 98, 0.08,
  'Iron and copper elevated - monitor closely, may indicate bearing wear'
FROM assets a WHERE a.name = 'Komatsu D65 Dozer' AND a.company_id = 'de000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO oil_samples (company_id, asset_name, asset_id, component, sample_date, hours_on_oil, iron, copper, aluminium, silicon, sodium, lead, tin, viscosity, water, notes)
SELECT 
  'de000000-0000-0000-0000-000000000001',
  'Komatsu D65 Dozer',
  a.id,
  'Final Drive',
  CURRENT_DATE - 20,
  1000, 220, 45, 18, 12, 6, 28, 12, 85, 0.12,
  'CRITICAL - High iron and lead, water contamination detected. Remove from service.'
FROM assets a WHERE a.name = 'Komatsu D65 Dozer' AND a.company_id = 'de000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

INSERT INTO oil_samples (company_id, asset_name, asset_id, component, sample_date, hours_on_oil, iron, copper, aluminium, silicon, sodium, lead, tin, viscosity, water, notes)
SELECT 
  'de000000-0000-0000-0000-000000000001',
  'Hitachi ZX350 Excavator',
  a.id,
  'Engine',
  CURRENT_DATE - 60,
  500, 55, 18, 14, 22, 4, 10, 5, 102, 0.03,
  'Silicon slightly elevated, check air filter'
FROM assets a WHERE a.name = 'Hitachi ZX350 Excavator' AND a.company_id = 'de000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;
