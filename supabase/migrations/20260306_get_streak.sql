-- Migration to calculate the current daily streak of the authenticated user

create or replace function public.get_current_streak()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_space_id uuid;
    v_streak integer := 0;
    v_date date;
    v_current_date date := current_date;
    v_activity_exists boolean;
begin
    -- 1. Find the user's space_id (couple_id)
    v_space_id := public.my_space_id();
    if v_space_id is null then
        return 0;
    end if;

    -- 2. Work backward from today counting consecutive days of activity.
    -- The streak is alive if there is activity TODAY or YESTERDAY.
    -- If there's no activity today or yesterday, the streak is 0.
    
    -- Check today
    select true into v_activity_exists from (
        select date(created_at) as activity_date from public.daily_answers where couple_id = v_space_id
        union all
        select date(last_interaction_at) as activity_date from public.date_sessions where space_id = v_space_id and (status = 'completed' or is_completed = true)
        union all
        select date(created_at) as activity_date from public.widget_surprises where couple_id = v_space_id and type in ('PHOTO', 'NOTE')
    ) all_activity
    where activity_date = v_current_date
    limit 1;

    if not found then
        v_activity_exists := false;
    end if;

    if v_activity_exists then
        v_streak := 1;
        v_date := v_current_date - interval '1 day';
    else
        -- Check yesterday
        v_date := v_current_date - interval '1 day';
        select true into v_activity_exists from (
            select date(created_at) as activity_date from public.daily_answers where couple_id = v_space_id
            union all
            select date(last_interaction_at) as activity_date from public.date_sessions where space_id = v_space_id and (status = 'completed' or is_completed = true)
            union all
            select date(created_at) as activity_date from public.widget_surprises where couple_id = v_space_id and type in ('PHOTO', 'NOTE')
        ) all_activity
        where activity_date = v_date
        limit 1;

        if not found then
            return 0; -- No activity today or yesterday -> Streak broken
        else
            v_streak := 1;
            v_date := v_date - interval '1 day';
        end if;
    end if;

    -- 3. Loop backward to count continuous preceding days
    loop
        select true into v_activity_exists from (
            select date(created_at) as activity_date from public.daily_answers where couple_id = v_space_id
            union all
            select date(last_interaction_at) as activity_date from public.date_sessions where space_id = v_space_id and (status = 'completed' or is_completed = true)
            union all
            select date(created_at) as activity_date from public.widget_surprises where couple_id = v_space_id and type in ('PHOTO', 'NOTE')
        ) all_activity
        where activity_date = v_date
        limit 1;

        if not found then
            v_activity_exists := false;
        end if;

        if v_activity_exists then
            v_streak := v_streak + 1;
            v_date := v_date - interval '1 day';
        else
            exit; -- End of the streak
        end if;
    end loop;

    return v_streak;
end;
$$;
