-- MechIQ: Add prediction columns to service_schedules
-- Run this once in Supabase SQL editor before deploying

ALTER TABLE service_schedules
  ADD COLUMN IF NOT EXISTS predicted_date       date,
  ADD COLUMN IF NOT EXISTS predicted_daily_rate numeric(8,2),
  ADD COLUMN IF NOT EXISTS predicted_at         timestamptz;

-- Index for fast next-predicted queries used by Dashboard and Calendar
CREATE INDEX IF NOT EXISTS idx_service_schedules_predicted_date
  ON service_schedules (company_id, predicted_date)
  WHERE predicted_date IS NOT NULL;

COMMENT ON COLUMN service_schedules.predicted_date       IS 'AI-predicted due date from /predict/service, updated on asset page load';
COMMENT ON COLUMN service_schedules.predicted_daily_rate IS 'Calculated daily usage rate (hrs/day) used for prediction';
COMMENT ON COLUMN service_schedules.predicted_at         IS 'Timestamp of last prediction run';
