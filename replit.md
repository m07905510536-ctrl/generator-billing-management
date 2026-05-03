# مولدتي - Workspace

## Overview

Full-stack Arabic RTL PWA for managing Iraqi private neighborhood electricity generators. Built as a pnpm monorepo with a React + Vite frontend and an Express 5 + PostgreSQL backend.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: express-session + bcryptjs
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion
- **UI components**: shadcn/ui (Radix-based)
- **Charts**: Recharts
- **PWA**: vite-plugin-pwa with offline support

## Applications

- `artifacts/mawlidati` — Main React PWA (Arabic RTL, served at `/`)
- `artifacts/api-server` — Express REST API (served at `/api`)

## Database Schema

- `users` — id, name, username, password_hash, role (owner/admin/worker), assigned_generator_id
- `generators` — id, name, location, price_per_ampere_iqd, owner_id
- `subscribers` — id, name, breaker_owner_name, phone_number, generator_id, default_amperes, status (active/paused)
- `invoices` — id, subscriber_id, generator_id, worker_id, amperes, previous_debt, amount_expected, amount_received, month_year, status (paid/partial/unpaid), notes
- `expenses` — id, generator_id, expense_type, amount, date, notes

## Seed Credentials

- **Owner**: username `admin`, password `admin123`
- **Worker**: username `worker1`, password `worker123`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Features

- **RBAC**: Owner (full access + financial data), Admin (management), Worker (data entry + receipts only)
- **Bulk Invoice Generation**: Auto-generate monthly invoices for all active subscribers
- **Offline PWA**: Service worker with NetworkFirst (API) + CacheFirst (assets) strategies
- **Thermal Printing**: 58mm/80mm receipt component with QR code placeholder
- **Arabic RTL**: Full Arabic UI with Noto Sans Arabic, IQD currency formatting
- **Dark Mode**: Toggle for night-time collection shifts
- **Status Colors**: Green (paid), Amber (partial), Red (unpaid)

## RBAC Notes

- Workers can only see their own recent transactions, not total revenue
- Bulk invoice generation requires Owner or Admin role
- Expenses management requires Owner or Admin role

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
