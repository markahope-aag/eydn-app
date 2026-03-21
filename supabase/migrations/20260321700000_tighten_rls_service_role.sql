-- Replace overly permissive "USING (true) WITH CHECK (true)" policies
-- with proper denials for anonymous/authenticated roles.
-- The service role key bypasses RLS entirely, so these tables
-- remain fully accessible to our API routes.

-- activity_log: no direct access via PostgREST
DROP POLICY "Service role full access to activity_log" ON public.activity_log;

CREATE POLICY "Deny anonymous reads on activity_log"
  ON public.activity_log FOR SELECT
  USING (false);

CREATE POLICY "Deny anonymous writes on activity_log"
  ON public.activity_log FOR INSERT
  WITH CHECK (false);

-- mood_board_items: no direct access via PostgREST
DROP POLICY "Service role full access to mood_board_items" ON public.mood_board_items;

CREATE POLICY "Deny anonymous reads on mood_board_items"
  ON public.mood_board_items FOR SELECT
  USING (false);

CREATE POLICY "Deny anonymous writes on mood_board_items"
  ON public.mood_board_items FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny anonymous updates on mood_board_items"
  ON public.mood_board_items FOR UPDATE
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny anonymous deletes on mood_board_items"
  ON public.mood_board_items FOR DELETE
  USING (false);

-- wedding_collaborators: no direct access via PostgREST
DROP POLICY "Service role full access to wedding_collaborators" ON public.wedding_collaborators;

CREATE POLICY "Deny anonymous reads on wedding_collaborators"
  ON public.wedding_collaborators FOR SELECT
  USING (false);

CREATE POLICY "Deny anonymous writes on wedding_collaborators"
  ON public.wedding_collaborators FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Deny anonymous updates on wedding_collaborators"
  ON public.wedding_collaborators FOR UPDATE
  USING (false) WITH CHECK (false);

CREATE POLICY "Deny anonymous deletes on wedding_collaborators"
  ON public.wedding_collaborators FOR DELETE
  USING (false);
