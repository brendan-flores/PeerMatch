-- PeerMatch initial Postgres schema (Supabase)
-- Table names match legacy MongoDB collection names where camelCase applies.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  account_type TEXT CHECK (account_type IN ('client', 'freelancer')),
  course TEXT,
  year_level TEXT,
  about_me TEXT,
  skills TEXT,
  location TEXT,
  photo_data_url TEXT,
  freelancer_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  profile_completed BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  verification JSONB,
  suspended BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_account_suspended ON users (role, account_type, suspended);

CREATE TABLE "clientTasks" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  subject_category TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high')),
  client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  budget NUMERIC NOT NULL DEFAULT 0 CHECK (budget >= 0),
  category TEXT NOT NULL CHECK (category IN ('academic', 'non-academic')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  hire_status TEXT NOT NULL DEFAULT 'open' CHECK (hire_status IN ('open', 'assigned', 'completed')),
  assigned_freelancer_id UUID REFERENCES users (id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  review_rating INTEGER CHECK (review_rating IS NULL OR (review_rating >= 1 AND review_rating <= 5)),
  review_text TEXT NOT NULL DEFAULT '',
  review_submitted_at TIMESTAMPTZ,
  flagged BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users (id) ON DELETE SET NULL,
  rejected_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_tasks_client_created ON "clientTasks" (client_id, created_at DESC);
CREATE INDEX idx_client_tasks_status_hire_created ON "clientTasks" (status, hire_status, created_at DESC);
CREATE INDEX idx_client_tasks_status ON "clientTasks" (status);
CREATE INDEX idx_client_tasks_hire_status ON "clientTasks" (hire_status);
CREATE INDEX idx_client_tasks_assigned_freelancer ON "clientTasks" (assigned_freelancer_id);

CREATE TABLE adminactivities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  sub TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL CHECK (badge IN ('pending', 'approved', 'rejected', 'completed', 'warning')),
  kind TEXT NOT NULL DEFAULT 'default' CHECK (
    kind IN ('default', 'task_approved', 'task_rejected', 'task_submitted', 'task_flagged')
  ),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  client_name TEXT NOT NULL DEFAULT '',
  moderator_name TEXT NOT NULL DEFAULT '',
  task_title TEXT NOT NULL DEFAULT '',
  task_id UUID REFERENCES "clientTasks" (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_adminactivities_occurred_at ON adminactivities (occurred_at DESC);
CREATE INDEX idx_adminactivities_kind_occurred ON adminactivities (kind, occurred_at DESC);

CREATE TABLE "freelancerReviews" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  task_id UUID NOT NULL UNIQUE REFERENCES "clientTasks" (id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  text TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_freelancer_reviews_freelancer ON "freelancerReviews" (freelancer_id);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'seen')),
  seen_at TIMESTAMPTZ,
  unsent BOOLEAN NOT NULL DEFAULT false,
  removed_for_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  vanished_for_users JSONB NOT NULL DEFAULT '[]'::jsonb,
  reactions JSONB NOT NULL DEFAULT '[]'::jsonb,
  reply_to_message_id UUID REFERENCES messages (id) ON DELETE SET NULL,
  reply_preview TEXT NOT NULL DEFAULT '',
  forwarded_from_preview TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_messages_sender ON messages (sender_id);
CREATE INDEX idx_messages_receiver ON messages (receiver_id);
CREATE INDEX idx_messages_timestamp ON messages (timestamp DESC);
CREATE INDEX idx_messages_sender_receiver_timestamp ON messages (sender_id, receiver_id, timestamp DESC);
CREATE INDEX idx_messages_receiver_status_timestamp ON messages (receiver_id, status, timestamp);

CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES "clientTasks" (id) ON DELETE CASCADE,
  post_title TEXT NOT NULL,
  freelancer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  freelancer_name TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  rate TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_offers_post_id ON offers (post_id);
CREATE INDEX idx_offers_freelancer_id ON offers (freelancer_id);
CREATE INDEX idx_offers_client_id ON offers (client_id);
CREATE INDEX idx_offers_status ON offers (status);
CREATE UNIQUE INDEX idx_offers_post_freelancer ON offers (post_id, freelancer_id);
CREATE INDEX idx_offers_client_created ON offers (client_id, created_at DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (
    type IN ('new_task', 'new_offer', 'post_review', 'post_approved', 'message', 'like', 'follow', 'response')
  ),
  action_text TEXT NOT NULL,
  related_task_id UUID REFERENCES "clientTasks" (id) ON DELETE SET NULL,
  related_offer_id UUID REFERENCES offers (id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_recipient ON notifications (recipient_id);
CREATE INDEX idx_notifications_actor ON notifications (actor_id);
CREATE INDEX idx_notifications_type ON notifications (type);
CREATE INDEX idx_notifications_related_task ON notifications (related_task_id);
CREATE INDEX idx_notifications_read ON notifications (read);
CREATE INDEX idx_notifications_recipient_created ON notifications (recipient_id, created_at DESC);
