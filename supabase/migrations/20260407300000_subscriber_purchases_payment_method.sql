-- Add payment_method column to subscriber_purchases (used by $0 promo code purchases)
ALTER TABLE public.subscriber_purchases
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe';
