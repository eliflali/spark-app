-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- This creates a server-side function that atomically creates a space and
-- links it to the calling user's profile, bypassing the RLS RETURNING conflict.

CREATE OR REPLACE FUNCTION public.create_space_for_user()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER                 -- runs as postgres (owner), bypasses RLS
SET search_path = public
AS $$
DECLARE
  new_space_id  uuid;
  new_code      text;
  chars         text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i             int;
BEGIN
  -- Generate a SP-XXXX style code
  new_code := 'SP-';
  FOR i IN 1..4 LOOP
    new_code := new_code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;

  -- Insert the space (no RLS issue, running as owner)
  INSERT INTO public.spaces (invite_code)
  VALUES (new_code)
  RETURNING id INTO new_space_id;

  -- Link the space to the calling user's profile
  UPDATE public.profiles
  SET space_id = new_space_id
  WHERE id = auth.uid();

  RETURN json_build_object('id', new_space_id, 'invite_code', new_code);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_space_for_user() TO authenticated;
