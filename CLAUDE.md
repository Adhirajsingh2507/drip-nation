# Drip Nation — Claude Code Engineering Contract

## Project Identity

Drip Nation is a premium streetwear e-commerce platform.

The current application is a static HTML/CSS/JavaScript prototype being migrated toward a production-grade commerce architecture.

Brand positioning:

> Where athletic heritage meets the culture of tomorrow.

The existing visual identity, interactions, typography, imagery, and editorial character are important product assets.

Do not replace the existing visual direction merely because a different implementation is technically easier.

---

# 1. Current Architecture

The current repository is primarily:

- Static HTML
- CSS
- Vanilla JavaScript
- localStorage-backed prototype data
- Supabase migration work in progress
- Vercel deployment artifacts
- Client-side cart
- Prototype admin panel

Important current files:

- `index.html`
- `shop.html`
- `category.html`
- `product.html`
- `cart.html`
- `admin.html`
- `retro-jersey.html`
- `accessories.html`
- `jackets.html`
- `track-and-suit.html`
- `assets/css/styles.css`
- `assets/js/`
- `js/`
- `supabase/migrations/`
- `docs/backend-migration-plan.md`

There are currently duplicate JavaScript directories:

- `js/`
- `assets/js/`

Do not assume they are identical.

Before modifying JavaScript architecture, determine which files are actually loaded by each HTML page.

---

# 2. Target Architecture

The intended production architecture is:

Frontend
→ Supabase-backed application
→ PostgreSQL
→ Supabase Auth
→ Supabase Storage
→ payment provider
→ transactional email

Supabase should provide:

- PostgreSQL
- Authentication
- Row Level Security
- Storage
- server-side data persistence

The browser must never become the authoritative source of:

- prices
- inventory
- discounts
- order totals
- payment status
- admin authorization

---

# 3. Source of Truth

Production source of truth:

| Domain | Source of truth |
|---|---|
| Products | PostgreSQL |
| Categories | PostgreSQL |
| Variants | PostgreSQL |
| Inventory | PostgreSQL |
| Promotions | PostgreSQL |
| Users | Supabase Auth |
| Profiles | PostgreSQL |
| Orders | PostgreSQL |
| Payments | Payment provider + PostgreSQL |
| Cart | Client-side initially |
| Admin permissions | Auth + database authorization |
| Product media | Supabase Storage/CDN |

localStorage may be used for temporary client UX such as a shopping cart.

It must not be treated as trusted persistent business data.

---

# 4. Non-Negotiable Security Rules

Never:

- expose Supabase service-role credentials to the browser
- trust client-provided prices
- trust client-provided discounts
- trust client-provided inventory
- trust client-provided order totals
- authorize administrators solely through frontend JavaScript
- accept a client-side "payment successful" value as payment confirmation
- bypass Row Level Security for convenience
- disable authentication to simplify development
- commit secrets
- commit `.env.local`
- print secrets in logs
- store payment secrets in frontend code

All sensitive operations must be server-authoritative.

---

# 5. E-Commerce Invariants

The following distinctions must always be preserved:

Cart != Order

Checkout request != Payment success

Payment success != Fulfillment

Displayed inventory != Inventory reservation

A checkout flow must validate server-side:

1. Product existence
2. Product availability
3. Variant availability
4. Current price
5. Quantity limits
6. Promotion validity
7. Promotion usage limits
8. Shipping rules
9. Tax rules where applicable
10. Final order amount

Never calculate the authoritative order total exclusively in browser JavaScript.

---

# 6. Payment Architecture

Payment integration must follow:

Customer
→ Checkout request
→ Server validation
→ Server calculates order
→ Payment order/session creation
→ Payment provider
→ Provider callback/webhook
→ Signature verification
→ Idempotent payment processing
→ Order state transition
→ Inventory update
→ Confirmation email

Never mark an order as paid solely because the browser reports success.

Payment webhooks must be:

- signature verified
- idempotent
- replay-safe
- logged
- associated with the correct order

---

# 7. Database Rules

Database changes must use migrations.

Never modify production schema manually when the change should be represented by a migration.

Every migration must consider:

- primary keys
- foreign keys
- uniqueness
- indexes
- nullability
- defaults
- constraints
- RLS
- rollback/mitigation
- data migration requirements

Destructive schema operations require explicit approval.

Examples:

- DROP TABLE
- DROP COLUMN
- destructive UPDATE
- destructive DELETE
- replacing production data
- disabling RLS

---

# 8. Authentication and Authorization

Authentication and authorization are different concerns.

Authentication answers:

"Who is this user?"

Authorization answers:

"What is this user allowed to do?"

Admin access must be enforced server-side/database-side.

The frontend may hide controls for UX, but hiding a button is never an authorization mechanism.

---

# 9. Development Workflow

Before changing code:

1. Inspect relevant files.
2. Identify dependencies.
3. Determine current behavior.
4. Determine intended behavior.
5. Check applicable rules.
6. Check relevant skills.
7. Identify architectural impact.
8. Produce a concise implementation plan.

For low-risk changes, proceed after inspection.

For high-risk changes, stop after planning and request approval.

High-risk changes include:

- authentication
- authorization
- RLS
- payments
- order lifecycle
- inventory
- database migrations
- secrets
- production deployment
- infrastructure changes
- major architectural rewrites

---

# 10. Change Philosophy

Prefer:

- incremental migration
- small changes
- reversible changes
- existing functionality preservation
- explicit interfaces
- boring reliable architecture

Avoid:

- unnecessary rewrites
- framework migration without justification
- introducing dependencies without need
- changing visual behavior while fixing backend problems
- speculative abstractions
- premature microservices

Do not convert the project to React/Next.js/etc. merely because it is fashionable.

Architecture changes require a concrete benefit.

---

# 11. Frontend Rules

Preserve the existing Drip Nation visual identity unless the task explicitly changes it.

Do not:

- replace the design with generic SaaS UI
- introduce generic dashboard aesthetics
- destroy existing animations
- remove editorial interactions
- arbitrarily change typography
- replace existing imagery
- introduce excessive component abstraction

Frontend changes must consider:

- mobile
- tablet
- desktop
- keyboard navigation
- accessibility
- reduced motion
- loading states
- error states
- empty states

---

# 12. Testing

A change is not complete merely because the code compiles.

Where applicable:

- run lint
- run type checks
- run unit tests
- run integration tests
- run browser/E2E tests
- verify responsive behavior
- verify security-sensitive paths
- verify database behavior

For commerce features, test failure cases, not only happy paths.

Examples:

- invalid product
- unavailable product
- quantity exceeds inventory
- expired promo
- invalid promo
- duplicate payment webhook
- payment failure
- abandoned checkout
- unauthorized admin request

---

# 13. Git Rules

Never run destructive Git operations without explicit approval.

Never use:

- `git reset --hard`
- destructive history rewriting
- force push

unless explicitly authorized.

Before significant work:

- inspect `git status`
- inspect current branch
- inspect relevant diff

Keep commits logically scoped.

Do not mix:

- UI redesign
- database migration
- payment integration
- unrelated cleanup

into one opaque change.

---

# 14. Secrets

Treat the following as secrets:

- API keys
- database credentials
- service-role keys
- payment secrets
- webhook secrets
- OAuth tokens
- Vercel tokens
- deployment credentials

Never include secret values in:

- source files
- commits
- documentation
- screenshots
- logs
- test fixtures

If a suspected secret is found in Git history, stop and report it.

Do not simply delete the current file and assume the secret is gone.

---

# 15. Existing Skills

The repository already contains a large Claude Code skill library.

Do not recreate an existing skill.

Before implementing a task, check whether an applicable skill already exists.

Particularly relevant existing skills include:

- frontend design
- web design guidelines
- accessibility
- responsive design
- visual QA
- webapp testing
- Vercel optimization
- deployment
- design audit
- security
- architecture
- SEO

Project-specific skills live under:

`.claude/skills/`

---

# 16. Agent Delegation

Use specialized agents when the task crosses their domain.

Architect:
- architecture
- migrations
- system design
- tradeoffs

Backend:
- APIs
- business logic
- server-side validation

Database:
- schema
- migrations
- indexes
- RLS

Security:
- authentication
- authorization
- secrets
- threat modeling
- security review

DevOps:
- deployment
- infrastructure
- environments

Art Director:
- visual system
- interaction
- design consistency

SEO:
- metadata
- indexing
- structured data

Code Reviewer:
- independent implementation review
- regression analysis
- maintainability
- security issues

Do not delegate trivial changes merely for ceremony.

---

# 17. Review Requirement

High-risk implementations require independent review.

Preferred workflow:

Architect
→ Implementing agent
→ Tests
→ Security review
→ Code review

The reviewer should assume the implementation may contain mistakes.

---

# 18. Documentation

Important architectural decisions must be documented under:

`docs/decisions/`

Architecture documentation:

`docs/architecture/`

Database documentation:

`docs/database/`

API documentation:

`docs/api/`

Security audits:

`docs/audits/`

Do not create documentation for trivial changes.

---

# 19. Current Migration Objective

The immediate engineering objective is:

Prototype
→ Real persistent backend
→ Secure administration
→ Real checkout
→ Persistent orders
→ Inventory correctness
→ Production hardening

Do not attempt to implement every feature simultaneously.

Prioritize correctness and security over feature count.

---

# 20. Definition of Done

A feature is complete only when:

- implementation works
- existing functionality remains intact
- relevant tests pass
- security implications are reviewed
- database changes are migrated correctly
- errors are handled
- documentation is updated when necessary
- no secrets are exposed
- the final diff is understood

When reporting completion, state:

1. What changed
2. Why
3. Files changed
4. Tests run
5. Security considerations
6. Remaining risks

