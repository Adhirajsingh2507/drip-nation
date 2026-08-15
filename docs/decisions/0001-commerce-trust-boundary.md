# ADR-0001 — Commerce Trust Boundary

## Status

Accepted

## Context

The original Drip Nation implementation uses browser localStorage as its persistence layer.

This is unsuitable as the authoritative source for production commerce.

## Decision

The browser is an untrusted client.

Authoritative commerce operations occur through trusted server-side boundaries.

### Client may provide

- product identifiers
- quantities
- selected sizes/variants
- promo code
- customer checkout details

### Server must determine

- product validity
- current price
- inventory
- promotion validity
- discount
- shipping
- final total
- order state
- payment state

## Checkout

Use a Supabase Edge Function or tightly controlled database transaction for checkout creation.

Do not allow anonymous clients to directly create authoritative orders through the exposed Data API.

## Payment

Payment provider webhooks are the authoritative payment confirmation mechanism.

## Inventory

Inventory changes must be concurrency-safe and must prevent negative stock.

## Authorization

Administrative access is enforced through Supabase Auth, JWT claims, and RLS.

## Consequences

This adds server-side complexity but prevents:

- price manipulation
- fake orders
- unauthorized administrative writes
- promo abuse
- stock corruption
- false payment confirmation
