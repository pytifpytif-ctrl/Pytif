-- Production M-Pesa fee bands (Safaricom June 2026) and Jiokoe service model.
-- B2C fees are collected upfront at deposit; Jiokoe service fee is Ksh 10 per active day (app layer).

create or replace function public.mpesa_fee(amount integer)
returns integer language sql immutable as $$
  select case
    when amount <= 0     then 0
    when amount <= 100   then 0
    when amount <= 500   then 7
    when amount <= 1000  then 13
    when amount <= 1500  then 23
    when amount <= 2500  then 33
    when amount <= 3500  then 53
    when amount <= 5000  then 57
    when amount <= 7500  then 78
    when amount <= 10000 then 90
    when amount <= 15000 then 100
    when amount <= 20000 then 105
    else 108
  end;
$$;

-- Per-send B2C fee on outgoing disbursements (Jiokoe service fee is not per transaction).
create or replace function public.send_fee(amount integer)
returns integer language sql immutable as $$
  select public.mpesa_fee(amount);
$$;

comment on function public.mpesa_fee(integer) is
  'Safaricom send-money / B2C fee bands (June 2026). Capped at Ksh 108 above Ksh 20,000.';

comment on function public.send_fee(integer) is
  'Per-send B2C fee. Jiokoe service fee (Ksh 10/active day) is collected at deposit in the app layer.';
