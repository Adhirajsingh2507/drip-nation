---
name: production-readiness
description: Production-readiness audit for Drip Nation before public commerce launch.
---

# Production Readiness

Audit:

## Security

- authentication
- authorization
- RLS
- secrets
- API exposure
- input validation
- rate limiting
- payment verification

## Data

- database constraints
- backups
- migrations
- inventory correctness
- order persistence

## Frontend

- responsive behavior
- accessibility
- loading states
- error states
- image optimization
- SEO

## Commerce

- checkout
- payment
- webhooks
- refunds
- order state
- inventory

## Operations

- logging
- monitoring
- deployment
- environment separation
- rollback strategy

Do not declare the application production-ready merely because the homepage works.
