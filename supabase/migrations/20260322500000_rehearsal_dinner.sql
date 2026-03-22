CREATE TABLE public.rehearsal_dinner (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE UNIQUE,
  venue TEXT,
  date TEXT,
  time TEXT,
  address TEXT,
  notes TEXT,
  timeline JSONB DEFAULT '[]',
  guest_list JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rehearsal_dinner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Deny direct access" ON public.rehearsal_dinner FOR SELECT USING (false);
CREATE POLICY "Deny direct writes" ON public.rehearsal_dinner FOR INSERT WITH CHECK (false);
