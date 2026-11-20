# FixMate — Server (Express API)

The REST API for FixMate, a smart device & home appliance repair service platform. It serves the Next.js client, verifies Better Auth JWTs on protected routes, enforces the booking status pipeline and business rules, and handles Stripe payments.

## Live API

- **Base URL:** https://fix-mate-server-fghr.vercel.app
- **Client site:** https://fix-mate-client-fghr.vercel.app

## Key Features

- **JWT verification** against the client's Better Auth JWKS (`jose`), with role middlewares: `verifyCustomer`, `verifyTechnician`, `verifyAdmin` (401 without a token, 403 for the wrong role)
- **Services API** — public list with server-side search, filters, sorting and pagination; featured services; details with technician summary, average rating and reviews; technician CRUD (edits return a service to pending approval)
- **Bookings API** — create requests with server-side guards (no duplicate active request for the same service, problem description 20–500 characters), customer cancel only while `requested`, technician status pipeline (`requested → accepted → in-progress → completed` / `rejected`) with a `statusHistory` entry for every change
- **Payments API** — Stripe Checkout sessions created from the booking's final amount; payment verified on the success page and saved exactly once, storing the Stripe payment intent id (`transactionId`) and session id (`stripeSessionId`); Stripe webhook (`checkout.session.completed`) confirms payment on the server too
- **Reviews** — one review per paid booking (rating 1–5 + optional text)
- **Admin API** — service approval/rejection, user role management (admin cannot change their own role), all bookings, all transactions with total revenue
- **Stats API** — per-role dashboard numbers, including bookings grouped by status for the admin chart
- **Seed script** (`seed.js`) — demo services across all 7 categories and bookings in every status

## Tech Stack

- Node.js + Express 5 (JavaScript, ES modules)
- MongoDB (native driver) — database `fix-mate`, collections: `user`, `services`, `bookings`, `payments`
- Stripe (Checkout)
- jose (JWT verification)

## Main NPM Packages

- `express`
- `mongodb`
- `cors`
- `dotenv`
- `jose`
- `stripe`

## API Overview

| Method | Route                              | Access     | Description                              |
| ------ | ---------------------------------- | ---------- | ---------------------------------------- |
| GET    | /api/services                      | Public     | Search, filter, sort, paginate services  |
| GET    | /api/services/featured             | Public     | Latest 6 services for the home page      |
| GET    | /api/services/:id                  | Public     | Service details + technician + reviews   |
| POST   | /api/services                      | Technician | Add a service (starts as pending)        |
| PATCH  | /api/services/:id                  | Technician | Edit own service (back to pending)       |
| PATCH  | /api/services/:id/availability     | Technician | Toggle availability                      |
| DELETE | /api/services/:id                  | Technician | Delete own service                       |
| POST   | /api/bookings                      | Customer   | Send a repair request                    |
| GET    | /api/bookings/my                   | Customer   | My bookings                              |
| PATCH  | /api/bookings/:id/cancel           | Customer | Cancel while requested                   |
| GET    | /api/bookings/technician           | Technician | Requests assigned to me                  |
| PATCH  | /api/bookings/:id/status           | Technician | Move through the status pipeline         |
| PATCH  | /api/bookings/:id/review           | Customer   | Review a paid booking                    |
| POST   | /api/payments/create-checkout-session | Customer | Create a Stripe Checkout session         |
| GET    | /api/payments/verify               | Customer   | Verify payment and save it once          |
| POST   | /api/payments/webhook              | Stripe     | Webhook confirms payment (checkout.session.completed) |
| GET    | /api/payments/my                   | Customer   | My payment history                       |
| GET    | /api/admin/services/pending        | Admin      | Services waiting for approval            |
| PATCH  | /api/admin/services/:id/approval   | Admin      | Approve or reject a service              |
| GET    | /api/admin/users                   | Admin      | All users                                |
| PATCH  | /api/admin/users/:id/role          | Admin      | Change a user's role                     |
| GET    | /api/admin/bookings                | Admin      | All bookings                             |
| GET    | /api/admin/payments                | Admin      | All transactions                         |
| GET    | /api/stats/customer                | Customer   | Customer dashboard numbers               |
| GET    | /api/stats/technician              | Technician | Technician dashboard numbers             |
| GET    | /api/stats/admin                   | Admin      | Platform numbers + bookings by status    |

## Getting Started (Local)

```bash
npm install
npm run dev
```

Create a `.env` file with:

```env
PORT=5000
MONGODB_URI=
CLIENT_URL=http://localhost:3000
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Optional seed data:

```bash
node seed.js
```
