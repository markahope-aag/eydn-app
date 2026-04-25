-- Phase 2 sequences: extend trial_expiry with 3 new mid-trial nudges, add the
-- post-downgrade nurture flow (trial_downgraded trigger), and the pre-wedding
-- milestone series (wedding_milestones, wedding_date trigger with negative
-- offsets). Body copy comes from the Drive sequence docs (April 2026).

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Trial Expiry expansion: Days 11, 12, 13 templates + sequence steps
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('trial_day_11_vendor_question', 'transactional',
   'Day 11 of trial: vendor itemization tip + lifetime nudge.',
   'The one vendor question that saves couples the most money',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Three days left on your trial &mdash; but this one&rsquo;s just useful regardless.</p>' ||
   '<p>Before you sign any vendor contract, ask for a full itemized breakdown instead of a package price.</p>' ||
   '<p>Package pricing hides where the margin is. When you ask vendors to break it down line by line, you find out what you&rsquo;re actually paying for &mdash; and what&rsquo;s negotiable.</p>' ||
   '<p>The items that are almost always more flexible than they appear: delivery fees, setup and breakdown charges, overtime rates, travel fees. These quietly add 10&ndash;20% to quotes that look reasonable on the surface.</p>' ||
   '<p>Eydn Pro has 50+ vendor email templates including one specifically for requesting itemized quotes. Worth having before your next vendor conversation.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('trial_day_12_why_we_charge', 'transactional',
   'Day 12 of trial: explain why $79 (no vendor revenue model).',
   'Why Eydn costs $79',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Two days left on your trial. We want to tell you something most apps wouldn&rsquo;t bother explaining.</p>' ||
   '<p>Eydn costs $79 because of who we want to answer to.</p>' ||
   '<p>Every major wedding app is free for couples. The Knot, Zola, Joy, WeddingWire &mdash; free. The reason is that vendors pay instead. Vendors pay thousands of dollars a year to be listed, featured, and recommended. Which means every &ldquo;free&rdquo; planning tool is ultimately optimized for the people paying the bills &mdash; not the couple using it.</p>' ||
   '<p>We looked at that model and decided we didn&rsquo;t want it. Not because it&rsquo;s wrong for every business, but because it&rsquo;s wrong for this one. The moment a vendor can pay to influence what Eydn recommends, Eydn stops working for you.</p>' ||
   '<p>So we charge couples $79. One time. No subscription, no vendor revenue, no one in the background whose interests come before yours.</p>' ||
   '<p>That&rsquo;s the whole reason.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Keep my Eydn AI planner &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('trial_day_13_last_day', 'transactional',
   'Day 13 of trial: one day left, what locks vs. stays.',
   'Tomorrow&rsquo;s your last day &mdash; here&rsquo;s what locks and what stays',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Tomorrow your Pro trial ends. Wanted to give you a clear picture before it does.</p>' ||
   '<p><strong>What stays with you on the free tier:</strong></p>' ||
   '<ul style="padding-left: 20px;">' ||
     '<li>Full guest list</li>' ||
     '<li>Budget tracker with everything you&rsquo;ve added</li>' ||
     '<li>AI-personalized task timeline</li>' ||
     '<li>Partner collaboration</li>' ||
     '<li>Basic wedding website</li>' ||
   '</ul>' ||
   '<p><strong>What locks tomorrow:</strong></p>' ||
   '<ul style="padding-left: 20px;">' ||
     '<li>Chat with your AI planner</li>' ||
     '<li>AI catch-up plans</li>' ||
     '<li>AI budget optimizer</li>' ||
     '<li>Day-of binder export</li>' ||
     '<li>Vendor-independent search</li>' ||
     '<li>All wedding website templates</li>' ||
   '</ul>' ||
   '<p>No pressure &mdash; the free tier is genuinely useful and your data isn&rsquo;t going anywhere.</p>' ||
   '<p>But if you&rsquo;re going to upgrade, tomorrow is the last day it feels like a decision rather than a recovery.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once, no subscription, covers your whole wedding</a></p>' ||
   '<p style="text-align: center; color: #5A5A5A; font-size: 13px; margin-top: 12px;">Or $14.99/month if you want to keep going before committing.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']);

INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days, audience_filter) VALUES
  ('trial_expiry', 11, 'trial_day_11_vendor_question', 11, '{"has_card_saved": false}'::jsonb),
  ('trial_expiry', 12, 'trial_day_12_why_we_charge',   12, '{"has_card_saved": false}'::jsonb),
  ('trial_expiry', 13, 'trial_day_13_last_day',        13, '{"has_card_saved": false}'::jsonb);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Post-Downgrade Nurture: 8 emails after trial drops to free tier
-- ─────────────────────────────────────────────────────────────────────────
-- Anchor = trial_end (trial_started_at + 14d). Day 17 = +3 from anchor, etc.

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('downgrade_d17_free_tier_intro', 'nurture',
   'Day 17 (3 days post-downgrade): orientation on free tier, no upsell.',
   'You&rsquo;re on the free tier now &mdash; here&rsquo;s what that looks like',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>You&rsquo;re on the free tier as of yesterday. Wanted to give you a clear picture of where things stand.</p>' ||
   '<p>Everything you built during your trial is still there &mdash; guest list, budget, task timeline, partner access. Nothing got deleted, nothing got reset.</p>' ||
   '<p>The AI features are locked, but the free tier is genuinely useful. Your task timeline updates automatically as your wedding date gets closer. Your budget tracker keeps running. Your partner can still see and edit everything in real time.</p>' ||
   '<p>The best thing you can do right now is stay consistent with it &mdash; check in once a week, keep the guest list updated, and log vendor decisions as you make them. Couples who do that find planning a lot more manageable when things get heavier in a few months.</p>' ||
   '<p>We&rsquo;ll be here when you&rsquo;re ready for more.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName']),

  ('downgrade_d20_three_things', 'nurture',
   'Day 20: three early decisions worth locking in.',
   'The three things worth locking in this week',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>A few things that are easy to do right now and genuinely hard to do later:</p>' ||
   '<p><strong>Lock in your top three vendors.</strong> Venue, photographer, caterer. These book out 12&ndash;18 months ahead in most markets. Everything else has more flexibility &mdash; these don&rsquo;t. If you haven&rsquo;t confirmed all three, this week is the week.</p>' ||
   '<p><strong>Set a real budget ceiling.</strong> Not the aspirational number &mdash; the one you&rsquo;d be comfortable telling your most practical friend. Set it before you fall in love with anything. It&rsquo;s much harder to walk back a number once you&rsquo;ve shown vendors what you&rsquo;re willing to spend.</p>' ||
   '<p><strong>Get your partner synced.</strong> If they&rsquo;re not in Eydn yet, invite them this week. Couples who plan on the same system fight less about money and logistics. The ones who split it across different tools always end up with gaps.</p>' ||
   '<p>None of these needs the AI. They just need to happen soon.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName']),

  ('downgrade_d21_vendor_secret', 'nurture',
   'Day 21: vendor itemization tip + lifetime push.',
   'Something most couples don&rsquo;t find out until it&rsquo;s too late',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Before you sign any vendor contract, ask for a full itemized breakdown instead of a package price.</p>' ||
   '<p>Package pricing is designed to hide where the margin is. When you ask vendors to break it down line by line, two things happen: you find out what you&rsquo;re actually paying for, and you find out what&rsquo;s negotiable.</p>' ||
   '<p>The items that are almost always more flexible than vendors let on: delivery fees, setup and breakdown charges, overtime rates, and travel fees. These quietly add 10&ndash;20% to quotes that look reasonable on the surface.</p>' ||
   '<p>Most couples don&rsquo;t find this out until they&rsquo;re reviewing a final invoice and wondering where the number came from.</p>' ||
   '<p>Eydn Pro has 25+ vendor email templates &mdash; including ones built specifically off of your wedding details. It&rsquo;s one of those things that pays for itself the first time you use it.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('downgrade_d25_one_month_in', 'nurture',
   'Day 25: a month into planning, what staying on track looks like.',
   'A month in &mdash; here&rsquo;s what staying on track actually looks like',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>About a month into planning. A few things that separate the couples who stay on top of it from the ones who end up in catch-up mode:</p>' ||
   '<p><strong>They made decisions and stopped revisiting them.</strong> The venue is booked. The photographer is booked. Those aren&rsquo;t open questions anymore. Every choice you keep open costs energy you&rsquo;ll need later.</p>' ||
   '<p><strong>They kept one source of truth.</strong> One place where vendor contacts live, where the budget lives, where the guest list lives. Not a Google doc, not a notes app, not a folder of emails. One place.</p>' ||
   '<p><strong>They had the honest money conversation early.</strong> Couples who talk about the real budget &mdash; not the aspirational one &mdash; before signing contracts have significantly less stress in the final three months.</p>' ||
   '<p>Your Eydn free tier is built to be that one source of truth. Keep using it consistently and you&rsquo;ll be in better shape than most couples at this stage.</p>' ||
   '<p>And when you&rsquo;re ready for the AI to take some of the load &mdash; catch-up plans, budget optimizer, vendor search &mdash; it&rsquo;s one payment away.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('downgrade_d30_check_in', 'nurture',
   'Day 30: 30-day check-in.',
   '30 days on the free tier &mdash; a quick check-in',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Thirty days since your trial ended. A quick check-in on where things tend to stand at this point &mdash; and where you want to be.</p>' ||
   '<p>Most couples at day 30 have their venue and one or two vendors locked, but are starting to feel the weight of everything still open. The guest list is probably still drifting. The budget has a few categories that need real numbers.</p>' ||
   '<p>The couples who are in good shape at this point have done three things: they stopped treating the guest list as a draft, they&rsquo;ve had the real budget conversation with their partner, and they have a clear picture of what needs to happen in the next 60 days.</p>' ||
   '<p>Your Eydn task timeline already has that picture built out. If you haven&rsquo;t looked at it recently, it&rsquo;s worth five minutes.</p>' ||
   '<p>And if the open items are piling up faster than you can close them &mdash; that&rsquo;s exactly when the AI catch-up plan earns its keep. It looks at everything overdue and builds a prioritized two-week recovery list in about 2 minutes.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('downgrade_d45_planning_phase', 'nurture',
   'Day 45: the chaos phase that catches couples off guard.',
   'The part of wedding planning that catches everyone off guard',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>There&rsquo;s a phase in wedding planning that catches almost every couple off guard.</p>' ||
   '<p>You start strong &mdash; venue locked, photographer booked, guest list drafted. Then, around month 3 or 4, tasks start stacking faster than you can check them off. Vendor follow-ups, deposit deadlines, family opinions, timeline decisions. It all arrives at once.</p>' ||
   '<p>Most couples at that point are juggling 3&ndash;4 different apps and a Google doc nobody&rsquo;s updated in two weeks. The ones who get through it cleanly aren&rsquo;t the ones who work harder &mdash; they&rsquo;re the ones who had a system before the chaos started.</p>' ||
   '<p>Your free tier keeps your task timeline, budget, and guest list in one place. That&rsquo;s a head start most people don&rsquo;t have.</p>' ||
   '<p>When the stack gets heavy, and you want the AI to help sort through it, it&rsquo;s $79 to unlock everything for the rest of your planning. One payment. No subscription. No recurring charge.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('downgrade_d60_two_months', 'nurture',
   'Day 60: deposit deadlines + guest creep + tool consolidation.',
   'Two months in &mdash; the things worth checking right now',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Two months in. A few things that tend to catch couples off guard right around now:</p>' ||
   '<p><strong>Deposit deadlines are stacking up.</strong> Most vendors ask for 25&ndash;50% upfront and the due dates cluster together in a way nobody warns you about. Pull up every contract you&rsquo;ve signed and map out when each payment is due. Do it this week before one sneaks past you.</p>' ||
   '<p><strong>Guest list creep.</strong> The number that felt right at engagement has a way of growing once families get involved. If yours has drifted, set a hard ceiling now and hold it. Every addition has a cost ripple &mdash; venue, catering, invitations, favors.</p>' ||
   '<p><strong>The tool nobody&rsquo;s updating.</strong> If your planning has split across multiple apps, now is the time to consolidate. The longer it stays fragmented, the harder it is to pull back together.</p>' ||
   '<p>Your Eydn task timeline is flagging upcoming deadlines automatically. Worth a look if you haven&rsquo;t checked in recently.</p>' ||
   '<p>If the list is starting to feel like a lot, that&rsquo;s exactly the moment the AI catch-up plan is designed for. Two minutes to a prioritized recovery list.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('downgrade_d90_coordination', 'nurture',
   'Day 90: coordination phase begins, day-of binder pitch.',
   'Three months in &mdash; the coordination phase is starting',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Three months in. If you&rsquo;ve been keeping up, the big decisions are mostly made. What&rsquo;s ahead is different.</p>' ||
   '<p>The next phase is coordination &mdash; confirming details, chasing responses, making sure 8&ndash;12 vendors are aligned on the same day. It&rsquo;s less creative and more logistical. And it&rsquo;s where couples who didn&rsquo;t build a solid system start to feel it.</p>' ||
   '<p>A few things worth doing in the next two weeks:</p>' ||
   '<p><strong>Vendor check-ins.</strong> Reach out to every vendor you&rsquo;ve booked. Confirm the date, the logistics, any outstanding decisions. Get everything in writing. Things slip in the gap between booking and confirmation.</p>' ||
   '<p><strong>Start your day-of timeline.</strong> Not the final version &mdash; just a draft. Getting-ready times, ceremony start, cocktail hour, dinner service, first dance. Building it now, while you have bandwidth, is a lot easier than building it in month 11.</p>' ||
   '<p><strong>Budget audit.</strong> Compare what you estimated against what you&rsquo;ve actually committed to. Six months out is when the gap between those numbers becomes visible &mdash; and when you still have room to adjust.</p>' ||
   '<p>Eydn&rsquo;s day-of binder and AI budget optimizer are both built for exactly this phase. If you&rsquo;ve been on the free tier and the coordination is starting to feel heavy, this is the window where Pro earns its keep.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once, covers everything from here to the wedding day</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']);

INSERT INTO public.email_sequences (slug, description, trigger_event, audience_filter) VALUES
  ('post_downgrade_nurture',
   'Post-trial nurture series: 8 emails over 90 days for users who downgraded to free.',
   'trial_downgraded',
   '{}'::jsonb);

INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days) VALUES
  ('post_downgrade_nurture', 1, 'downgrade_d17_free_tier_intro', 3),
  ('post_downgrade_nurture', 2, 'downgrade_d20_three_things',    6),
  ('post_downgrade_nurture', 3, 'downgrade_d21_vendor_secret',   7),
  ('post_downgrade_nurture', 4, 'downgrade_d25_one_month_in',    11),
  ('post_downgrade_nurture', 5, 'downgrade_d30_check_in',        16),
  ('post_downgrade_nurture', 6, 'downgrade_d45_planning_phase',  31),
  ('post_downgrade_nurture', 7, 'downgrade_d60_two_months',      46),
  ('post_downgrade_nurture', 8, 'downgrade_d90_coordination',    76);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Wedding Date Milestone: 9 emails anchored to wedding date (mostly pre)
-- ─────────────────────────────────────────────────────────────────────────

INSERT INTO public.email_templates (slug, category, description, subject, html, variables) VALUES
  ('milestone_18mo', 'marketing',
   '18 months pre-wedding: venue + budget priority.',
   '18 months until your wedding &mdash; start here',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Eighteen months is a comfortable runway. It&rsquo;s also the window where the couples who end up least stressed make the decisions everyone else defers.</p>' ||
   '<p>Two things worth doing right now that most people leave too late:</p>' ||
   '<p><strong>Pick your venue.</strong> Weekend dates at popular venues in most markets are gone 12&ndash;18 months out. Everything else in your planning &mdash; your guest count, your catering, your photographer&rsquo;s availability &mdash; follows the venue date. It&rsquo;s the first domino.</p>' ||
   '<p><strong>Have the real budget conversation.</strong> Not the rough number, not the aspirational ceiling &mdash; the actual figure both of you are genuinely comfortable spending. Have it before you see a single venue or taste a single catering menu. Once you fall in love with something, the number gets harder to hold.</p>' ||
   '<p>Your Eydn task timeline already has the next 30 days mapped out based on your wedding date. If you haven&rsquo;t looked at it yet, that&rsquo;s your starting point.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/tasks" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">See your personalized planning timeline</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_12mo', 'marketing',
   '12 months pre-wedding: next 60 days are critical.',
   '12 months out &mdash; the next 60 days are the ones that matter most',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Twelve months sounds like a long runway. It is &mdash; if you use the next 60 days well.</p>' ||
   '<p>The decisions you make right now set the budget, the guest count, and the tone for everything that follows. Most of the stress couples feel in the final months stems from something that wasn&rsquo;t locked in early enough.</p>' ||
   '<p><strong>Lock in your venue if you haven&rsquo;t.</strong> Peak-season Saturdays book 12&ndash;18 months in advance. If yours isn&rsquo;t confirmed, this is urgent.</p>' ||
   '<p><strong>Draft your guest list in two tiers.</strong> Tier 1 is everyone you&rsquo;d be genuinely upset to leave out. Tier 2 is everyone you&rsquo;d invite if the venue allows. Knowing both numbers shapes every other decision &mdash; catering, invitations, seating, and budget.</p>' ||
   '<p><strong>Set your budget ceiling and stop moving it.</strong> Build in a 10% buffer before you start spending it. The couples who don&rsquo;t do this always wish they had.</p>' ||
   '<p>Your task timeline covers the next 30 days. Your budget tracker is ready for real numbers. Both are in your dashboard right now.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock the AI planner to move faster &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_9mo', 'marketing',
   '9 months pre-wedding: photographer + caterer + band priority.',
   '9 months to go &mdash; the vendors to lock in this month',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Nine months out. If your venue is locked, this is the window to secure the vendors who book up fastest &mdash; and the order matters.</p>' ||
   '<p><strong>Photographer first.</strong> The best photographers in most markets are booked 12+ months ahead. If you have a shortlist, reach out this week. Not this month &mdash; this week.</p>' ||
   '<p><strong>Caterer second.</strong> If catering isn&rsquo;t included in your venue, this is your next most time-sensitive booking. Tasting availability alone can take 4&ndash;6 weeks to schedule.</p>' ||
   '<p><strong>Band or DJ third.</strong> Live music books out fast. DJs have more flexibility but the good ones don&rsquo;t.</p>' ||
   '<p>Before you meet with any of them, write down your non-negotiables. When you&rsquo;re sitting in a tasting or a sales presentation it&rsquo;s easy to get swept up. Knowing your must-haves before you walk in saves a lot of expensive regret.</p>' ||
   '<p>Eydn&rsquo;s vendor search finds vendors in your area without the pay-to-play directory bias &mdash; no one&rsquo;s paid to show up first.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock vendor search &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_6mo', 'marketing',
   '6 months pre-wedding: guest list + STDs + officiant.',
   '6 months out &mdash; the decisions that are easy now and hard later',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Six months out is where planning shifts from exciting to real. The big vendors are booked. Now it&rsquo;s the decisions that feel less urgent &mdash; but aren&rsquo;t.</p>' ||
   '<p><strong>Finalize your guest list.</strong> The number needs to be real and it needs to stop growing. Your venue has a capacity, your caterer has a per-head cost, and every addition has a ripple effect on the budget. Set the ceiling and hold it.</p>' ||
   '<p><strong>Send your save-the-dates.</strong> Six months is the outer edge for destination weddings, four months is fine for local. The longer you wait, the more conflicts you create for guests who need to plan travel.</p>' ||
   '<p><strong>Book your officiant.</strong> This one surprises people. Licensed officiants in popular markets book up &mdash; especially on peak-season Saturdays.</p>' ||
   '<p>Your budget is also worth a serious check-in right now. Six months out is when deposit payments start stacking and the gap between estimated and actual spend becomes visible for the first time. Eydn&rsquo;s budget optimizer flags where you&rsquo;re trending over before it becomes a problem.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock the budget optimizer &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_3mo', 'marketing',
   '3 months pre-wedding: coordination starts.',
   '3 months out &mdash; coordination starts now',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Three months out. The big decisions are behind you. What&rsquo;s ahead is coordination &mdash; and coordination is where things either hold together or fall apart.</p>' ||
   '<p><strong>Get your final headcount to your caterer.</strong> Most require a firm number 60&ndash;90 days out. Confirm their deadline and hit it &mdash; this one has real financial consequences if you miss it.</p>' ||
   '<p><strong>Draft your seating chart.</strong> It doesn&rsquo;t need to be final but having a working version now means the final version isn&rsquo;t a last-minute panic. Starting it fresh at month 11 is brutal.</p>' ||
   '<p><strong>Call every vendor you&rsquo;ve booked.</strong> Confirm the date, the arrival time, the logistics, any outstanding decisions. Get everything in writing. Things slip in the gap between booking and the wedding day.</p>' ||
   '<p><strong>Build your day-of timeline.</strong> Getting-ready times, ceremony start, cocktail hour, dinner service, first dance, last dance. Your vendors will need this. Build it now while you have bandwidth.</p>' ||
   '<p>Eydn&rsquo;s day-of binder pulls all of this into one exportable document &mdash; vendor contacts, timeline, seating chart, emergency numbers &mdash; formatted and ready to hand to anyone helping you on the day.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock the day-of binder &mdash; $79 once</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_1mo', 'marketing',
   '1 month pre-wedding: close open loops.',
   'One month out &mdash; close the open loops',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>One month out. This is not the time for new projects. This is the time to close every open loop before it closes on you.</p>' ||
   '<p><strong>Finalize your seating chart.</strong> This task almost always takes longer than couples expect. Do it this week, not this weekend before the wedding.</p>' ||
   '<p><strong>Confirm final headcount</strong> with your caterer, venue, and anyone charging per head.</p>' ||
   '<p><strong>Walk your day-of timeline with your partner.</strong> Does it make sense end to end? Are the transitions realistic? Does every vendor know what time to arrive and where to go?</p>' ||
   '<p><strong>Brief your point person.</strong> Whether that&rsquo;s a coordinator, a family member, or a trusted wedding party member &mdash; someone who isn&rsquo;t you needs to know the full plan. You should not be managing logistics on your wedding day.</p>' ||
   '<p><strong>Prepare vendor payments.</strong> Know who needs what, in what form, and on what date. Have it ready before the week of.</p>' ||
   '<p>One month out is when the AI is most useful for loose ends &mdash; last-minute vendor questions, timeline gaps, anything still sitting open. If you&rsquo;ve been on the free tier, this is the window where Pro pays for itself most clearly.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/billing" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Unlock Pro &mdash; $79 once, covers the final stretch</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_2wk', 'lifecycle',
   '2 weeks pre-wedding: short list of what matters.',
   'Two weeks out &mdash; the only things still worth your attention',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Two weeks out. The list of things that actually matter right now is shorter than it feels.</p>' ||
   '<p><strong>Send your day-of timeline to everyone.</strong> Every vendor, your wedding party, your point person. Not just the ones you think need it &mdash; all of them. Surprises on the day almost always trace back to someone who didn&rsquo;t have the timeline.</p>' ||
   '<p><strong>Do one final seating chart pass.</strong> Fix anything obvious. Then close the document and don&rsquo;t open it again.</p>' ||
   '<p><strong>Confirm your vendor payments are ready.</strong> Every envelope labeled, every amount confirmed, every payment method verified.</p>' ||
   '<p><strong>Stop making new decisions.</strong> The flowers are chosen. The menu is set. The music is locked. More decisions at this stage don&rsquo;t make the wedding better &mdash; they just cost you sleep and energy you&rsquo;ll want on the day itself.</p>' ||
   '<p>Everything you&rsquo;ve built in Eydn is still there. If your day-of binder isn&rsquo;t exported and in someone&rsquo;s hands yet, do that this week.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/dashboard/day-of" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Export your day-of binder</a></p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']),

  ('milestone_1wk', 'lifecycle',
   '1 week pre-wedding: stop planning, enjoy the week.',
   'One week. You&rsquo;ve got this.',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>One week out. The planning is done &mdash; or it&rsquo;s as done as it&rsquo;s going to be.</p>' ||
   '<p>This week the only jobs worth doing are:</p>' ||
   '<p>Verify your day-of timeline is with every vendor and your point person. Do one last seating chart check. Make sure payment envelopes are labeled and ready. Then give yourself permission to stop.</p>' ||
   '<p>The decisions are made. More planning won&rsquo;t make the wedding better. What makes the wedding better now is showing up rested, present, and not running a logistics operation in your head while it&rsquo;s happening.</p>' ||
   '<p>Whatever you built &mdash; however you planned it &mdash; it&rsquo;s yours. The details you agonized over are the ones your guests will remember. The ones you let go of, they probably won&rsquo;t notice.</p>' ||
   '<p>Go enjoy your week.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName']),

  ('milestone_post7d', 'marketing',
   'Wedding date + 7 days: thank-you + referral + memory plan.',
   'Congratulations &mdash; how did everything go?',
   '<h2 style="color: #1A1A2E; font-size: 22px; margin-top: 0; font-family: ''Cormorant Garamond'', Georgia, serif; font-weight: 600;">Hey {{firstName}},</h2>' ||
   '<p>Congratulations. You planned a wedding and you did it.</p>' ||
   '<p>We&rsquo;d genuinely love to know how it went &mdash; what worked, what didn&rsquo;t, what you&rsquo;d tell a newly engaged couple to do differently. Hit reply if you have two minutes. Every response is read and it makes the product better for the next person.</p>' ||
   '<p>One small ask: if Eydn helped, and you know someone who just got engaged, share it with them. The budget calculator at eydn.app is free, takes about 5 minutes, and is the fastest way to start with a real plan instead of a blank page.</p>' ||
   '<p style="text-align: center; margin: 28px 0 8px;"><a href="{{appUrl}}/calculator" style="display: inline-block; background: linear-gradient(135deg, #2C3E2D, #8B7A30); color: white; padding: 12px 28px; border-radius: 999px; text-decoration: none; font-weight: 600;">Share Eydn with a newly engaged couple</a></p>' ||
   '<p>And if you want to keep your wedding memories, vendor contacts, and planning history archived, the Eydn Memory Plan keeps everything saved for $29 a year. No pressure &mdash; just worth knowing it&rsquo;s there.</p>' ||
   '<p>Thank you for trusting us with your planning. It meant something to us.</p>' ||
   '<p style="margin-top: 28px; color: #5A5A5A;">&mdash; The Eydn team</p>',
   ARRAY['firstName', 'appUrl']);

INSERT INTO public.email_sequences (slug, description, trigger_event, audience_filter) VALUES
  ('wedding_milestones',
   'Pre-wedding planning milestones from 18 months out through 1 week + thank-you at +7 days.',
   'wedding_date',
   '{}'::jsonb);

INSERT INTO public.email_sequence_steps (sequence_slug, step_order, template_slug, offset_days) VALUES
  ('wedding_milestones', 1, 'milestone_18mo',    -547),
  ('wedding_milestones', 2, 'milestone_12mo',    -365),
  ('wedding_milestones', 3, 'milestone_9mo',     -274),
  ('wedding_milestones', 4, 'milestone_6mo',     -183),
  ('wedding_milestones', 5, 'milestone_3mo',     -91),
  ('wedding_milestones', 6, 'milestone_1mo',     -30),
  ('wedding_milestones', 7, 'milestone_2wk',     -14),
  ('wedding_milestones', 8, 'milestone_1wk',     -7),
  ('wedding_milestones', 9, 'milestone_post7d',  7);
