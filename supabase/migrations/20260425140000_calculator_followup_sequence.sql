-- Calculator follow-up nurture: 3 emails between Email 1 (immediate breakdown,
-- sent inline by /api/tools/calculator-save) and Day 10 of the trial sequence.
-- Closes a 10-day silence gap for calculator leads who never sign in after
-- their magic link expires. Anchored to calculator_saves.created_at, driven by
-- the trial-emails cron on the new `calculator_completed` trigger.

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('calc_d1_account_waiting', 'nurture',
   'Day 1 after calculator: account is waiting, pick up where you left off.',
   'Your Eydn account is waiting',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Yesterday you ran the numbers on a {{budgetFormatted}} wedding for {{guests}} guests in {{state}}. We saved everything &mdash; budget, line-item breakdown, the works.</p>' ||
   '<p>An Eydn account is already set up for you. Sign in and your dashboard loads with that budget pre-loaded across all 10 categories. From there you can start tracking real vendor quotes against the estimates and see where you''re trending over or under.</p>' ||
   '<p>If your magic link from yesterday expired, just sign in normally with the email you used &mdash; we''ll recognize you.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/sign-in" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Sign in to Eydn</a></p>' ||
   '<p style="color: #5A5A5A; font-size: 13px; text-align: center; margin-top: 16px;">Questions about anything? Reply to this email &mdash; a real person reads every one.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'budgetFormatted', 'guests', 'state', 'appUrl']),

  ('calc_d3_venue_surprises', 'nurture',
   'Day 3 after calculator: vendor itemization tip + soft Pro mention.',
   'Most couples in {{state}} miss this on the venue contract',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Quick thing that''ll save you real money on your venue contract.</p>' ||
   '<p>Whatever number the venue quotes, ask for an itemized breakdown before you sign. Package pricing hides where the margin is. Once you see line items, three categories are almost always more flexible than the venue lets on:</p>' ||
   '<ul style="padding-left: 20px;">' ||
     '<li><strong>Setup and breakdown fees</strong> &mdash; often $500&ndash;$1,500, frequently negotiable or waivable in shoulder seasons.</li>' ||
     '<li><strong>Overtime rates</strong> &mdash; the cost of running 30 minutes past contract is usually pure profit. Ask what it costs and whether they''ll cap it.</li>' ||
     '<li><strong>Service charges</strong> &mdash; the 18&ndash;22% line that gets added at the end. Ask exactly what it covers; sometimes it''s gratuity, sometimes it''s admin overhead, sometimes both.</li>' ||
   '</ul>' ||
   '<p>For a {{budgetFormatted}} wedding, this conversation alone tends to recover $1,500&ndash;$3,000.</p>' ||
   '<p>When you''re ready to actually book vendors, Eydn Pro has 25+ vendor email templates &mdash; including one specifically for requesting itemized quotes. One payment ($79), covers your whole wedding.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/sign-in" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">See your dashboard</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'state', 'budgetFormatted', 'appUrl']),

  ('calc_d7_couples_like_you', 'nurture',
   'Day 7 after calculator: social proof for guest count + dashboard CTA.',
   'What couples planning {{guests}}-guest weddings tend to get wrong',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>A week since you ran your numbers. A few things couples planning weddings around your size ({{guests}} guests) consistently underestimate:</p>' ||
   '<p><strong>The 10% guest count drift.</strong> The number that feels right at engagement almost always grows once families weigh in. If you started with {{guests}}, plan as if it could land at 10% higher. Every addition has cost ripple &mdash; venue, catering per head, invitations, favors. Set a hard ceiling now and hold it.</p>' ||
   '<p><strong>The deposit cluster around month 6.</strong> Most vendors take 25&ndash;50% upfront. The due dates cluster together in a way nobody warns you about. For a {{guests}}-guest wedding, you''re typically writing $8K&ndash;$15K in deposits within a 4-week window. Map them out before they sneak up on you.</p>' ||
   '<p><strong>The post-wedding cleanup.</strong> Couples forget to budget for the day-after stuff: cleanup crew, late-night transport, vendor breakdown overtime. Usually $300&ndash;$800 total, but it''s real money that hits at the worst possible moment.</p>' ||
   '<p>Your Eydn dashboard tracks all of this against the estimates you started with &mdash; so you see drift the moment it happens, not three months later.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Open my dashboard</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'guests', 'appUrl']);

INSERT INTO public.email_sequences (slug, description, trigger_event, audience_filter) VALUES
  ('calculator_followup',
   'Three nurture emails between calculator submit and trial day 10. Closes the silence gap for calculator leads who never sign in.',
   'calculator_completed',
   '{}'::jsonb);

INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days) VALUES
  ('calculator_followup', 1, 'calc_d1_account_waiting',  1),
  ('calculator_followup', 2, 'calc_d3_venue_surprises',  3),
  ('calculator_followup', 3, 'calc_d7_couples_like_you', 7);

-- Backfill protection: every existing calculator_saves email gets a no-op
-- send_log row for every step in calculator_followup, so the first cron run
-- after deploy doesn't blast 1+3+7 day historical emails to leads who saved
-- their calculator state weeks or months ago. Resolves user_id by joining
-- weddings.user_id via the calculator_saves.email — handoff sets these in
-- lock-step, so any historical save with a corresponding wedding gets matched.
INSERT INTO public.sequence_send_log
  (sequence_slug, step_order, user_id, wedding_id, recipient_email, sent_at)
SELECT
  'calculator_followup',
  step.step_order,
  w.user_id,
  w.id,
  cs.email,
  now()
FROM public.calculator_saves cs
JOIN public.weddings w
  -- A wedding's "owner email" lives in Clerk, but every calculator handoff
  -- writes a wedding for the same user.id pair. We match on the (likely-most-
  -- recent) wedding for the user_id derived from any wedding sharing the
  -- email address — captured here by the time-window proximity rather than
  -- by an email column on weddings (which doesn't exist).
  -- Practical match: for each calculator save, pick a wedding created within
  -- 1 hour of the save (the handoff writes both nearly simultaneously).
  ON w.created_at BETWEEN cs.created_at - interval '1 hour'
                       AND cs.created_at + interval '1 hour'
CROSS JOIN public.email_sequence_steps step
WHERE step.sequence_slug = 'calculator_followup'
  AND w.user_id IS NOT NULL
ON CONFLICT (sequence_slug, step_order, user_id) DO NOTHING;
