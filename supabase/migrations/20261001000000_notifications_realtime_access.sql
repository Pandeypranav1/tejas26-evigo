DO $$
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RAISE EXCEPTION 'Expected existing public.notifications table';
  END IF;
END
$$;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.notifications TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_read_own_rows'
  ) THEN
    EXECUTE 'CREATE POLICY notifications_read_own_rows
      ON public.notifications AS PERMISSIVE
      FOR SELECT TO authenticated
      USING ((SELECT auth.uid())::text = user_id::text)';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'notifications_owner_access_guard'
  ) THEN
    EXECUTE 'CREATE POLICY notifications_owner_access_guard
      ON public.notifications AS RESTRICTIVE
      FOR ALL TO anon, authenticated
      USING ((SELECT auth.uid())::text = user_id::text)
      WITH CHECK ((SELECT auth.uid())::text = user_id::text)';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'supabase_realtime publication is not available';
  END IF;

  IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'notifications'
    ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END
$$;