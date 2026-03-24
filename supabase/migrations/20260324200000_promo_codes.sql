-- Promotional codes for discounted purchases
CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  current_uses INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

CREATE UNIQUE INDEX promo_codes_code_idx ON public.promo_codes(LOWER(code));
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Tracks which users redeemed which codes
CREATE TABLE public.promo_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID NOT NULL REFERENCES public.promo_codes(id),
  user_id TEXT NOT NULL,
  purchase_id UUID REFERENCES public.subscriber_purchases(id),
  original_amount NUMERIC(10,2) NOT NULL,
  discount_amount NUMERIC(10,2) NOT NULL,
  final_amount NUMERIC(10,2) NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX promo_redemptions_user_idx ON public.promo_code_redemptions(user_id);
CREATE INDEX promo_redemptions_code_idx ON public.promo_code_redemptions(promo_code_id);
ALTER TABLE public.promo_code_redemptions ENABLE ROW LEVEL SECURITY;
