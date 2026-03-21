-- Seed the suggested vendors directory with sample vendors
INSERT INTO public.suggested_vendors (name, category, description, website, phone, email, city, state, price_range, featured) VALUES
-- Venues
('The Grand Estate', 'Venue', 'Elegant indoor/outdoor estate with gardens, ballroom, and bridal suite. Capacity up to 300 guests.', 'https://example.com', '(555) 100-0001', 'info@grandestate.com', 'Austin', 'TX', '$$$', true),
('Lakeview Pavilion', 'Venue', 'Waterfront ceremony and reception space with panoramic lake views.', 'https://example.com', '(555) 100-0002', 'events@lakeviewpavilion.com', 'Nashville', 'TN', '$$', false),
('The Barn at Willow Creek', 'Venue', 'Rustic-chic barn venue on 50 acres with ceremony meadow and string lights.', 'https://example.com', '(555) 100-0003', 'hello@willowcreekbarn.com', 'Denver', 'CO', '$$', false),
('Rosewood Manor', 'Venue', 'Historic Victorian mansion with manicured grounds and vintage charm.', 'https://example.com', '(555) 100-0004', 'weddings@rosewoodmanor.com', 'Charleston', 'SC', '$$$$', true),

-- Caterers
('Farm & Table Catering', 'Caterer', 'Farm-to-table menus with seasonal ingredients. Customizable packages for any size.', 'https://example.com', '(555) 200-0001', 'taste@farmandtable.com', 'Austin', 'TX', '$$$', true),
('Golden Fork Events', 'Caterer', 'Full-service catering with international cuisine options and craft cocktails.', 'https://example.com', '(555) 200-0002', 'book@goldenfork.com', 'Nashville', 'TN', '$$', false),
('Savory Bites Co.', 'Caterer', 'Affordable buffet and plated dinner options. Specializes in Southern comfort food.', 'https://example.com', '(555) 200-0003', 'info@savorybites.com', 'Atlanta', 'GA', '$$', false),

-- Photographers
('Ember & Light Photography', 'Photographer', 'Romantic, natural light wedding photography. Editorial and candid styles.', 'https://example.com', '(555) 300-0001', 'hello@emberandlight.com', 'Austin', 'TX', '$$$', true),
('Wildflower Studios', 'Photographer', 'Documentary-style photography capturing authentic moments and emotions.', 'https://example.com', '(555) 300-0002', 'book@wildflowerstudios.com', 'Denver', 'CO', '$$', false),
('Parker James Photo', 'Photographer', 'Bold, vibrant photography with a modern editorial edge.', 'https://example.com', '(555) 300-0003', 'info@parkerjames.com', 'Nashville', 'TN', '$$$', false),

-- Videographers
('Golden Hour Films', 'Videographer', 'Cinematic wedding films with drone footage and same-day edits.', 'https://example.com', '(555) 400-0001', 'films@goldenhour.com', 'Austin', 'TX', '$$$', true),
('Reel Love Cinema', 'Videographer', 'Storytelling-focused wedding videos with professional color grading.', 'https://example.com', '(555) 400-0002', 'hello@reellove.com', 'Charleston', 'SC', '$$', false),

-- DJ or Band
('Rhythm & Soul Entertainment', 'DJ or Band', 'Professional DJ and MC services. Custom playlists, lighting, and photo booths.', 'https://example.com', '(555) 500-0001', 'book@rhythmsoul.com', 'Nashville', 'TN', '$$', true),
('The Moonlighters Band', 'DJ or Band', '8-piece live band covering pop, soul, jazz, and country. Dance floor guaranteed.', 'https://example.com', '(555) 500-0002', 'gigs@moonlighters.com', 'Austin', 'TX', '$$$', false),
('DJ Harmony', 'DJ or Band', 'Bilingual DJ with expertise in multicultural celebrations. Lighting packages available.', 'https://example.com', '(555) 500-0003', 'info@djharmony.com', 'Atlanta', 'GA', '$$', false),

-- Officiants
('Forever Ceremonies', 'Officiant', 'Non-denominational officiant offering personalized, heartfelt ceremonies.', 'https://example.com', '(555) 600-0001', 'ceremonies@forever.com', 'Austin', 'TX', '$', false),
('Rev. Grace Mitchell', 'Officiant', 'Ordained minister specializing in interfaith and same-sex ceremonies.', 'https://example.com', '(555) 600-0002', 'rev.grace@example.com', 'Denver', 'CO', '$', false),

-- Florists
('Petal & Stem', 'Florist', 'Luxury floral design studio. Bouquets, centerpieces, arches, and installations.', 'https://example.com', '(555) 700-0001', 'blooms@petalandstem.com', 'Austin', 'TX', '$$$', true),
('Wildroot Florals', 'Florist', 'Organic, garden-style arrangements with locally sourced seasonal blooms.', 'https://example.com', '(555) 700-0002', 'hello@wildroot.com', 'Nashville', 'TN', '$$', false),
('Bloom & Co.', 'Florist', 'Modern minimalist floral design. Dried flower and greenery specialists.', 'https://example.com', '(555) 700-0003', 'info@bloomco.com', 'Charleston', 'SC', '$$', false),

-- Cake/Dessert Baker
('Sugar & Spice Bakery', 'Cake/Dessert Baker', 'Custom wedding cakes and dessert tables. Fondant, buttercream, and naked cake styles.', 'https://example.com', '(555) 800-0001', 'orders@sugarspice.com', 'Austin', 'TX', '$$', true),
('The Cake Atelier', 'Cake/Dessert Baker', 'Artisan wedding cakes with hand-painted details and sugar flowers.', 'https://example.com', '(555) 800-0002', 'hello@cakeatelier.com', 'Nashville', 'TN', '$$$', false),

-- Hair Stylist
('Bridal Beauty Bar', 'Hair Stylist', 'On-location bridal hair team. Updos, braids, and Hollywood glam.', 'https://example.com', '(555) 900-0001', 'book@bridalbeautybar.com', 'Austin', 'TX', '$$', false),
('Luxe Locks Studio', 'Hair Stylist', 'Specializing in bridal parties. Trial sessions included with packages.', 'https://example.com', '(555) 900-0002', 'info@luxelocks.com', 'Denver', 'CO', '$$', true),

-- Makeup Artist
('Glow Up Artistry', 'Makeup Artist', 'Airbrush and traditional bridal makeup. Lash application and touch-up kits included.', 'https://example.com', '(555) 910-0001', 'beauty@glowup.com', 'Austin', 'TX', '$$', true),
('Face Forward Studio', 'Makeup Artist', 'Clean beauty and luxury makeup for brides and bridal parties.', 'https://example.com', '(555) 910-0002', 'book@faceforward.com', 'Atlanta', 'GA', '$$', false),

-- Rentals
('Gather Event Rentals', 'Rentals', 'Tables, chairs, linens, tableware, lounge furniture, and lighting for any style.', 'https://example.com', '(555) 920-0001', 'orders@gatherrentals.com', 'Austin', 'TX', '$$', true),
('Vintage & Vine Rentals', 'Rentals', 'Curated vintage furniture, arbors, signage, and decor for rustic weddings.', 'https://example.com', '(555) 920-0002', 'info@vintageandvine.com', 'Nashville', 'TN', '$$', false),

-- Wedding Planner / Day-of Coordinator
('Ever After Events', 'Wedding Planner / Day-of Coordinator', 'Full-service planning, partial planning, and day-of coordination packages.', 'https://example.com', '(555) 930-0001', 'plan@everafter.com', 'Austin', 'TX', '$$$', true),
('The Styled Affair', 'Wedding Planner / Day-of Coordinator', 'Design-focused planning with a signature aesthetic. Featured in Martha Stewart Weddings.', 'https://example.com', '(555) 930-0002', 'hello@styledaffair.com', 'Charleston', 'SC', '$$$$', false),

-- Transportation
('Elite Wedding Transport', 'Transportation', 'Luxury vehicles, vintage cars, and party buses for weddings. Chauffeur included.', 'https://example.com', '(555) 940-0001', 'rides@elitewedding.com', 'Austin', 'TX', '$$', false),
('Chariot & Co.', 'Transportation', 'Classic car collection and modern shuttle service for guests and wedding parties.', 'https://example.com', '(555) 940-0002', 'book@chariotco.com', 'Nashville', 'TN', '$$$', true);
