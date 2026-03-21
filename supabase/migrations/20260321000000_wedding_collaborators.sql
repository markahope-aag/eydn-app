-- Wedding collaborators: allow partners and coordinators to share access
CREATE TABLE wedding_collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wedding_id UUID NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('partner', 'coordinator')),
  invite_status TEXT NOT NULL DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted')),
  invited_by TEXT NOT NULL,
  user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (wedding_id, email)
);

-- Indexes for the two lookup paths in getWeddingForUser()
CREATE INDEX idx_wedding_collaborators_user_id ON wedding_collaborators(user_id) WHERE invite_status = 'accepted';
CREATE INDEX idx_wedding_collaborators_email ON wedding_collaborators(email) WHERE invite_status = 'pending';
