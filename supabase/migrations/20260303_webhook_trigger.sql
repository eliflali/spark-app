-- =============================================================================
-- SPARK APP — Edge Function Webhook Setup
--
-- Step 8: Deploy the Edge Function first (CLI command, not SQL):
--
--   npx supabase@latest functions deploy notify-spark-answer --no-verify-jwt
--
-- Then run the SQL below in the Supabase SQL Editor.
-- =============================================================================


-- =============================================================================
-- Step 9 — Database Webhook (created via SQL trigger)
--
-- Calls the notify-spark-answer Edge Function on every INSERT into daily_answers.
-- Replace YOUR_PROJECT_REF with your actual project reference ID
-- (visible in your Supabase dashboard URL: https://app.supabase.com/project/YOUR_PROJECT_REF)
-- =============================================================================

-- The trigger function that fires the webhook
CREATE OR REPLACE FUNCTION public.notify_spark_answer_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  text;
  v_body text;
BEGIN
  -- ⚠️  Replace YOUR_PROJECT_REF below with your real Supabase project ref
  v_url := 'https://apzsnrkehgmwrsqcynbw.supabase.co/functions/v1/notify-spark-answer';

  -- Build the webhook payload — mirrors what Supabase Database Webhooks send
  v_body := json_build_object(
    'type',   'INSERT',
    'table',  'daily_answers',
    'record', row_to_json(NEW)
  )::text;

  -- Fire and forget (non-blocking HTTP POST via pg_net, which Supabase provides)
  PERFORM net.http_post(
    url     := v_url,
    body    := v_body::jsonb,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      -- The service_role key lets the Edge Function trust this call.
      -- ⚠️  Replace YOUR_SUPABASE_SERVICE_ROLE_KEY with your actual service role key
      -- (Supabase dashboard → Settings → API → service_role key)
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwenNucmtlaGdtd3JzcWN5bmJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg3MTk1MCwiZXhwIjoyMDg3NDQ3OTUwfQ.wsImAMH-5xekrx4f19qsE-7fLAN92wMaFPKGEokhEME'
    )
  );

  RETURN NEW;
END;
$$;

-- Attach the trigger to daily_answers
DROP TRIGGER IF EXISTS on_daily_answer_insert ON public.daily_answers;
CREATE TRIGGER on_daily_answer_insert
  AFTER INSERT ON public.daily_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_spark_answer_webhook();


-- =============================================================================
-- Done! ✓
-- Every INSERT into daily_answers will now POST to the Edge Function,
-- which sends push notifications to the relevant partner(s).
-- =============================================================================
