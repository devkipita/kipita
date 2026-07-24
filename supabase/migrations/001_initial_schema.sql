-- Kipita Database Schema
-- Supabase / PostgreSQL

-- ══════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Supabase provides pgcrypto by default. Use its UUID function directly
-- instead of uuid-ossp, which can be installed outside the search path.
CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
RETURNS UUID
LANGUAGE sql
VOLATILE
AS $$
  SELECT gen_random_uuid();
$$;

-- ══════════════════════════════════════════
-- USERS
-- ══════════════════════════════════════════
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  rating NUMERIC(3,2) NOT NULL DEFAULT 0.00,
  total_trips INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON public.users(auth_id);
CREATE INDEX idx_users_phone ON public.users(phone);

-- ══════════════════════════════════════════
-- DRIVER PROFILES
-- ══════════════════════════════════════════
CREATE TABLE public.driver_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ══════════════════════════════════════════
-- VEHICLES
-- ══════════════════════════════════════════
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  seats_available INTEGER NOT NULL DEFAULT 4 CHECK (seats_available >= 1 AND seats_available <= 8),
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plate_number)
);

CREATE INDEX idx_vehicles_driver ON public.vehicles(driver_id);

-- ══════════════════════════════════════════
-- RIDES (posted by drivers)
-- ══════════════════════════════════════════
CREATE TYPE ride_status AS ENUM ('posted', 'active', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES public.users(id),
  vehicle_id UUID REFERENCES public.vehicles(id),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_lat DOUBLE PRECISION,
  from_lng DOUBLE PRECISION,
  to_lat DOUBLE PRECISION,
  to_lng DOUBLE PRECISION,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  seats_total INTEGER NOT NULL CHECK (seats_total >= 1 AND seats_total <= 8),
  seats_available INTEGER NOT NULL CHECK (seats_available >= 0),
  price_per_seat NUMERIC(10,2) NOT NULL CHECK (price_per_seat > 0),
  preferences JSONB NOT NULL DEFAULT '{"luggage":false,"pets":false,"silent_ride":false,"music":false}',
  status ride_status NOT NULL DEFAULT 'posted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rides_driver ON public.rides(driver_id);
CREATE INDEX idx_rides_status ON public.rides(status);
CREATE INDEX idx_rides_route ON public.rides(from_location, to_location);
CREATE INDEX idx_rides_departure ON public.rides(departure_date, departure_time);

-- ══════════════════════════════════════════
-- RIDE REQUESTS (posted by passengers)
-- ══════════════════════════════════════════
CREATE TYPE request_status AS ENUM ('pending', 'matched', 'confirmed', 'cancelled', 'expired');

CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  passenger_id UUID NOT NULL REFERENCES public.users(id),
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_lat DOUBLE PRECISION,
  from_lng DOUBLE PRECISION,
  to_lat DOUBLE PRECISION,
  to_lng DOUBLE PRECISION,
  preferred_date DATE,
  preferred_time TIME,
  seats_needed INTEGER NOT NULL DEFAULT 1 CHECK (seats_needed >= 1 AND seats_needed <= 8),
  preferences JSONB NOT NULL DEFAULT '{"luggage":false,"pets":false,"silent_ride":false,"music":false}',
  status request_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requests_passenger ON public.ride_requests(passenger_id);
CREATE INDEX idx_requests_status ON public.ride_requests(status);
CREATE INDEX idx_requests_route ON public.ride_requests(from_location, to_location);

-- ══════════════════════════════════════════
-- BOOKINGS
-- ══════════════════════════════════════════
CREATE TYPE booking_status AS ENUM ('pending_payment', 'confirmed', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ride_id UUID NOT NULL REFERENCES public.rides(id),
  passenger_id UUID NOT NULL REFERENCES public.users(id),
  driver_id UUID NOT NULL REFERENCES public.users(id),
  request_id UUID REFERENCES public.ride_requests(id),
  seats_booked INTEGER NOT NULL CHECK (seats_booked >= 1),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price > 0),
  status booking_status NOT NULL DEFAULT 'pending_payment',
  payment_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent double bookings
  UNIQUE(ride_id, passenger_id)
);

CREATE INDEX idx_bookings_passenger ON public.bookings(passenger_id);
CREATE INDEX idx_bookings_driver ON public.bookings(driver_id);
CREATE INDEX idx_bookings_ride ON public.bookings(ride_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);

-- ══════════════════════════════════════════
-- PAYMENTS
-- ══════════════════════════════════════════
CREATE TYPE payment_method AS ENUM ('mpesa', 'card');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  user_id UUID NOT NULL REFERENCES public.users(id),
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'KES',
  method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'pending',
  provider_reference TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ══════════════════════════════════════════
-- MESSAGES & CONVERSATIONS
-- ══════════════════════════════════════════
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_ids UUID[] NOT NULL,
  ride_id UUID REFERENCES public.rides(id),
  request_id UUID REFERENCES public.ride_requests(id),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_participants ON public.conversations USING GIN(participant_ids);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- ══════════════════════════════════════════
-- ANNOUNCEMENTS (Road Alerts)
-- ══════════════════════════════════════════
CREATE TYPE alert_category AS ENUM ('traffic', 'accident', 'road_closure', 'weather', 'police', 'general');

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  location TEXT NOT NULL,
  category alert_category NOT NULL DEFAULT 'general',
  content TEXT NOT NULL,
  image_url TEXT,
  reactions_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_announcements_created ON public.announcements(created_at DESC);

CREATE TABLE public.alert_reactions (
  alert_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  reaction TEXT NOT NULL DEFAULT '👍',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (alert_id, user_id)
);

CREATE TABLE public.alert_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alert_comments_alert ON public.alert_comments(alert_id, created_at);

-- ══════════════════════════════════════════
-- NOTIFICATIONS
-- ══════════════════════════════════════════
CREATE TYPE notification_type AS ENUM (
  'ride_match', 'request_match', 'payment_success', 'payment_failed',
  'trip_started', 'trip_completed', 'new_message', 'new_alert', 'system'
);

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id) WHERE read = FALSE;

-- ══════════════════════════════════════════
-- RATINGS
-- ══════════════════════════════════════════
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id),
  from_user_id UUID NOT NULL REFERENCES public.users(id),
  to_user_id UUID NOT NULL REFERENCES public.users(id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, from_user_id)
);

CREATE INDEX idx_ratings_to_user ON public.ratings(to_user_id);

-- ══════════════════════════════════════════
-- PHONE VERIFICATIONS
-- ══════════════════════════════════════════
CREATE TABLE public.phone_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- TRIP CONFIRMATIONS
-- ══════════════════════════════════════════
CREATE TABLE public.trip_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) UNIQUE,
  confirmed_by_driver BOOLEAN NOT NULL DEFAULT FALSE,
  confirmed_by_passenger BOOLEAN NOT NULL DEFAULT FALSE,
  driver_confirmed_at TIMESTAMPTZ,
  passenger_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════
-- FUNCTIONS: Transactional seat deduction
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION deduct_seats(
  p_ride_id UUID,
  p_seats INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_available INTEGER;
BEGIN
  -- Lock the ride row for update
  SELECT seats_available INTO current_available
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF current_available IS NULL THEN
    RAISE EXCEPTION 'Ride not found';
  END IF;

  IF current_available < p_seats THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rides
  SET seats_available = seats_available - p_seats,
      updated_at = NOW()
  WHERE id = p_ride_id;

  RETURN TRUE;
END;
$$;

-- ══════════════════════════════════════════
-- FUNCTIONS: Update user rating on new rating
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  avg_score NUMERIC;
BEGIN
  SELECT AVG(score)::NUMERIC(3,2) INTO avg_score
  FROM public.ratings
  WHERE to_user_id = NEW.to_user_id;

  UPDATE public.users
  SET rating = COALESCE(avg_score, 0),
      updated_at = NOW()
  WHERE id = NEW.to_user_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_rating
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION update_user_rating();

-- ══════════════════════════════════════════
-- FUNCTIONS: Increment alert reaction count
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_alert_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.announcements SET reactions_count = reactions_count + 1 WHERE id = NEW.alert_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.announcements SET reactions_count = GREATEST(reactions_count - 1, 0) WHERE id = OLD.alert_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_alert_reactions
AFTER INSERT OR DELETE ON public.alert_reactions
FOR EACH ROW
EXECUTE FUNCTION update_alert_reaction_count();

-- ══════════════════════════════════════════
-- FUNCTIONS: Increment alert comment count
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_alert_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.announcements SET comments_count = comments_count + 1 WHERE id = NEW.alert_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.announcements SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.alert_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_alert_comments
AFTER INSERT OR DELETE ON public.alert_comments
FOR EACH ROW
EXECUTE FUNCTION update_alert_comment_count();

-- ══════════════════════════════════════════
-- FUNCTIONS: Auto-create user profile on auth signup
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, full_name, phone, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.phone,
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- ══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users: read all, update own
CREATE POLICY "Users are viewable by everyone" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own" ON public.users FOR UPDATE USING (auth.uid() = auth_id);

-- Driver profiles: own only
CREATE POLICY "Driver profiles own" ON public.driver_profiles
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Vehicles: read all, write own
CREATE POLICY "Vehicles readable" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Vehicles own write" ON public.vehicles
  FOR ALL USING (driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Rides: read all posted, write own
CREATE POLICY "Rides readable" ON public.rides FOR SELECT USING (true);
CREATE POLICY "Rides own write" ON public.rides
  FOR INSERT WITH CHECK (driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Rides own update" ON public.rides
  FOR UPDATE USING (driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Ride requests: read all pending, write own
CREATE POLICY "Requests readable" ON public.ride_requests FOR SELECT USING (true);
CREATE POLICY "Requests own write" ON public.ride_requests
  FOR INSERT WITH CHECK (passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Requests own update" ON public.ride_requests
  FOR UPDATE USING (passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Bookings: participants only
CREATE POLICY "Bookings participants" ON public.bookings
  FOR SELECT USING (
    passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
CREATE POLICY "Bookings insert" ON public.bookings
  FOR INSERT WITH CHECK (
    passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );
CREATE POLICY "Bookings update" ON public.bookings
  FOR UPDATE USING (
    passenger_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    OR driver_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
  );

-- Payments: own only
CREATE POLICY "Payments own" ON public.payments
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Conversations: participants only
CREATE POLICY "Conversations participants" ON public.conversations
  FOR SELECT USING (
    (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
  );
CREATE POLICY "Conversations create" ON public.conversations
  FOR INSERT WITH CHECK (
    (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
  );

-- Messages: conversation participants only
CREATE POLICY "Messages readable by participants" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
    )
  );
CREATE POLICY "Messages insert by participants" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (SELECT id FROM public.users WHERE auth_id = auth.uid())
    AND conversation_id IN (
      SELECT id FROM public.conversations
      WHERE (SELECT id FROM public.users WHERE auth_id = auth.uid()) = ANY(participant_ids)
    )
  );

-- Announcements: read all, write own
CREATE POLICY "Alerts readable" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Alerts own write" ON public.announcements
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Alert reactions/comments: authenticated
CREATE POLICY "Alert reactions auth" ON public.alert_reactions
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));
CREATE POLICY "Alert comments read" ON public.alert_comments FOR SELECT USING (true);
CREATE POLICY "Alert comments write" ON public.alert_comments
  FOR INSERT WITH CHECK (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Notifications: own only
CREATE POLICY "Notifications own" ON public.notifications
  FOR ALL USING (user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- Ratings: read all, write own
CREATE POLICY "Ratings readable" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Ratings own write" ON public.ratings
  FOR INSERT WITH CHECK (from_user_id = (SELECT id FROM public.users WHERE auth_id = auth.uid()));

-- ══════════════════════════════════════════
-- REALTIME
-- ══════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
