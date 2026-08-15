---
name: supabase
description: Supabase/PostgreSQL/Auth/RLS workflow for Drip Nation.
---

# Supabase Engineering Skill

Use for database, authentication, authorization, RLS, storage, and persistent application data.

## Rules

Use migrations for schema changes.

Never expose the service-role key to browser code.

Use the publishable/anon client only where appropriate.

Protected tables require deliberate RLS policies.

Test both authorized and unauthorized access.

## Migration Workflow

1. Inspect current schema.
2. Inspect application data model.
3. Identify required tables/relationships.
4. Propose migration.
5. Review constraints and indexes.
6. Review RLS.
7. Implement migration.
8. Validate.
9. Update documentation.

## Security

Never disable RLS to solve application bugs.

Never use service-role credentials as a frontend workaround.

Authorization must be enforced at the database/server boundary.
