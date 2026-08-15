# Core Engineering Rules

Inspect before editing.

Do not guess repository behavior.

Do not make architectural changes merely because another architecture is more familiar.

Prefer the smallest correct change.

Preserve existing behavior unless the task explicitly changes it.

Never hide failures.

Never silently weaken security to make development easier.

For high-risk changes, plan first and request approval before implementation.

High-risk domains:

- authentication
- authorization
- RLS
- payments
- orders
- inventory
- database migrations
- secrets
- production deployment
