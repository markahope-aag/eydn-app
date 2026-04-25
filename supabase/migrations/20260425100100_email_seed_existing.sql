-- Seed the existing trial + lifecycle email templates into the new
-- email_templates / email_sequences tables so the generic runner can replace
-- the hand-written switch in src/lib/email.ts and src/lib/email-trial.ts.
--
-- Body HTML is template-literal-converted from the source files: each `${var}`
-- becomes `{{var}}`, the `wrap()` chrome is dropped (the runner re-applies it),
-- and inline styles are aligned to the canonical website tokens (--soft-violet
-- gold #8B7A30 instead of blush #D4A5A5 for the gradient; --muted-plum #5A5A5A
-- instead of #6B6B6B for muted text).

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('trial_day_10_save_card', 'transactional', 'Day 10 of trial: ask user to save a card before auto-downgrade.',
   '4 days left on your Eydn trial',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hi {{firstName}},</h2>' ||
   '<p>You&rsquo;re four days into the second half of your Eydn trial. On {{endsOn}}, Pro features drop back to the free tier unless you&rsquo;ve picked a plan.</p>' ||
   '<p>The simplest thing is to save a card now. We won&rsquo;t charge anything today &mdash; the first $14.99 lands only when your trial ends, and you can cancel before then.</p>' ||
   '<p>If you&rsquo;d rather pay once and be done, Lifetime is $79.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Save a card</a></p>' ||
   '<p style="color: #5A5A5A; font-size: 13px; text-align: center; margin-top: 20px;">Your wedding data stays put either way. Only the Pro features (Ask Eydn, PDF exports, attachments, templates) go away.</p>' ||
   '<p style="color: #5A5A5A; font-size: 12px; text-align: center; margin-top: 12px;">Wondering why we charge at all? <a href="{{appUrl}}/why-we-charge-for-pro" style="color: #2C3E2D;">Here&rsquo;s the short answer</a> &middot; <a href="{{appUrl}}/pledge" style="color: #2C3E2D;">The Eydn Pledge</a></p>',
   ARRAY['firstName', 'endsOn', 'appUrl']),

  ('trial_day_14_renews_today', 'transactional', 'Day 14 of trial: card on file will be charged today.',
   'Eydn Pro renews today',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hi {{firstName}},</h2>' ||
   '<p>{{cardDescription}} will be charged <strong>$14.99</strong> today for your first month of Eydn Pro. Nothing to do &mdash; Pro keeps running.</p>' ||
   '<p>If you&rsquo;ve changed your mind, you can cancel before the charge processes.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Manage billing</a></p>',
   ARRAY['firstName', 'cardDescription', 'appUrl']),

  ('trial_day_14_downgraded', 'transactional', 'Day 14 of trial: trial ended without a card; explain plans.',
   'Your Eydn trial ended',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hi {{firstName}},</h2>' ||
   '<p>Your 14-day trial ended today. Your plans, tasks, guests, and everything you built are still there &mdash; that doesn&rsquo;t go anywhere.</p>' ||
   '<p>What changes: Ask Eydn, PDF exports, file attachments, and email templates stop working until you pick a plan.</p>' ||
   '<p>Two options:</p>' ||
   '<ul style="padding-left: 20px;"><li><strong>$14.99 / month.</strong> Cancel any time.</li><li><strong>$79 once.</strong> Lifetime access, no renewals.</li></ul>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/pricing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">See plans</a></p>' ||
   '<p style="color: #5A5A5A; font-size: 13px; text-align: center; margin-top: 20px;">No pressure &mdash; your data is safe either way.</p>' ||
   '<p style="color: #5A5A5A; font-size: 12px; text-align: center; margin-top: 12px;"><a href="{{appUrl}}/why-we-charge-for-pro" style="color: #2C3E2D;">Why we charge for Pro</a> &middot; <a href="{{appUrl}}/what-free-costs" style="color: #2C3E2D;">What &ldquo;free&rdquo; really costs you</a> &middot; <a href="{{appUrl}}/pledge" style="color: #2C3E2D;">The Pledge</a></p>',
   ARRAY['firstName', 'appUrl']);

-- Lifecycle templates (post-wedding archival flow). Categories are split per
-- CAN-SPAM: account-state notifications stay 'lifecycle' (no unsub footer
-- required); upsell emails are 'marketing' (footer carries unsubscribe).

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('lifecycle_post_wedding_welcome', 'lifecycle', 'Sent on the wedding date.',
   'Congratulations, {{partnerNames}}!',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Congratulations!</h2>' ||
   '<p>Your wedding day has arrived (or just passed) &mdash; we hope it was everything you dreamed of.</p>' ||
   '<p>Your Eydn account will remain fully active for the next <strong>12 months</strong> so you can:</p>' ||
   '<ul style="padding-left: 20px;"><li>Download your complete guest list and vendor contacts</li><li>Keep your wedding website live for guests to revisit photos</li><li>Export all your planning data as a keepsake</li></ul>' ||
   '<p>Enjoy married life! We''re here if you need us.</p>',
   ARRAY['partnerNames']),

  ('lifecycle_download_reminder_1mo', 'lifecycle', '1 month after wedding: data export reminder.',
   '{{partnerNames}} — Your wedding data is safe with Eydn',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">1 month post-wedding</h2>' ||
   '<p>Hi {{firstName}}! Just a friendly reminder that all your wedding planning data is still available in your Eydn dashboard.</p>' ||
   '<p>Now is a great time to:</p>' ||
   '<ul style="padding-left: 20px;"><li><strong>Export your guest list</strong> &mdash; perfect for thank-you card addresses</li><li><strong>Download your data</strong> &mdash; keep a personal backup of everything</li><li><strong>Save vendor contacts</strong> &mdash; for future referrals or anniversary plans</li></ul>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data</a></p>',
   ARRAY['partnerNames', 'firstName', 'appUrl']),

  ('lifecycle_download_reminder_6mo', 'lifecycle', '6 months after wedding: half-anniversary check-in.',
   '{{partnerNames}} — 6 months of married life!',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Happy half-anniversary!</h2>' ||
   '<p>6 months since {{weddingDate}} &mdash; time flies!</p>' ||
   '<p>Your Eydn account is still fully active for another 6 months. After that, it will move to read-only mode.</p>' ||
   '<p>We recommend downloading a backup of your data while everything is fresh:</p>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data</a></p>',
   ARRAY['partnerNames', 'weddingDate', 'appUrl']),

  ('lifecycle_download_reminder_9mo', 'marketing', '9 months after wedding: archiving in 3 months + memory plan upsell.',
   '{{partnerNames}} — 3 months until your account archives',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Heads up &mdash; archiving in 3 months</h2>' ||
   '<p>Your Eydn account will move to <strong>read-only mode</strong> in about 3 months (12 months after your wedding on {{weddingDate}}).</p>' ||
   '<p>Before that happens, make sure to:</p>' ||
   '<ul style="padding-left: 20px;"><li>Download your complete wedding data</li><li>Export your guest list (CSV/Excel/PDF)</li><li>Save any photos from your wedding website gallery</li></ul>' ||
   '<p>Want to keep full access? The <strong>Memory Plan ($29/year)</strong> keeps your wedding website live and your data fully accessible.</p>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Manage My Account</a></p>',
   ARRAY['partnerNames', 'weddingDate', 'appUrl']),

  ('lifecycle_memory_plan_offer', 'marketing', '11 months after wedding: dedicated memory plan pitch.',
   '{{partnerNames}} — Keep your wedding website alive',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Your wedding website doesn''t have to go offline</h2>' ||
   '<p>Your Eydn account is approaching its 12-month post-wedding mark. Soon, your dashboard will become read-only and your wedding website will eventually go offline.</p>' ||
   '<p>With the <strong>Memory Plan ($29/year)</strong>, you get:</p>' ||
   '<ul style="padding-left: 20px;"><li>Wedding website stays live &mdash; guests can always revisit it</li><li>Full data access and export, forever</li><li>Continue editing your guest list and photo gallery</li><li>Priority support</li></ul>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Subscribe to Memory Plan &mdash; $29/year</a></p>',
   ARRAY['partnerNames', 'appUrl']),

  ('lifecycle_archive_notice', 'marketing', '12 months after wedding: account flipped to read-only.',
   '{{partnerNames}} — Your Eydn account is now read-only',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Your account has been archived</h2>' ||
   '<p>It''s been 12 months since your wedding on {{weddingDate}}. Your Eydn account is now in <strong>read-only mode</strong>.</p>' ||
   '<p>You can still:</p>' ||
   '<ul style="padding-left: 20px;"><li>View all your wedding data</li><li>Download a complete backup</li><li>Export your guest list</li></ul>' ||
   '<p>Your data will be preserved for another 12 months. After that, it will be permanently deleted.</p>' ||
   '<p>To restore full access and keep your wedding website live, subscribe to the Memory Plan:</p>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Subscribe &mdash; $29/year</a></p>',
   ARRAY['partnerNames', 'weddingDate', 'appUrl']),

  ('lifecycle_sunset_warning_21mo', 'transactional', '21 months after wedding: 3 months until permanent deletion.',
   '{{partnerNames}} — Your Eydn data will be deleted in 3 months',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Important: Data deletion in 3 months</h2>' ||
   '<p>Your Eydn account data from your wedding on {{weddingDate}} will be <strong>permanently deleted in approximately 3 months</strong> (24 months post-wedding).</p>' ||
   '<p><strong>Please download your data now</strong> if you haven''t already:</p>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: #1A1A2E; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data Now</a></p>' ||
   '<p style="margin-top: 16px;">Or subscribe to the Memory Plan ($29/year) to keep everything:</p>' ||
   '<p style="text-align: center;"><a href="{{appUrl}}/dashboard/settings" style="color: #2C3E2D; font-weight: 600;">Subscribe to Memory Plan</a></p>',
   ARRAY['partnerNames', 'weddingDate', 'appUrl']),

  ('lifecycle_sunset_final', 'transactional', '23.5 months after wedding: final notice before deletion.',
   '{{partnerNames}} — Final notice: Eydn data deletion',
   '<h2 style="color: #1A1A2E; font-size: 22px; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Final notice</h2>' ||
   '<p>Your Eydn account data will be <strong>permanently deleted within the next few days</strong>.</p>' ||
   '<p>This is your last chance to download your wedding planning data, guest list, vendor contacts, and photos.</p>' ||
   '<p style="text-align: center; margin-top: 24px;"><a href="{{appUrl}}/dashboard/settings" style="display: inline-block; background: #A0204A; color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Download My Data Immediately</a></p>' ||
   '<p style="margin-top: 16px; color: #5A5A5A; font-size: 13px;">If you''d like to keep your data, subscribe to the Memory Plan ($29/year) before deletion occurs.</p>',
   ARRAY['partnerNames', 'appUrl']);

-- Sequences. The trigger_event tells the runner which anchor date to use:
--   trial_started → wedding.trial_started_at (or created_at fallback)
--   wedding_date  → wedding.date

INSERT INTO public.email_sequences (slug, description, trigger_event, audience_filter) VALUES
  ('trial_expiry', 'Trial-expiry messages around days 10 and 14 of the 14-day Pro trial.',
   'trial_started', '{}'::jsonb),
  ('wedding_lifecycle', 'Post-wedding archival flow from day 0 (wedding day) to ~24 months out.',
   'wedding_date', '{}'::jsonb);

-- Trial expiry steps. Per-step audience filter splits day-14 senders by whether
-- a card is on file (matching the existing logic in /api/cron/trial-emails).
INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days, audience_filter) VALUES
  ('trial_expiry', 10, 'trial_day_10_save_card',     10, '{"has_card_saved": false}'::jsonb),
  ('trial_expiry', 14, 'trial_day_14_renews_today',  14, '{"has_card_saved": true}'::jsonb),
  ('trial_expiry', 15, 'trial_day_14_downgraded',    14, '{"has_card_saved": false}'::jsonb);

-- Wedding lifecycle steps. Day offsets match src/lib/lifecycle.ts thresholds:
--   1mo ≈ 30, 6mo ≈ 183, 9mo ≈ 274, 11mo ≈ 335, 12mo ≈ 365, 21mo ≈ 639, 23.5mo ≈ 716.
INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days, audience_filter) VALUES
  ('wedding_lifecycle', 1, 'lifecycle_post_wedding_welcome',    0,   '{}'::jsonb),
  ('wedding_lifecycle', 2, 'lifecycle_download_reminder_1mo',   30,  '{}'::jsonb),
  ('wedding_lifecycle', 3, 'lifecycle_download_reminder_6mo',   183, '{}'::jsonb),
  ('wedding_lifecycle', 4, 'lifecycle_download_reminder_9mo',   274, '{}'::jsonb),
  ('wedding_lifecycle', 5, 'lifecycle_memory_plan_offer',       335, '{}'::jsonb),
  ('wedding_lifecycle', 6, 'lifecycle_archive_notice',          365, '{}'::jsonb),
  ('wedding_lifecycle', 7, 'lifecycle_sunset_warning_21mo',     639, '{}'::jsonb),
  ('wedding_lifecycle', 8, 'lifecycle_sunset_final',            716, '{}'::jsonb);
