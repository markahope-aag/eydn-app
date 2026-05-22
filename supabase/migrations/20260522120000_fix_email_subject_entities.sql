-- Email subject lines are plain text in inboxes, so HTML entities such
-- as &mdash; and &rsquo; render literally instead of as — and ’.
-- The email seed migrations stored entities in subject lines; this
-- replaces them with the actual characters. Email bodies are HTML and
-- are intentionally left untouched.
update public.email_templates
set subject =
  replace(
  replace(
  replace(
  replace(
  replace(subject,
    '&mdash;', '—'),
    '&rsquo;', '’'),
    '&ndash;', '–'),
    '&hellip;', '…'),
    '&amp;', '&')
where subject like '%&%;%';
