# Restaurant Platform

QR-first restaurant ordering platform with customer ordering, Cashfree UPI payments, staff order management, and owner analytics.

## Stack

- React + Vite + TypeScript
- Node.js + Express
- PostgreSQL + Prisma
- Cashfree Payment Gateway (UPI)

## Prerequisites

- Node.js
- PostgreSQL

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env
```

Set `DATABASE_URL` in `apps/api/.env`.

Then:

```bash
npm run prisma:generate --workspace apps/api
npm run prisma:migrate --workspace apps/api -- --name init
npm run dev
```

Web: http://localhost:5173
API: http://localhost:4000
Health: http://localhost:4000/health

## Next milestone

- Seed restaurant/owner/staff data
- Add authentication and RBAC
- Build menu/category management
- Build customer menu/cart
- Integrate Cashfree sandbox
- Add webhook verification
- Add order QR and staff scanner
