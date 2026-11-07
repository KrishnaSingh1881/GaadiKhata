create or replace function app_private.notify_new_work()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  actor text := coalesce(new.created_by, '');
  work_label text := coalesce(nullif(new.data->>'work_type',''), 'work');
  client_label text := null;
begin
  if new.kind <> 'work' or new.state = 'cancelled' then
    return new;
  end if;
  select nullif(trim(data->>'name'),'') into client_label
  from public.business_records
  where id = nullif(new.data->>'client_id','')::uuid and kind = 'client';
  insert into public.notifications(recipient,event_type,record_id,title)
    select m.clerk_subject, 'work_created', new.id,
      'New ' || work_label || ' work recorded' || case when client_label is not null then ' for ' || client_label else '' end
    from public.app_members m
    where m.active and m.role = 'business_user' and m.clerk_subject <> actor;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists notify_new_work on public.business_records;
create trigger notify_new_work
  after insert on public.business_records
  for each row execute function app_private.notify_new_work();
