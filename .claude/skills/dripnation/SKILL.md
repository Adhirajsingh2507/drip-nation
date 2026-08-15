---
name: dripnation
description: Project-specific architecture, conventions, migration strategy, and engineering context for the Drip Nation e-commerce application.
---

# Drip Nation Project Skill

Use this skill whenever modifying Drip Nation architecture, commerce functionality, Supabase integration, or major frontend behavior.

## Current State

The project is a static HTML/CSS/JavaScript prototype.

localStorage currently acts as the prototype persistence layer.

Important areas:

- `assets/js/store-bridge.js`
- `js/store-bridge.js`
- `assets/js/cart.js`
- `js/cart.js`
- `admin.html`
- `product.html`
- `cart.html`
- `supabase/migrations/`
- `docs/backend-migration-plan.md`

## Critical Migration Issue

There are duplicate JavaScript directories:

`js/`

and

`assets/js/`

Before modifying shared JavaScript, inspect which version each page loads.

Do not delete either directory until references have been mapped.

## Target

Move persistent business data to Supabase.

Keep the frontend visual experience stable while replacing persistence and business logic incrementally.

## Migration Principle

Do not perform a full rewrite unless explicitly requested.

Prefer:

prototype layer
→ adapter
→ real backend
→ remove obsolete localStorage behavior

## Business Truth

The browser is never authoritative for:

- price
- inventory
- promotions
- order total
- payment state
- admin privileges
