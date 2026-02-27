-- Migration for suggested_dates table
CREATE TABLE public.suggested_dates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
    suggested_activity_id TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    vibe_data JSONB
);

-- Turn on Row Level Security
ALTER TABLE public.suggested_dates ENABLE ROW LEVEL SECURITY;

-- Allow users to read suggested_dates for their space
CREATE POLICY "Users can view suggested dates in their space"
    ON public.suggested_dates FOR SELECT
    USING (
        space_id IN (
            SELECT space_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Allow users to insert suggested_dates for their space
CREATE POLICY "Users can insert suggested dates in their space"
    ON public.suggested_dates FOR INSERT
    WITH CHECK (
        space_id IN (
            SELECT space_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Add to Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE suggested_dates;
