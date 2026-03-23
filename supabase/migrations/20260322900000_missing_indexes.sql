-- Add missing indexes for common query patterns

-- weddings.user_id — hit on EVERY authenticated request via getWeddingForUser()
CREATE INDEX idx_weddings_user_id ON public.weddings(user_id);

-- chat_messages — queried by wedding_id, ordered by created_at (chat history)
CREATE INDEX idx_chat_messages_wedding ON public.chat_messages(wedding_id, created_at DESC);

-- rsvp_tokens — public endpoint looks up by token string
CREATE INDEX idx_rsvp_tokens_token ON public.rsvp_tokens(token);
CREATE INDEX idx_rsvp_tokens_wedding ON public.rsvp_tokens(wedding_id);

-- attachments — queried by wedding_id + entity_type + entity_id
CREATE INDEX idx_attachments_entity ON public.attachments(wedding_id, entity_type, entity_id);

-- ceremony_positions — queried by wedding_id, ordered by position_order
CREATE INDEX idx_ceremony_positions_wedding ON public.ceremony_positions(wedding_id, position_order);

-- day_of_plans — queried by wedding_id (single row per wedding)
CREATE INDEX idx_day_of_plans_wedding ON public.day_of_plans(wedding_id);

-- questionnaire_responses — queried by wedding_id (single row per wedding)
CREATE INDEX idx_questionnaire_responses_wedding ON public.questionnaire_responses(wedding_id);

-- registry_links — queried by wedding_id, ordered by sort_order
CREATE INDEX idx_registry_links_wedding ON public.registry_links(wedding_id, sort_order);

-- wedding_photos — queried by wedding_id
CREATE INDEX idx_wedding_photos_wedding ON public.wedding_photos(wedding_id);
