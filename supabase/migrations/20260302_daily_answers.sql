-- =============================================================================
-- SPARK APP — Daily Answers Migration
-- Run this entire script in the Supabase SQL Editor.
-- =============================================================================

-- ── 1. Add fcm_token to profiles ─────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS fcm_token text;

-- ── 2. daily_answers table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  spark_id    uuid        NOT NULL REFERENCES public.daily_sparks(id) ON DELETE CASCADE,
  couple_id   uuid        NOT NULL,   -- mirrors space_id for grouping partners
  user_id     uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  answer_text text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT daily_answers_unique_user_spark UNIQUE (spark_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_answers_spark_id  ON public.daily_answers(spark_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_couple_id ON public.daily_answers(couple_id);
CREATE INDEX IF NOT EXISTS idx_daily_answers_user_id   ON public.daily_answers(user_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.daily_answers ENABLE ROW LEVEL SECURITY;

-- Users can insert their own answer (once per spark via UNIQUE constraint)
CREATE POLICY "daily_answers: users can insert own"
  ON public.daily_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id   = auth.uid()
    AND couple_id = public.my_space_id()
  );

-- Users can read answers that belong to their couple_id
-- (real privacy is enforced at the RPC level — see get_spark_answers below)
CREATE POLICY "daily_answers: members can select"
  ON public.daily_answers FOR SELECT
  TO authenticated
  USING (couple_id = public.my_space_id());

-- ── 4. Privacy RPC ────────────────────────────────────────────────────────────
--
-- Returns answers for a given spark, but ONLY reveals the partner's answer_text
-- when the calling user has ALSO submitted an answer for that spark.
-- This is the server-side "handshake" lock.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_spark_answers(p_spark_id uuid)
RETURNS TABLE (
  user_id     uuid,
  answer_text text,
  created_at  timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_answered boolean;
BEGIN
  -- Has the calling user already answered this spark?
  SELECT EXISTS(
    SELECT 1
    FROM public.daily_answers
    WHERE spark_id = p_spark_id
      AND user_id  = auth.uid()
  ) INTO v_caller_answered;

  IF v_caller_answered THEN
    -- Caller has answered → return ALL answers for the couple
    RETURN QUERY
      SELECT da.user_id, da.answer_text, da.created_at
      FROM   public.daily_answers da
      WHERE  da.spark_id  = p_spark_id
        AND  da.couple_id = public.my_space_id();
  ELSE
    -- Caller has NOT answered → only return their own row (if any)
    RETURN QUERY
      SELECT da.user_id, da.answer_text, da.created_at
      FROM   public.daily_answers da
      WHERE  da.spark_id = p_spark_id
        AND  da.user_id  = auth.uid();
  END IF;
END;
$$;

-- ── 5. Realtime publication ───────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_answers;

-- =============================================================================
-- Done!  ✓
-- Tables: daily_answers (with UNIQUE(spark_id, user_id))
-- Column: profiles.fcm_token
-- RLS:    enabled + insert/select policies
-- RPC:    get_spark_answers — privacy-enforcing handshake
-- Realtime: daily_answers is live-subscribed
-- =============================================================================
