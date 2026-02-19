# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sugar Mama Cookie Co. — a custom cookie ordering web app for a bakery in Albury-Wodonga, Australia. Customer-facing storefront + admin portal for order management.

## Commands

```bash
npm run dev       # Vite dev server
npm run build     # Production build (vite build)
npm run lint      # ESLint (flat config with typescript-eslint, react-hooks, react-refresh)
npm run preview   # Preview production build
```

No test framework is configured.

## Tech Stack

React 18 + TypeScript + Vite 5 + Tailwind CSS 3 + Supabase (Postgres, Auth, Storage, Edge Functions). State management via Zustand (cart only). Animations with Framer Motion. Notifications with react-hot-toast. Icons from lucide-react.

## Architecture

### Routing (src/App.tsx)

Public routes: `/` (Home), `/gallery`, `/quote-builder`, `/cart`, `/checkout`, `/login`
Admin routes (wrapped in `<ProtectedRoute>`): `/admin` (redirects to /admin/orders), `/admin/orders`, `/admin/users`

### Supabase Clients (src/lib/supabase.ts)

Two clients are exported:
- `supabase` — anon key, respects RLS, used for public operations
- `supabaseAdmin` — service role key, bypasses RLS, used for admin operations

**Note:** The service role key is exposed client-side via `VITE_SUPABASE_SERVICE_ROLE_KEY`. This is the existing pattern; admin operations are done browser-side.

### Data Flow

- **Customer flow:** Home → Quote Builder → order submitted to `orders` table → admin reviews in Orders page → admin sends notification email
- **Pricing:** Fetched from `pricing_settings` table. Base price with bulk discount tiers (12+, 24+, 50+ cookies). `QuoteBuilder.tsx` fetches from DB; `OrderModal.tsx` has hardcoded fallbacks.
- **Data fetching:** Direct `useEffect` + `try/catch` with local `loading`/`error` state. No React Query or SWR.

### Key Database Tables

- `orders` — primary business table (status: pending/confirmed/in_progress/completed/cancelled, display_order_id like QU001)
- `order_items` — line items per order
- `products` — product catalog (not surfaced in main customer flow)
- `pricing_settings` — base_price + discount tiers (discount_12, discount_24, discount_50)
- `customers` — customer records linked to auth.users

### Auth

Supabase email+password auth. Admin check: `raw_user_meta_data->>'is_admin' = 'true'`. SQL RPC functions `toggle_user_admin` and `delete_user` are called from the Users page.

### Edge Functions (supabase/functions/)

Deno runtime, use Resend API for transactional emails:
- `send-order-notification` — customer confirmation email with HTML template (supports placeholders like `{{customer_name}}`, `{{ORDER_NUMBER}}`)
- `send-admin-new-order-alert` — notifies admin of new orders
- `send-admin-reminder` — admin reminders
- `send-contact-email` / `handle-contact-form` — contact form processing

### Storage Buckets

- `Gallery` — public bucket for cookie gallery images (HEIC filtered out client-side)
- `Images` — public bucket for product images

## Conventions

- All pages/components use `export default function`
- `src/lib/` uses named exports
- Tailwind for all styling; brand color is sage green (`#ACC0B9`, also `sage-*` scale in tailwind.config.js)
- Font: Playfair Display (Google Fonts, loaded in index.html)
- Scroll animations: `useScrollAnimation` hook adds `.animate` class via IntersectionObserver
- Modal animations: Framer Motion `AnimatePresence` + `motion.div` with scale/opacity transitions
- Admin sidebar nav is rendered inline in Orders.tsx and Users.tsx (not a shared component)

## Environment Variables

Required in `.env` (Vite `VITE_` prefix):
```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
```

Edge functions need `RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` set in Supabase dashboard.
