-- =============================================================================
-- MIGRATION: get_couple_memories RPC
-- Run this in the Supabase SQL Editor.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_couple_memories(p_limit int DEFAULT 50)
RETURNS TABLE (
    memory_id text,
    memory_type text,
    created_at timestamptz,
    title text,
    preview text,
    emoji text,
    color text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_space_id uuid;
BEGIN
    v_space_id := public.my_space_id();
    IF v_space_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT * FROM (
        -- 1. SPARKS: Group by spark_id, pull directly from daily_answers
        SELECT 
            MAX(da.id::text) AS memory_id,
            'spark'::text AS memory_type,
            MAX(da.created_at) AS created_at,
            'Daily Spark'::text AS title,
            COALESCE(
                MAX(CASE WHEN da.user_id = auth.uid() THEN da.answer_text ELSE NULL END),
                'You and your partner answered this spark.'
            ) AS preview,
            '✨'::text AS emoji,
            '#F59E0B'::text AS color
        FROM public.daily_answers da
        WHERE da.couple_id = v_space_id
        GROUP BY da.spark_id
        
        UNION ALL
        
        -- 2. DATES: Completed sessions (check both status and is_completed)
        SELECT 
            sess.id::text AS memory_id,
            'date'::text AS memory_type,
            sess.last_interaction_at AS created_at,
            sess.template_id AS title,
            'We completed this date together.'::text AS preview,
            '🤍'::text AS emoji,
            '#34D399'::text AS color
        FROM public.date_sessions sess
        WHERE sess.space_id = v_space_id AND (sess.status = 'completed' OR sess.is_completed = true)
        
        UNION ALL
        
        -- 3. PHOTOS (Widget Surprises)
        SELECT 
            ws.id::text AS memory_id,
            'photo'::text AS memory_type,
            ws.created_at AS created_at,
            'Widget Surprise'::text AS title,
            ws.content AS preview, -- contains URL
            '📸'::text AS emoji,
            '#818CF8'::text AS color
        FROM public.widget_surprises ws
        WHERE ws.couple_id = v_space_id AND ws.type = 'PHOTO'
    ) combined
    ORDER BY created_at DESC
    LIMIT p_limit;
END;
$$;
