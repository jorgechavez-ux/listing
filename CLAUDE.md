# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run preview   # preview production build locally
```

There is no test suite. Supabase Edge Functions are deployed via:
```bash
supabase functions deploy <function-name>
```

## Environment Variables

Required in `.env.local`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_GEMINI_API_KEY=        # actually the Groq API key (file is misnamed)
VITE_STRIPE_PRICE_PRO_MONTHLY=
VITE_STRIPE_PRICE_PRO_YEARLY=
VITE_STRIPE_PRICE_BIZ_MONTHLY=
VITE_STRIPE_PRICE_BIZ_YEARLY=
```

Supabase Edge Functions require these secrets set in Supabase dashboard:
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

## Architecture

**Single-page app with screen-based navigation** — no router. `App.jsx` holds all state and renders one screen at a time based on a `screen` string: `upload → analyzing → questions → generating → result | pricing | history | account`.

### AI Pipeline (`src/lib/gemini.js`)

> Note: the file is named `gemini.js` but uses the **Groq API**, not Gemini.

Two-step generation process:
1. **`analyzeForQuestions()`** — Phase A: visual product ID via `meta-llama/llama-4-scout-17b-16e-instruct` (vision model). Phase B: web search via `compound-beta-mini` to get exact product name, resale price, and specs. Phase C: second vision call to determine what clarifying questions to ask the user.
2. **`generateListing()`** — final vision call with all context (answers, web data, product name) to produce `{ title, description, price, category }`.

`AnalyzingScreen` is reused for both `mode="analyze"` (step 1) and `mode="generate"` (step 2). It fires the AI call and calls `onDone` with the result.

### Data Flow

- **Usage tracking**: generation count stored in Supabase `user_metadata` (`gen_count`, `gen_month`). Plan limits read from `subscriptions` table. Logic in `src/lib/usage.js`.
- **Listings**: saved to `listings` table after successful generation via `src/lib/listings.js`.
- **Subscriptions**: managed via Stripe. Frontend calls Supabase Edge Functions (`create-checkout-session`, `create-portal-session`, `cancel-subscription`, `reactivate-subscription`, `change-plan`). Stripe webhooks update the `subscriptions` table.

### Supabase Tables
- `subscriptions` — `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `plan`, `status` (`active | trialing | canceling | canceled`), `current_period_end`, `updated_at`
- `listings` — `user_id`, `title`, `description`, `price`, `category`, `product_name`, `created_at`

### Plan Limits (`src/config.js`)
- `free`: 5 listings/mo
- `pro`: 60 listings/mo
- `business`: unlimited (`Infinity`)

### Auth

`useAuth` hook listens to Supabase auth state. Auth modal shown before generation if not logged in; the pending action (`imgs`, `det`) is saved and executed after successful login. Google OAuth is present in the UI but disabled ("Soon" badge).

## UI Language

All user-facing strings are in **Spanish**. Error messages and UI copy should remain in Spanish.
