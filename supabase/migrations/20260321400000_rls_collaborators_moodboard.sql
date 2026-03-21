-- Enable RLS on wedding_collaborators
ALTER TABLE public.wedding_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to wedding_collaborators"
  ON public.wedding_collaborators
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on mood_board_items
ALTER TABLE public.mood_board_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to mood_board_items"
  ON public.mood_board_items
  FOR ALL
  USING (true)
  WITH CHECK (true);
