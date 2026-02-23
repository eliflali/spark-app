-- =============================================================================
-- SPARK APP — Supabase PostgreSQL Schema
-- Run this entire script in the Supabase SQL Editor.
-- =============================================================================


-- =============================================================================
-- 1. TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- spaces: The shared area between two partners.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.spaces (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at  timestamptz NOT NULL    DEFAULT now(),
    invite_code text        NOT NULL    UNIQUE,
    is_active   boolean     NOT NULL    DEFAULT true
);

-- -----------------------------------------------------------------------------
-- profiles: User profiles linked to Supabase Auth (auth.users).
-- Automatically populated via trigger on new sign-up.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text,
    avatar_url   text,
    space_id     uuid REFERENCES public.spaces(id) ON DELETE SET NULL,
    partner_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    credits      int  NOT NULL DEFAULT 10
);

-- Index for fast space_id lookups (used heavily in RLS policies)
CREATE INDEX IF NOT EXISTS idx_profiles_space_id ON public.profiles(space_id);

-- -----------------------------------------------------------------------------
-- canvas_data: Shared drawing widget per space.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.canvas_data (
    id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id         uuid        NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    path_data        jsonb       NOT NULL DEFAULT '[]'::jsonb,
    last_updated_by  uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_canvas_data_space_id ON public.canvas_data(space_id);

-- -----------------------------------------------------------------------------
-- daily_sparks: Repository of daily questions.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_sparks (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text text NOT NULL,
    category      text NOT NULL,
    release_date  date NOT NULL UNIQUE
);

-- -----------------------------------------------------------------------------
-- date_sessions: Tracks progress of interactive guided dates per space.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.date_sessions (
    id            uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id      uuid    NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    template_id   text    NOT NULL,
    current_step  int     NOT NULL DEFAULT 0,
    is_completed  boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_date_sessions_space_id ON public.date_sessions(space_id);


-- =============================================================================
-- 2. AUTOMATION — Auto-create profile on new sign-up
-- =============================================================================

-- Function: called by trigger on auth.users INSERT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
-- Keeps the function running with elevated privileges so it can write to
-- public.profiles even before the user has their own RLS access.
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        -- Pull display_name from Apple / OAuth metadata when available
        COALESCE(
            NEW.raw_user_meta_data ->> 'full_name',
            NEW.raw_user_meta_data ->> 'name',
            split_part(NEW.email, '@', 1)
        ),
        NEW.raw_user_meta_data ->> 'avatar_url'
    );
    RETURN NEW;
END;
$$;

-- Trigger: fires after every new row in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE public.spaces       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_data  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_sparks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.date_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------
-- Helper: a stable function that returns the calling user's space_id.
-- Using SECURITY DEFINER avoids a recursive RLS call into profiles.
-- ---------------------
CREATE OR REPLACE FUNCTION public.my_space_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT space_id FROM public.profiles WHERE id = auth.uid();
$$;


-- ── spaces ──────────────────────────────────────────────────────────────────

-- Users can read their own space
CREATE POLICY "spaces: members can select"
    ON public.spaces FOR SELECT
    TO authenticated
    USING (id = public.my_space_id());

-- Users can insert a NEW space (for the invite flow)
CREATE POLICY "spaces: authenticated users can insert"
    ON public.spaces FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update their own space (e.g., deactivate it)
CREATE POLICY "spaces: members can update"
    ON public.spaces FOR UPDATE
    TO authenticated
    USING (id = public.my_space_id());


-- ── profiles ────────────────────────────────────────────────────────────────

-- Users can read profiles that share their space (themselves + partner)
CREATE POLICY "profiles: members can select"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid()
        OR space_id = public.my_space_id()
    );

-- Each user can only insert their own profile row
CREATE POLICY "profiles: users can insert own"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- Each user can only update their own profile row
CREATE POLICY "profiles: users can update own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());


-- ── canvas_data ──────────────────────────────────────────────────────────────

-- Partners can read their shared canvas
CREATE POLICY "canvas_data: members can select"
    ON public.canvas_data FOR SELECT
    TO authenticated
    USING (space_id = public.my_space_id());

-- Partners can insert canvas rows for their space
CREATE POLICY "canvas_data: members can insert"
    ON public.canvas_data FOR INSERT
    TO authenticated
    WITH CHECK (space_id = public.my_space_id());

-- Partners can update their shared canvas
CREATE POLICY "canvas_data: members can update"
    ON public.canvas_data FOR UPDATE
    TO authenticated
    USING (space_id = public.my_space_id());

-- Partners can delete canvas rows (e.g., clear canvas)
CREATE POLICY "canvas_data: members can delete"
    ON public.canvas_data FOR DELETE
    TO authenticated
    USING (space_id = public.my_space_id());


-- ── daily_sparks ─────────────────────────────────────────────────────────────

-- All authenticated users can read questions
CREATE POLICY "daily_sparks: authenticated users can select"
    ON public.daily_sparks FOR SELECT
    TO authenticated
    USING (true);

-- Only service_role (backend / admin) can write questions.
-- No INSERT/UPDATE/DELETE policy is created for the `authenticated` role,
-- which means those operations are implicitly denied for regular users.


-- ── date_sessions ────────────────────────────────────────────────────────────

-- Partners can read their date sessions
CREATE POLICY "date_sessions: members can select"
    ON public.date_sessions FOR SELECT
    TO authenticated
    USING (space_id = public.my_space_id());

-- Partners can start a new date session
CREATE POLICY "date_sessions: members can insert"
    ON public.date_sessions FOR INSERT
    TO authenticated
    WITH CHECK (space_id = public.my_space_id());

-- Partners can advance / complete a date session
CREATE POLICY "date_sessions: members can update"
    ON public.date_sessions FOR UPDATE
    TO authenticated
    USING (space_id = public.my_space_id());


-- =============================================================================
-- 4. REAL-TIME
-- =============================================================================

-- Add canvas_data and date_sessions to the Supabase Realtime publication.
-- The default publication is called "supabase_realtime".

ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.date_sessions;


-- =============================================================================
-- Done! ✓
-- Tables: spaces, profiles, canvas_data, daily_sparks, date_sessions
-- Trigger: handle_new_user → auto-creates profile on Apple/OAuth sign-up
-- RLS: enabled on all tables with space-scoped policies
-- Realtime: canvas_data + date_sessions are live-subscribed
-- =============================================================================
