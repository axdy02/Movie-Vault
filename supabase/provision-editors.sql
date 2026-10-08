-- Run only from a trusted SQL editor/admin context AFTER creating the two
-- confirmed password accounts in Supabase Auth. Keep signup disabled. Never run
-- in the browser. Invitation/password onboarding is not implemented by this app.
-- Replace both UUIDs and names with the existing Auth users. These placeholders
-- intentionally cause an FK failure until real created account IDs are provided.
begin;
insert into public.profiles(id, display_name, editor_slot)
values ('00000000-0000-0000-0000-000000000001', 'Editor A', 1),
       ('00000000-0000-0000-0000-000000000002', 'Editor B', 2);
commit;
