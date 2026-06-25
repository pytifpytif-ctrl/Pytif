-- ===========================================================================
--  Per-day send slots
-- ---------------------------------------------------------------------------
--  Until now every active day shared the same set of send slots. This adds an
--  optional `day_key` to each slot so a schedule can have different times and
--  amounts on different days:
--    * SPECIFIC_DAYS : day_key = ISO weekday as text ('1'..'7', Mon..Sun)
--    * CUSTOM_DATES  : day_key = the date key 'YYYY-MM-DD'
--    * uniform/every-day : day_key IS NULL (applies to every active day)
-- ===========================================================================

alter table public.send_slots
  add column if not exists day_key text;

-- ---------- Activate schedule + pre-generate transactions (per-day aware) ----------
-- A slot fires on a given day when it is uniform (day_key is null) or its
-- day_key matches that day's weekday (SPECIFIC_DAYS) or date (CUSTOM_DATES).
create or replace function public.activate_schedule(p_schedule_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s            public.schedules%rowtype;
  d            date;
  slot         public.send_slots%rowtype;
  iso_dow      int;
begin
  select * into s from public.schedules where id = p_schedule_id for update;
  if not found then raise exception 'schedule % not found', p_schedule_id; end if;

  -- Avoid double-generation.
  if exists (select 1 from public.transactions where schedule_id = p_schedule_id) then
    return;
  end if;

  if s.pattern = 'CUSTOM_DATES' then
    foreach d in array s.active_dates loop
      for slot in
        select * from public.send_slots
        where schedule_id = s.id and is_active
          and (day_key is null or day_key = to_char(d, 'YYYY-MM-DD'))
      loop
        insert into public.transactions(schedule_id, slot_id, user_id, label, amount, fee, status, scheduled_for)
        values (s.id, slot.id, s.user_id, slot.label, slot.amount, slot.fee, 'PENDING',
                ((d + slot.send_time) at time zone 'Africa/Nairobi'));
      end loop;
    end loop;
  else
    d := s.start_date;
    while d <= s.end_date loop
      iso_dow := extract(isodow from d);  -- 1=Mon..7=Sun
      if s.pattern = 'EVERY_DAY' or iso_dow = any(s.active_days) then
        for slot in
          select * from public.send_slots
          where schedule_id = s.id and is_active
            and (day_key is null or day_key = iso_dow::text)
        loop
          insert into public.transactions(schedule_id, slot_id, user_id, label, amount, fee, status, scheduled_for)
          values (s.id, slot.id, s.user_id, slot.label, slot.amount, slot.fee, 'PENDING',
                  ((d + slot.send_time) at time zone 'Africa/Nairobi'));
        end loop;
      end if;
      d := d + 1;
    end loop;
  end if;

  update public.schedules set status = 'ACTIVE' where id = p_schedule_id;
end;
$$;
