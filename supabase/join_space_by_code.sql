-- =============================================================================
-- join_space_by_code(p_code text)
-- Lets a user enter their partner's invite code and join that space.
-- Atomically:
--   1. Finds the space with the given invite_code.
--   2. Validates the space exists and has room (< 2 members).
--   3. Removes the caller from their current (solo) space and deletes it.
--   4. Moves the caller into the target space.
--   5. Sets partner_id on both profiles to link them.
--   6. Returns { space_id, partner_id, partner_display_name }.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.join_space_by_code(p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER                -- runs as postgres (owner), bypasses RLS
SET search_path = public
AS $$
DECLARE
  target_space_id   uuid;
  partner_profile   record;
  caller_id         uuid := auth.uid();
  caller_space_id   uuid;
  member_count      int;
  old_space_member_count int;
BEGIN
  -- 1. Find the space with the given code (case-insensitive)
  SELECT id INTO target_space_id
  FROM public.spaces
  WHERE upper(invite_code) = upper(p_code)
  LIMIT 1;

  IF target_space_id IS NULL THEN
    RAISE EXCEPTION 'code_not_found' USING HINT = 'No space found with that code.';
  END IF;

  -- 2. Count current members of the target space
  SELECT count(*) INTO member_count
  FROM public.profiles
  WHERE space_id = target_space_id;

  IF member_count >= 2 THEN
    RAISE EXCEPTION 'space_full' USING HINT = 'This space already has two members.';
  END IF;

  -- 3. Get the caller's current space_id
  SELECT space_id INTO caller_space_id
  FROM public.profiles
  WHERE id = caller_id;

  -- If the caller is already in the target space, bail early
  IF caller_space_id = target_space_id THEN
    RAISE EXCEPTION 'already_joined' USING HINT = 'You are already in this space.';
  END IF;

  -- 4. If caller has their own solo space, delete it (only if they are the sole member)
  IF caller_space_id IS NOT NULL THEN
    SELECT count(*) INTO old_space_member_count
    FROM public.profiles
    WHERE space_id = caller_space_id;

    IF old_space_member_count = 1 THEN
      -- Safe to delete the now-empty space
      DELETE FROM public.spaces WHERE id = caller_space_id;
    END IF;
    -- If somehow there were already 2+ members, we leave that space alone.
  END IF;

  -- 5. Move caller into the target space
  UPDATE public.profiles
  SET space_id = target_space_id
  WHERE id = caller_id;

  -- 6. Find the partner (the other person already in the target space)
  SELECT id, display_name INTO partner_profile
  FROM public.profiles
  WHERE space_id = target_space_id
    AND id <> caller_id
  LIMIT 1;

  -- 7. Set partner_id on both profiles
  IF partner_profile.id IS NOT NULL THEN
    UPDATE public.profiles
    SET partner_id = partner_profile.id
    WHERE id = caller_id;

    UPDATE public.profiles
    SET partner_id = caller_id
    WHERE id = partner_profile.id;
  END IF;

  RETURN json_build_object(
    'space_id',              target_space_id,
    'partner_id',            partner_profile.id,
    'partner_display_name',  partner_profile.display_name
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.join_space_by_code(text) TO authenticated;
