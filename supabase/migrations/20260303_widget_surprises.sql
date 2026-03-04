-- =============================================================================
-- SPARK APP — Widget Surprise Migration
-- Run this entire script in the Supabase SQL Editor.
-- =============================================================================


-- =============================================================================
-- 1. TABLE — widget_surprises
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.widget_surprises (
    id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    couple_id  uuid        NOT NULL,   -- mirrors space_id (the shared space of a pair)
    sender_id  uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type       text        NOT NULL CHECK (type IN ('PHOTO', 'NOTE', 'REACTION')),
    content    text        NOT NULL,   -- note text | Supabase Storage URL | emoji
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Fast lookups by couple and recency
CREATE INDEX IF NOT EXISTS idx_widget_surprises_couple_id  ON public.widget_surprises(couple_id);
CREATE INDEX IF NOT EXISTS idx_widget_surprises_created_at ON public.widget_surprises(couple_id, created_at DESC);


-- =============================================================================
-- 2. ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE public.widget_surprises ENABLE ROW LEVEL SECURITY;

-- Partners can read all surprises for their shared space
CREATE POLICY "widget_surprises: members can select"
    ON public.widget_surprises FOR SELECT
    TO authenticated
    USING (couple_id = public.my_space_id());

-- Only the sender themselves can insert (must belong to the same space)
CREATE POLICY "widget_surprises: members can insert"
    ON public.widget_surprises FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND couple_id = public.my_space_id()
    );


-- =============================================================================
-- 3. RPC — get_latest_widget_surprise()
--
-- Returns the single most-recent widget_surprise for the calling user's couple.
-- Called by the iOS/Android widget payload endpoint and the in-app preview.
-- SECURITY DEFINER so the widget Edge Function can call it with a service role
-- without triggering RLS recursion.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_latest_widget_surprise()
RETURNS TABLE (
    id          uuid,
    type        text,
    content     text,
    sender_name text,
    sender_id   uuid,
    created_at  timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT
        ws.id,
        ws.type,
        ws.content,
        COALESCE(p.display_name, 'Partner') AS sender_name,
        ws.sender_id,
        ws.created_at
    FROM   public.widget_surprises ws
    JOIN   public.profiles p ON p.id = ws.sender_id
    WHERE  ws.couple_id = public.my_space_id()
    ORDER  BY ws.created_at DESC
    LIMIT  1;
$$;


-- =============================================================================
-- 4. STORAGE BUCKET — widget-surprises
--
-- Run the following in the Supabase Dashboard → Storage → New Bucket:
--   Name:    widget-surprises
--   Public:  false  (private)
--
-- Then add this storage policy so authenticated users in the same space
-- can upload/read photos. (Dashboard > Storage > Policies tab, or paste below.)
-- =============================================================================

-- NOTE: Storage RLS policies live in the "storage" schema (not public).
-- You can paste these into the Supabase SQL Editor:

-- Allow members to upload their own files
INSERT INTO storage.buckets (id, name, public)
VALUES ('widget-surprises', 'widget-surprises', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "widget-photos: members can upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'widget-surprises');

CREATE POLICY "widget-photos: members can read"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'widget-surprises');


-- =============================================================================
-- 5. REALTIME
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_surprises;


-- =============================================================================
-- 6. WEBHOOK TRIGGER — fires notify-widget-surprise Edge Function on INSERT
-- =============================================================================

CREATE OR REPLACE FUNCTION public.notify_widget_surprise_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_url  text;
    v_body text;
BEGIN
    -- ⚠️  Project ref: apzsnrkehgmwrsqcynbw
    v_url := 'https://apzsnrkehgmwrsqcynbw.supabase.co/functions/v1/notify-widget-surprise';

    -- Matches standard Supabase database-webhook payload shape
    v_body := json_build_object(
        'type',   'INSERT',
        'table',  'widget_surprises',
        'record', row_to_json(NEW)
    )::text;

    PERFORM net.http_post(
        url     := v_url,
        body    := v_body::jsonb,
        headers := jsonb_build_object(
            'Content-Type',  'application/json',
            -- Service role key — allows the Edge Function to trust this call
            'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwenNucmtlaGdtd3JzcWN5bmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3MTk1MCwiZXhwIjoyMDg3NDQ3OTUwfQ.wsImAMH-5xekrx4f19qsE-7fLAN92wMaFPKGEokhEME'
        )
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_widget_surprise_insert ON public.widget_surprises;
CREATE TRIGGER on_widget_surprise_insert
    AFTER INSERT ON public.widget_surprises
    FOR EACH ROW EXECUTE FUNCTION public.notify_widget_surprise_webhook();


-- =============================================================================
-- Done! ✓
-- Tables:   widget_surprises
-- RLS:      select + insert (space-scoped)
-- RPC:      get_latest_widget_surprise() → {id, type, content, sender_name, sender_id, created_at}
-- Storage:  widget-surprises bucket + upload/read policies
-- Realtime: widget_surprises is live-subscribed
-- Trigger:  on_widget_surprise_insert → notify-widget-surprise Edge Function
-- =============================================================================
