-- Mark all existing weddings as tour complete so current users don't see it again
UPDATE public.weddings SET tour_complete = true WHERE tour_complete = false;
