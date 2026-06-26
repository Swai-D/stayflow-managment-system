# Developer / API Integration

This document explains how external systems (accounting software, channel managers, CRMs, custom dashboards, or future AI agents) can integrate with Buffalo Hotel securely.

## Overview

Buffalo Hotel exposes two integration mechanisms:

1. **Public REST API** — pull data using API keys.
2. **Webhooks** — receive push notifications when events happen.

Both are managed from the dashboard under **Developer → API Keys / Webhooks**.

## Public API

### Base URL

```
http://localhost:5000/api/v1/ext
```

In production, replace the host with your deployed API URL.

### Authentication

Every request must include a valid API key in one of these headers:

```bash
curl http://localhost:5000/api/v1/ext/bookings \
  -H "Authorization: Bearer sf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

or

```bash
curl http://localhost:5000/api/v1/ext/bookings \
  -H "X-API-Key: sf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

API keys are generated in the dashboard. The raw key is shown only once. The backend stores a SHA-256 hash of the key.

### Scopes

When creating a key, you assign scopes. Scopes restrict what the key can access:

- `bookings:read`, `bookings:write`
- `guests:read`, `guests:write`
- `rooms:read`
- `payments:read`
- `invoices:read`
- `store:read`
- `webhooks:read`, `webhooks:write`
- `api_keys:read`, `api_keys:write`
- `admin` — bypasses all scope checks

The public API currently enforces `bookings:read`, `guests:read`, `rooms:read`, `invoices:read`, and `payments:read` implicitly on the relevant endpoints.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/bookings` | List bookings (max 100) |
| GET | `/bookings/:id` | Booking details with charges, payments, guests |
| GET | `/guests` | List guests |
| GET | `/rooms` | List rooms |
| GET | `/availability?checkIn=&checkOut=` | Available rooms between dates |
| GET | `/invoices` | List invoices |
| GET | `/payments` | List payments |

All responses follow the same envelope:

```json
{
  "success": true,
  "data": [...],
  "message": "OK"
}
```

### Rate Limiting

Public API routes are rate-limited to **100 requests per minute per IP**. Exceeding the limit returns `429 Too Many Requests`.

### Security

- API keys are hashed with SHA-256; only the prefix is readable.
- Keys can be revoked or deleted from the dashboard.
- Keys can have an expiration date.
- Every request is logged in `ApiLog`.

## Webhooks

### What triggers a webhook

The following events are dispatched:

- `booking.created`
- `booking.updated`
- `booking.checked_in`
- `booking.checked_out`
- `booking.cancelled`
- `payment.received`
- `invoice.paid`
- `room_charge.created`

### Webhook payload format

```json
{
  "event": "booking.checked_in",
  "timestamp": "2026-06-26T10:30:00.000Z",
  "data": { ...booking object... }
}
```

### Signature verification

If a webhook has a secret, Buffalo Hotel signs the payload with HMAC-SHA256:

```
X-Buffalo-Hotel-Signature: <hex signature>
```

Verify it in your receiver:

```javascript
const crypto = require('crypto');

const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== req.headers['x-buffalo-hotel-signature']) {
  return res.status(401).send('Invalid signature');
}
```

### Delivery & retries

- Webhooks are sent asynchronously (fire-and-forget).
- Failed deliveries are retried up to 3 times with exponential backoff.
- Delivery history is stored in `WebhookDelivery` and visible in the dashboard.

## Adding new public endpoints

1. Add the route in `apps/api/src/routes/public-api.routes.ts`.
2. Enforce scopes by passing required scopes to `apiKeyAuth(['scope:name'])`.
3. Keep endpoints read-only unless there is a clear write scope.
4. Never return internal IDs, password hashes, or secrets.

## Database models

- `ApiKey` — stored API keys.
- `Webhook` — configured webhooks.
- `WebhookDelivery` — delivery attempts.
- `ApiLog` — public API request audit trail.

## Future considerations

- For high-volume integrations, consider adding pagination cursors and ETags.
- For write access, add request validation and idempotency keys.
- For long-term API stability, version the public API (`/api/v2/ext`).
