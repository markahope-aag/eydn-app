-- Fix Supabase linter warning: replace overly permissive ALL policy
-- with specific SELECT (public read) + deny writes (service role only)

DROP POLICY IF EXISTS "Service role full access to blog_posts" ON public.blog_posts;

-- Public can read published posts
CREATE POLICY "Anyone can read published blog posts"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Block all direct writes (admin writes via service role which bypasses RLS)
CREATE POLICY "No direct inserts to blog_posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct updates to blog_posts"
  ON public.blog_posts FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "No direct deletes to blog_posts"
  ON public.blog_posts FOR DELETE
  USING (false);
