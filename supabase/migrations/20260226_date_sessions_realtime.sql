-- =============================================================================
-- MIGRATION: Real-Time Connection Invitations
-- Run this in the Supabase SQL Editor.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. Extend date_sessions for invitation tracking
-- -----------------------------------------------------------------------------

ALTER TABLE public.date_sessions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  ADD COLUMN IF NOT EXISTS initiator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_id   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_interaction_at timestamptz NOT NULL DEFAULT now();

-- Index for fast partner_id + status lookups (the real-time invitation query)
CREATE INDEX IF NOT EXISTS idx_date_sessions_partner_status
  ON public.date_sessions(partner_id, status);

CREATE INDEX IF NOT EXISTS idx_date_sessions_initiator
  ON public.date_sessions(initiator_id);


-- -----------------------------------------------------------------------------
-- 2. session_answers: syncs Deep Dive step answers in real-time
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.session_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid        NOT NULL REFERENCES public.date_sessions(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  step        int         NOT NULL,
  answer_text text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id, step)
);

CREATE INDEX IF NOT EXISTS idx_session_answers_session_id
  ON public.session_answers(session_id);


-- -----------------------------------------------------------------------------
-- 3. RLS for session_answers
-- -----------------------------------------------------------------------------

ALTER TABLE public.session_answers ENABLE ROW LEVEL SECURITY;

-- Space members can read answers for their sessions
CREATE POLICY "session_answers: space members can select"
  ON public.session_answers FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM public.date_sessions WHERE space_id = public.my_space_id()
    )
  );

-- Users can only insert their own answers for their space's sessions
CREATE POLICY "session_answers: space members can insert"
  ON public.session_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    session_id IN (
      SELECT id FROM public.date_sessions WHERE space_id = public.my_space_id()
    )
  );

-- Users can update their own answers (e.g., edit before partner responds)
CREATE POLICY "session_answers: users can update own"
  ON public.session_answers FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());


-- -----------------------------------------------------------------------------
-- 4. Add session_answers to Realtime publication
-- -----------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE public.session_answers;


-- =============================================================================
-- Done ✓
-- Changes:
--   date_sessions: +status, +initiator_id, +partner_id, +last_interaction_at
--   NEW TABLE: session_answers (step answer sync for Deep Dive mode)
--   RLS: session_answers fully protected, space-scoped
--   Realtime: session_answers added to publication
-- =============================================================================
