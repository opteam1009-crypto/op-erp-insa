-- 0002_rls.sql added `profiles_insert_self` back when acceptInvitation() performed a
-- client-side `profiles.upsert()` from the browser session. Migration 0003 replaced that
-- with the `accept_invitation()` SECURITY DEFINER function, which inserts into profiles as
-- the function owner and therefore bypasses RLS entirely. The policy was never removed.
--
-- Left in place it is a privilege-escalation hole: Supabase Auth will mint a session for ANY
-- Google account that completes OAuth (it knows nothing about our `invitations` table — only
-- our app code checks that). Such a user can then call `POST /rest/v1/profiles` directly with
-- `{ id: <their own uid>, email: ..., role: 'admin' }`. The policy's `with check (id = auth.uid())`
-- is satisfied and `role` is completely unconstrained, so the row is accepted and the caller is
-- now an admin — bypassing the invitation flow altogether.
--
-- Nothing in the app inserts into `profiles` directly anymore (verified: lib/auth/invitations.ts
-- only calls the `accept_invitation()` RPC), so dropping this policy breaks no code path.
drop policy "profiles_insert_self" on profiles;

-- While we're here: `profiles` has SELECT (profiles_select_self) and UPDATE (profiles_admin_write)
-- policies but no DELETE policy, so a bad profile row could only ever be removed from the SQL
-- editor / service role. Give admins a DELETE path through the API too.
create policy "profiles_delete_admin" on profiles for delete using (current_user_role() = 'admin');
