create or replace function accept_invitation() returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_invitation invitations%rowtype;
begin
  select * into v_invitation from invitations where email = v_email and status = 'pending';

  if not found then
    return null;
  end if;

  insert into profiles (id, email, role)
  values (auth.uid(), v_email, v_invitation.role)
  on conflict (id) do update set role = excluded.role, email = excluded.email;

  update invitations set status = 'accepted' where id = v_invitation.id;

  return v_invitation.role;
end;
$$;

grant execute on function accept_invitation() to authenticated;
