create function public.random_available_deal(p_exclude_id uuid default null)
returns setof public.deals
language sql
set search_path = ''
as $$
  select d.*
  from public.deals d
  where d.is_active
    and d.stock > 0
    and (p_exclude_id is null or d.id <> p_exclude_id)
  order by random()
  limit 1;
$$;

revoke all on function public.random_available_deal(uuid) from public, anon, authenticated;
grant execute on function public.random_available_deal(uuid) to service_role;
