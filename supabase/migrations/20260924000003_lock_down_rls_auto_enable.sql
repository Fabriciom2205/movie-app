-- rls_auto_enable() is Supabase's helper behind "automatically enable RLS on
-- new tables". It runs from an event trigger, which doesn't need callers to
-- have EXECUTE. Nobody should call it through the API, so remove that access.
-- (Silences the "SECURITY DEFINER function executable" advisor warnings.)

revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
