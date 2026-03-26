-- Full-text search index for suggested_vendors
-- Enables fast search across name, city, state, and description
-- at scale (100K+ rows). Uses GIN index on tsvector.

-- Add a generated tsvector column for full-text search
ALTER TABLE public.suggested_vendors
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(city, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(state, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) STORED;

-- GIN index on the search vector for fast lookups
CREATE INDEX IF NOT EXISTS idx_suggested_vendors_search
  ON public.suggested_vendors USING GIN(search_vector);

-- Also add a trigram index for ILIKE fallback (handles partial matches like "Aust" → "Austin")
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_suggested_vendors_name_trgm
  ON public.suggested_vendors USING GIN(name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_suggested_vendors_city_trgm
  ON public.suggested_vendors USING GIN(city gin_trgm_ops);
