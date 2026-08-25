create or replace function accept_invitation() returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_existing_role user_role;
  v_invitation invitations%rowtype;
begin
  select role into v_existing_role from profiles where id = auth.uid();

  if found then
    return v_existing_role;
  end if;

  select * into v_invitation from invitations where email = v_email and status = 'pending';

  if not found then
    return null;
  end if;

  insert into profiles (id, email, role)
  values (auth.uid(), v_email, v_invitation.role);

  update invitations set status = 'accepted' where id = v_invitation.id;

  return v_invitation.role;
end;
$$;

grant execute on function accept_invitation() to authenticated;
