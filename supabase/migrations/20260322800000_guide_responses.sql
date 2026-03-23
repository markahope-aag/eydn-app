-- Guided questionnaire responses (guest list, colors, florist, rentals, etc.)
CREATE TABLE public.guide_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  guide_slug TEXT NOT NULL,
  section_index INT NOT NULL DEFAULT 0,
  responses JSONB NOT NULL DEFAULT '{}',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  vendor_brief JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wedding_id, guide_slug)
);

CREATE INDEX idx_guide_responses_wedding ON public.guide_responses(wedding_id);
CREATE INDEX idx_guide_responses_slug ON public.guide_responses(wedding_id, guide_slug);

ALTER TABLE public.guide_responses ENABLE ROW LEVEL SECURITY;
