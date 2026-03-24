-- Seed initial blog posts for "The Playbook"
insert into blog_posts (slug, title, excerpt, content, category, tags, author_name, status, published_at, read_time_minutes) values
(
  'wedding-budget-breakdown-2026',
  'The Ultimate Wedding Budget Breakdown for 2026',
  'A detailed guide to allocating your wedding budget across every category — from venue and catering to florals and the little things couples forget.',
  '<p>Planning a wedding budget can feel overwhelming, especially when you are not sure where to start. The average American wedding in 2026 costs around $35,000, but that number varies wildly depending on your location, guest count, and priorities.</p>

<h2>The 50/30/20 Rule for Weddings</h2>
<p>A simple framework to start with: allocate <strong>50%</strong> of your budget to the big three (venue, catering, and bar), <strong>30%</strong> to visual and experiential elements (photography, florals, music, decor), and <strong>20%</strong> to everything else (attire, stationery, favors, transportation, tips).</p>

<h2>Category-by-Category Breakdown</h2>

<h3>Venue &amp; Catering (40-50%)</h3>
<p>This is almost always the largest line item. When comparing venues, ask about what is included — many all-inclusive venues bundle catering, tables, chairs, and linens, which can actually save money compared to a raw space where you source everything separately.</p>

<h3>Photography &amp; Videography (10-15%)</h3>
<p>Your photos and video are the only tangible things you keep from your wedding day. This is one area where we consistently see couples say they wish they had spent more, not less.</p>

<h3>Florals &amp; Decor (8-12%)</h3>
<p>Flowers can add up quickly. If you are on a tighter budget, consider seasonal blooms, greenery-heavy arrangements, or repurposing ceremony flowers at the reception.</p>

<h3>Music &amp; Entertainment (5-8%)</h3>
<p>A great DJ or band can make or break the reception. Get recommendations, watch videos of them performing, and make sure their style matches the energy you want.</p>

<h3>The Hidden Costs</h3>
<p>Do not forget about tips (typically 15-20% for vendors), alterations ($200-800), marriage license fees, welcome bags, and day-of emergency supplies. Build a 5-10% buffer into your budget for surprises.</p>

<blockquote>Pro tip: Eydn auto-generates 36 budget line items across 13 categories when you set up your wedding. You will never forget a category again.</blockquote>

<h2>When to Book (and Pay)</h2>
<p>Most vendors require a deposit at booking (typically 25-50%) with the balance due 2-4 weeks before the wedding. Map out your payment timeline early so there are no surprises.</p>',
  'budget',
  ARRAY['budget', 'planning', 'money tips', '2026'],
  'Eydn Team',
  'published',
  now() - interval '2 days',
  7
),
(
  'vendor-outreach-email-templates',
  'How to Email Wedding Vendors (With Templates That Actually Work)',
  'Stop getting ghosted. Here are the exact email templates that get responses from photographers, florists, DJs, and every vendor category.',
  '<p>Reaching out to wedding vendors can feel awkward, especially if you have never done it before. The good news: most vendors <em>want</em> to hear from you. The key is making it easy for them to say yes.</p>

<h2>The Anatomy of a Great Vendor Inquiry</h2>
<p>Every initial email should include five things:</p>
<ol>
<li><strong>Your names and wedding date</strong> — this is the first thing they check</li>
<li><strong>Your venue or general location</strong> — they need to know if they serve your area</li>
<li><strong>Approximate guest count</strong> — this affects pricing for catering, rentals, and more</li>
<li><strong>What drew you to them</strong> — a personal touch goes a long way</li>
<li><strong>A clear ask</strong> — whether that is availability, pricing, or a meeting</li>
</ol>

<h2>Template: Photographer Inquiry</h2>
<p>Subject: <em>[Your Names] — [Date] Wedding Photography Inquiry</em></p>
<blockquote>Hi [Photographer Name],<br><br>We are [Name] and [Name], getting married on [Date] at [Venue] in [City]. We have been following your work and absolutely love your [editorial/candid/documentary] style — your [specific shoot or detail] really stood out to us.<br><br>We are looking for someone who can capture both the big moments and the quiet ones. Would you be available for our date? We would love to learn more about your packages and pricing.<br><br>Thank you so much!<br>[Your Names]</blockquote>

<h2>Template: General Vendor Inquiry</h2>
<blockquote>Hi [Vendor Name],<br><br>We are planning our wedding for [Date] at [Venue] ([Guest Count] guests) and would love to learn more about your services. [One sentence about what attracted you to them].<br><br>Could you share your availability and pricing for our date?<br><br>Thank you!<br>[Your Names]</blockquote>

<h2>Following Up</h2>
<p>If you have not heard back in 5-7 days, send a brief follow-up. Vendors are busy, especially during peak season. A simple &ldquo;Hi! Just wanted to follow up on my inquiry from last week&rdquo; is perfectly appropriate.</p>

<blockquote>Eydn includes built-in email templates for every vendor category, pre-filled with your wedding details. Just click and send.</blockquote>',
  'vendors',
  ARRAY['vendors', 'email templates', 'communication', 'planning tips'],
  'Eydn Team',
  'published',
  now() - interval '5 days',
  6
),
(
  'wedding-planning-timeline-12-months',
  'Your 12-Month Wedding Planning Timeline',
  'Month-by-month breakdown of what to do and when — from the moment you get engaged to your wedding day.',
  '<p>Engaged? Congratulations! Whether you have 12 months or 18, here is a realistic timeline that keeps you on track without the stress.</p>

<h2>12-10 Months Out</h2>
<ul>
<li>Set your budget and discuss priorities with your partner</li>
<li>Create your guest list (even a rough one helps with venue selection)</li>
<li>Research and book your venue — this is the first domino</li>
<li>Start looking at photographers and videographers</li>
<li>Choose your wedding party</li>
</ul>

<h2>9-7 Months Out</h2>
<ul>
<li>Book photographer, videographer, and DJ/band</li>
<li>Start dress shopping (alterations take 2-4 months)</li>
<li>Research and book a florist</li>
<li>Send save-the-dates</li>
<li>Start planning your honeymoon</li>
</ul>

<h2>6-4 Months Out</h2>
<ul>
<li>Book remaining vendors (cake, hair/makeup, transportation)</li>
<li>Order invitations</li>
<li>Plan your ceremony (officiant, readings, music)</li>
<li>Register for gifts</li>
<li>Start working on your wedding website</li>
</ul>

<h2>3-1 Months Out</h2>
<ul>
<li>Send invitations (6-8 weeks before)</li>
<li>Finalize your seating chart as RSVPs come in</li>
<li>Schedule dress fittings and alterations</li>
<li>Confirm all vendor details and timelines</li>
<li>Apply for your marriage license</li>
<li>Write your vows</li>
</ul>

<h2>The Final Week</h2>
<ul>
<li>Confirm all vendor arrival times and contact info</li>
<li>Print your day-of binder with timelines for everyone</li>
<li>Pack your emergency kit</li>
<li>Rehearsal and rehearsal dinner</li>
<li>Take a breath — you have done everything right</li>
</ul>

<blockquote>When you sign up for Eydn, we auto-generate 50+ tasks based on your specific wedding date, so you always know exactly what to do next.</blockquote>',
  'planning',
  ARRAY['timeline', 'planning', 'checklist', 'getting started'],
  'Eydn Team',
  'published',
  now() - interval '7 days',
  8
),
(
  'seating-chart-tips-stress-free',
  'How to Build a Seating Chart Without Losing Your Mind',
  'Strategic tips for arranging tables, managing family dynamics, and using your seating chart to create the best possible experience for your guests.',
  '<p>The seating chart is one of those tasks that looks simple on paper but quickly becomes a puzzle of personalities, relationships, and logistics. Here is how to approach it strategically.</p>

<h2>Start Late, Not Early</h2>
<p>Do not start your seating chart until RSVPs are mostly in (ideally 2-3 weeks before the wedding). Starting too early means constant rearranging as responses come in.</p>

<h2>The Table Strategy</h2>
<p>Group guests by connection, not obligation. Ask yourself: <em>who will these people enjoy talking to for 2-3 hours?</em> That is more important than keeping every family unit together.</p>

<h3>Table sizing matters</h3>
<p>Round tables of 8-10 work well because everyone can talk to everyone. Long banquet tables create a different energy — more communal, but harder for cross-table conversation.</p>

<h2>The Difficult Conversations</h2>
<p>Divorced parents, feuding relatives, the friend who does not know anyone else — every wedding has tricky placements. The key principles:</p>
<ul>
<li><strong>Divorced parents</strong>: Separate tables, but both in prominent positions. Neither should feel sidelined.</li>
<li><strong>Solo guests</strong>: Seat them with outgoing people or other solo guests. Never isolate them at a table of established couples.</li>
<li><strong>The wild card friend</strong>: Put them at a fun table where their energy will be appreciated, not at the quiet family table.</li>
</ul>

<h2>Pro Tips</h2>
<ul>
<li>Place older guests away from speakers</li>
<li>Keep the wedding party table near the dance floor</li>
<li>Put parents of young children near the exit for easy escapes</li>
<li>Consider a sweetheart table — it gives you a moment to breathe</li>
</ul>

<blockquote>Eydn&rsquo;s drag-and-drop seating chart lets you arrange tables visually, resize them, and see at a glance who is seated where. No sticky notes required.</blockquote>',
  'planning',
  ARRAY['seating chart', 'guests', 'reception', 'planning tips'],
  'Eydn Team',
  'published',
  now() - interval '10 days',
  5
),
(
  'what-to-include-day-of-binder',
  'What Goes in a Day-of Binder (and Why Every Couple Needs One)',
  'The complete checklist of what your wedding day binder should include — from vendor contacts and timelines to emergency kit lists.',
  '<p>A day-of binder is the single most important document you will have on your wedding day. It is the master reference that your coordinator, wedding party, and family members can turn to when questions come up — and they will come up.</p>

<h2>What to Include</h2>

<h3>1. Master Timeline</h3>
<p>A minute-by-minute schedule from hair and makeup start time through the last dance. Include setup times, vendor arrivals, and buffer time between events.</p>

<h3>2. Vendor Contact Sheet</h3>
<p>Every vendor name, phone number, email, and arrival time on one page. Your coordinator or point person needs this at their fingertips.</p>

<h3>3. Ceremony Details</h3>
<p>The full ceremony script, processional order, who stands where, readings, and music cues. Your officiant should have a copy too.</p>

<h3>4. Per-Person Schedules</h3>
<p>Not everyone needs the full timeline. Create condensed versions: one for the wedding party, one for parents, one for vendors. Each person only sees what is relevant to them.</p>

<h3>5. Setup Assignments</h3>
<p>Who is responsible for what before and after the ceremony and reception. Place cards, gift table, guest book, cake cutting — assign every task to a specific person.</p>

<h3>6. Emergency Contacts &amp; Kit</h3>
<p>A list of important phone numbers and a packing checklist for your emergency kit: sewing kit, stain remover, pain relievers, phone chargers, snacks, and more.</p>

<h3>7. Speeches &amp; Toasts</h3>
<p>A list of who is speaking and in what order. Share this with your DJ or band leader and MC.</p>

<blockquote>Eydn generates a comprehensive, beautifully branded PDF binder that includes all of this — pulled automatically from the data you have already entered. One click, and it is ready to print.</blockquote>',
  'day-of',
  ARRAY['day-of', 'binder', 'organization', 'wedding day'],
  'Eydn Team',
  'published',
  now() - interval '14 days',
  6
);
