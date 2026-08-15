---
name: payments
description: Secure payment architecture and payment-provider integration for Drip Nation.
---

# Payments Skill

Payment integration is security-sensitive.

## Required Flow

Client cart
→ server checkout request
→ validate products
→ validate inventory
→ validate promotions
→ calculate authoritative total
→ create payment
→ payment provider
→ verified webhook
→ idempotent order update

## Never

Never trust:

- client amount
- client payment status
- client transaction status

Never expose payment secrets in browser code.

## Webhooks

Every payment webhook must:

- verify authenticity/signature
- identify the corresponding order
- be idempotent
- safely handle retries
- log useful non-sensitive information
- produce deterministic state transitions
