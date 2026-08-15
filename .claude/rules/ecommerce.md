# E-Commerce Rules

The browser is an untrusted client.

## Important Distinctions

Cart != Order

Checkout request != Order

Payment success UI != Verified payment

Displayed stock != Reserved stock

Order paid != Order fulfilled

## Authoritative Data

The server/database determines:

- product existence
- product price
- sale price
- valid quantity
- inventory
- promotion eligibility
- discount
- shipping
- tax where applicable
- final order total

Never trust client-provided values for these fields.

## Checkout

Preferred flow:

Client
→ Edge Function
→ validate request
→ fetch current product data
→ validate stock
→ validate promotions
→ calculate authoritative total
→ create order
→ create payment
→ return payment information

## Payment

Payment confirmation must come from a verified provider callback/webhook.

Webhook processing must be:

- authenticated
- signature verified
- idempotent
- replay-safe
- linked to the expected order

A browser callback alone must never mark an order as paid.

## Inventory

Inventory must not become negative.

Concurrent checkout attempts must be handled safely.

Inventory mutation must occur inside an appropriate transactional boundary.

## Promotions

Validate:

- code
- status
- expiry
- minimum order
- maximum uses
- current usage
- discount bounds

Usage must be persisted atomically.

## Orders

Orders must retain immutable purchase snapshots:

- product name
- purchased price
- selected variant/size
- quantity

Later product edits must not rewrite historical order data.

## Refunds

Refund logic must be distinct from cancellation logic.

A refund must not silently restore stock unless the business rule explicitly requires it.

## Guest Checkout

Guest checkout may be supported.

If customer accounts are introduced later, orders should have a clear ownership/linkage strategy.

## Failure Cases

Test:

- invalid product
- unavailable product
- excessive quantity
- invalid promo
- expired promo
- exhausted promo
- payment failure
- payment retry
- duplicate webhook
- cancelled payment
- concurrent checkout
