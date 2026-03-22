-- Structured vendor detail fields for day-of planning
ALTER TABLE public.vendors
  ADD COLUMN arrival_time TEXT,
  ADD COLUMN meal_needed BOOLEAN DEFAULT false,
  ADD COLUMN insurance_submitted BOOLEAN DEFAULT false;
