-- Add the read-only "parent" collaborator role.
-- Parents can view the wedding dashboard but cannot edit any wedding data;
-- read-only enforcement lives in the API layer (getWeddingForUser callers).
ALTER TABLE public.wedding_collaborators
  DROP CONSTRAINT IF EXISTS wedding_collaborators_role_check;

ALTER TABLE public.wedding_collaborators
  ADD CONSTRAINT wedding_collaborators_role_check
  CHECK (role IN ('partner', 'coordinator', 'parent'));
