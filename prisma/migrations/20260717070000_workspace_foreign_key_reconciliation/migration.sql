-- Reconcile Prisma workspace relations with the physical PostgreSQL schema.
-- Every tenant table carrying workspaceId must reference Workspace(id).
-- The migration fails on orphaned tenant rows instead of silently weakening
-- referential integrity.

DO $$
DECLARE
  table_record RECORD;
  constraint_name TEXT;
  orphan_count BIGINT;
BEGIN
  FOR table_record IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'workspaceId'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT IN ('WorkspaceMember')
  LOOP
    EXECUTE format(
      'SELECT COUNT(*) FROM %I tenant_row LEFT JOIN "Workspace" workspace_row ON workspace_row."id" = tenant_row."workspaceId" WHERE workspace_row."id" IS NULL',
      table_record.table_name
    ) INTO orphan_count;

    IF orphan_count > 0 THEN
      RAISE EXCEPTION '% contains % row(s) with an unknown workspaceId',
        table_record.table_name,
        orphan_count;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_constraint constraint_record
      JOIN pg_class table_class
        ON table_class.oid = constraint_record.conrelid
      JOIN pg_namespace table_namespace
        ON table_namespace.oid = table_class.relnamespace
      JOIN unnest(constraint_record.conkey) WITH ORDINALITY AS key_column(attnum, ordinal_position)
        ON TRUE
      JOIN pg_attribute attribute_record
        ON attribute_record.attrelid = table_class.oid
       AND attribute_record.attnum = key_column.attnum
      WHERE constraint_record.contype = 'f'
        AND table_namespace.nspname = 'public'
        AND table_class.relname = table_record.table_name
        AND attribute_record.attname = 'workspaceId'
    ) THEN
      CONTINUE;
    END IF;

    constraint_name := left(
      lower(regexp_replace(table_record.table_name, '([a-z0-9])([A-Z])', '\1_\2', 'g'))
        || '_workspace_id_fkey',
      63
    );

    EXECUTE format(
      'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT NOT VALID',
      table_record.table_name,
      constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %I VALIDATE CONSTRAINT %I',
      table_record.table_name,
      constraint_name
    );
  END LOOP;
END $$;
