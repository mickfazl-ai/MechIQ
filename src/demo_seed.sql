-- ─── MechIQ Demo Seed ────────────────────────────────────────────────────────
-- Run this in Supabase SQL Editor
-- Creates a demo company with realistic sample data

-- 1. Create demo company
INSERT INTO companies (id, name, plan, status, asset_limit, features, abn, phone, address, city, state, postcode, country)
VALUES (
  'demo-company-0000-0000-000000000001',
  'Coastline Civil Demo',
  'pro',
  'active',
  100,
  '{"dashboard":true,"assets":true,"maintenance":true,"prestart":true,"reports":true,"oil_sampling":true,"scanner":true,"cost_analysis":false}',
  '12 345 678 901',
  '1300 000 000',
  '1 Demo Street',
  'Sydney',
  'NSW',
  '2000',
  'Australia'
) ON CONFLICT (id) DO NOTHING;

-- 2. Create demo user role (password set via Auth separately)
INSERT INTO user_roles (email, name, role, company_id)
VALUES ('demo@mechiq.com.au', 'Demo User', 'admin', 'demo-company-0000-0000-000000000001')
ON CONFLICT (email) DO UPDATE SET
  name = 'Demo User',
  role = 'admin',
  company_id = 'demo-company-0000-0000-000000000001';

-- 3. Assets
INSERT INTO assets (id, company_id, name, asset_number, type, make, model, status, year, current_hours, next_service_hours, purchase_price, purchase_date, location, colour)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'demo-company-0000-0000-000000000001', 'CAT 320 Excavator', 'HX-001', 'Excavator', 'Caterpillar', '320GC', 'Running', 2021, 4820, 5000, 385000, '2021-03-15', 'Site A - North', 'Yellow'),
  ('a1000000-0000-0000-0000-000000000002', 'demo-company-0000-0000-000000000001', 'Komatsu D65 Dozer', 'HX-002', 'Dozer', 'Komatsu', 'D65PX-18', 'Maintenance', 2020, 6100, 6000, 520000, '2020-06-20', 'Workshop', 'Yellow'),
  ('a1000000-0000-0000-0000-000000000003', 'demo-company-0000-0000-000000000001', 'Volvo A40G Truck', 'HX-003', 'Dump Truck', 'Volvo', 'A40G', 'Running', 2022, 2300, 2500, 690000, '2022-01-10', 'Site A - South', 'White'),
  ('a1000000-0000-0000-0000-000000000004', 'demo-company-0000-0000-000000000001', 'Hitachi ZX350 Excavator', 'HX-004', 'Excavator', 'Hitachi', 'ZX350LC-6', 'Running', 2019, 8750, 9000, 450000, '2019-09-05', 'Site B', 'Orange'),
  ('a1000000-0000-0000-0000-000000000005', 'demo-company-0000-0000-000000000001', 'Toyota Hilux SR5', 'HX-005', 'Ute', 'Toyota', 'Hilux SR5', 'Running', 2023, 45000, 50000, 65000, '2023-02-28', 'Site A', 'White'),
  ('a1000000-0000-0000-0000-000000000006', 'demo-company-0000-0000-000000000001', 'Liebherr LTM 1050', 'HX-006', 'Crane', 'Liebherr', 'LTM 1050-3.1', 'Down', 2018, 3200, 3500, 980000, '2018-11-12', 'Depot', 'Yellow'),
  ('a1000000-0000-0000-0000-000000000007', 'demo-company-0000-0000-000000000001', 'Dynapac CA2500D Roller', 'HX-007', 'Roller', 'Dynapac', 'CA2500D', 'Running', 2021, 1850, 2000, 145000, '2021-07-19', 'Site B', 'Red'),
  ('a1000000-0000-0000-0000-000000000008', 'demo-company-0000-0000-000000000001', 'Bobcat S650 Skid Steer', 'HX-008', 'Skid Steer', 'Bobcat', 'S650', 'Running', 2022, 980, 1000, 95000, '2022-04-14', 'Site A', 'Orange')
ON CONFLICT (id) DO NOTHING;

-- 4. Maintenance records
INSERT INTO maintenance (company_id, asset_name, service_type, next_service_date, status, assigned_to, notes)
VALUES
  ('demo-company-0000-0000-000000000001', 'CAT 320 Excavator', '1000hr Service', CURRENT_DATE + 12, 'Upcoming', 'John Smith', 'Change hydraulic filter and oil'),
  ('demo-company-0000-0000-000000000001', 'Komatsu D65 Dozer', '500hr Service', CURRENT_DATE - 3, 'Overdue', 'Mike Johnson', 'Track tension check, undercarriage inspection'),
  ('demo-company-0000-0000-000000000001', 'Volvo A40G Truck', 'Tyre Rotation', CURRENT_DATE, 'Due Soon', 'Sarah Williams', 'All 6 tyres, check pressures'),
  ('demo-company-0000-0000-000000000001', 'Hitachi ZX350 Excavator', '2000hr Major Service', CURRENT_DATE - 8, 'Overdue', 'John Smith', 'Full engine service, filter changes'),
  ('demo-company-0000-0000-000000000001', 'Toyota Hilux SR5', 'Oil & Filter Change', CURRENT_DATE + 5, 'Upcoming', 'Demo User', '10W-40 fully synthetic'),
  ('demo-company-0000-0000-000000000001', 'Liebherr LTM 1050', 'Annual Crane Inspection', CURRENT_DATE + 30, 'Upcoming', 'External - CraneSafe', 'Statutory annual inspection'),
  ('demo-company-0000-0000-000000000001', 'Dynapac CA2500D Roller', 'Vibration System Check', CURRENT_DATE + 21, 'Upcoming', 'Mike Johnson', 'Check eccentric bearing, amplitude'),
  ('demo-company-0000-0000-000000000001', 'Bobcat S650 Skid Steer', '250hr Service', CURRENT_DATE + 2, 'Due Soon', 'Sarah Williams', 'Air filter, engine oil')
ON CONFLICT DO NOTHING;

-- 5. Work orders
INSERT INTO work_orders (company_id, title, defect_description, asset_name, priority, status, assigned_to, due_date)
VALUES
  ('demo-company-0000-0000-000000000001', 'Crane hydraulic leak repair', 'Oil leak detected on boom cylinder seal. Machine out of service.', 'Liebherr LTM 1050', 'Critical', 'Open', 'John Smith', CURRENT_DATE + 2),
  ('demo-company-0000-0000-000000000001', 'Dozer track adjustment', 'Left track tension too loose, sagging visible', 'Komatsu D65 Dozer', 'High', 'In Progress', 'Mike Johnson', CURRENT_DATE + 1),
  ('demo-company-0000-0000-000000000001', 'Excavator bucket teeth replacement', '3 teeth worn beyond limit, bucket efficiency reduced', 'CAT 320 Excavator', 'Medium', 'Open', 'Sarah Williams', CURRENT_DATE + 5),
  ('demo-company-0000-0000-000000000001', 'Hilux AC not cooling', 'Air conditioning blowing warm air only', 'Toyota Hilux SR5', 'Low', 'Open', 'Demo User', CURRENT_DATE + 7),
  ('demo-company-0000-0000-000000000001', 'Hitachi swing bearing grease', 'Swing bearing showing signs of wear, grease interval overdue', 'Hitachi ZX350 Excavator', 'High', 'Open', 'John Smith', CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 6. Downtime records
INSERT INTO downtime (company_id, asset, date, start_time, end_time, hours, category, description, reported_by, source)
VALUES
  ('demo-company-0000-0000-000000000001', 'Liebherr LTM 1050', CURRENT_DATE - 1, '07:30', '17:00', 9.5, 'Mechanical', 'Hydraulic cylinder seal failure on main boom. Parts on order.', 'John Smith', 'quick_log'),
  ('demo-company-0000-0000-000000000001', 'Komatsu D65 Dozer', CURRENT_DATE - 2, '10:00', '14:30', 4.5, 'Mechanical', 'Track came off, required re-tracking. Operator error.', 'Mike Johnson', 'manual'),
  ('demo-company-0000-0000-000000000001', 'CAT 320 Excavator', CURRENT_DATE - 5, '08:00', '09:30', 1.5, 'Electrical', 'Starter motor fault. Replaced on site.', 'Sarah Williams', 'manual'),
  ('demo-company-0000-0000-000000000001', 'Volvo A40G Truck', CURRENT_DATE - 7, '13:00', '16:00', 3.0, 'Environmental', 'Tyre puncture from site debris. Tyre replaced.', 'Demo User', 'manual'),
  ('demo-company-0000-0000-000000000001', 'Hitachi ZX350 Excavator', CURRENT_DATE - 10, '07:00', '11:00', 4.0, 'Scheduled', 'Scheduled 2000hr service delayed from previous week.', 'John Smith', 'manual')
ON CONFLICT DO NOTHING;

-- 7. Parts inventory
INSERT INTO parts (company_id, name, part_number, category, supplier, supplier_contact, unit_cost, quantity, min_quantity, unit, location)
VALUES
  ('demo-company-0000-0000-000000000001', 'CAT Hydraulic Filter', 'CAT-HF-320', 'Filters', 'Hastings Deering', '1300 428 462', 85.00, 8, 5, 'ea', 'Shelf A1'),
  ('demo-company-0000-0000-000000000001', 'Engine Oil 15W-40 20L', 'OIL-15W40-20', 'Lubricants', 'Castrol Industrial', '1800 335 478', 145.00, 3, 6, 'ea', 'Drum Store'),
  ('demo-company-0000-0000-000000000001', 'Komatsu Track Link', 'KOM-TL-D65', 'Undercarriage', 'Komatsu Australia', '132 566', 320.00, 12, 10, 'ea', 'Yard B'),
  ('demo-company-0000-0000-000000000001', 'CAT Bucket Tooth', 'CAT-BT-320', 'Ground Engaging', 'Hastings Deering', '1300 428 462', 95.00, 2, 8, 'ea', 'Shelf B2'),
  ('demo-company-0000-0000-000000000001', 'Hydraulic Hose 1/2"', 'HYD-HOSE-12', 'Hydraulics', 'Hydraulink', '02 9748 2900', 28.50, 15, 10, 'm', 'Hose Rack'),
  ('demo-company-0000-0000-000000000001', 'Air Filter - Heavy Duty', 'AF-HD-001', 'Filters', 'Donaldson', '1800 366 466', 120.00, 6, 4, 'ea', 'Shelf A2'),
  ('demo-company-0000-0000-000000000001', 'Grease Cartridge EP2', 'GRS-EP2-400', 'Lubricants', 'Castrol Industrial', '1800 335 478', 18.00, 0, 20, 'ea', 'Lube Store'),
  ('demo-company-0000-0000-000000000001', 'Volvo Brake Pad Set', 'VOL-BP-A40', 'Brakes', 'CJD Equipment', '08 9277 6800', 380.00, 2, 2, 'set', 'Shelf C1')
ON CONFLICT DO NOTHING;

-- Done!
-- Now create the demo auth user in Supabase Auth:
-- Authentication → Users → Add User
-- Email: demo@mechiq.com.au
-- Password: MechIQ2024!
-- Then verify the user_roles row above links correctly.
