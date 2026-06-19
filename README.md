# Backlinkedge SEO

SEO agency landing page + **Stripe subscriptions** + **admin dashboard**, built with
**Node.js + Express + EJS**. Designed as the front door for a larger app.

## Quick start

```bash
npm install
cp .env.example .env      # then edit .env with your values
npm start                 # http://localhost:3000
npm run dev               # auto-reload (node --watch)
```

- **Landing page:** http://localhost:3000
- **Admin panel:** http://localhost:3000/admin

> Requires **Node 18+** and a **MySQL** server. The app auto-creates the database
> and all tables on first boot — just provide credentials in `.env`.

## Configuration (`.env`)

| Variable | What it's for |
|---|---|
| `PORT` / `BASE_URL` | App port and public URL (used to build Stripe redirect URLs) |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | MySQL connection — app auto-creates the DB + tables |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…`) |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (`pk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin login credentials — **change these** |
| `SESSION_SECRET` | Long random string for signing session cookies |

Until real Stripe keys are added, the app boots fine — clicking a plan just shows a
friendly "payments aren't live yet" message instead of crashing.

## Stripe setup (test mode)

1. Get your **test** keys from https://dashboard.stripe.com/test/apikeys and put them in `.env`.
2. Forward webhooks to your local server using the [Stripe CLI](https://stripe.com/docs/stripe-cli):

   ```bash
   stripe listen --forward-to localhost:4000/webhook
   ```

   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`, then restart the app.
3. Click a pricing plan → you'll be sent to Stripe Checkout. Use test card
   `4242 4242 4242 4242`, any future expiry, any CVC.
4. The webhook records the customer, subscription, and payment — they appear in the admin panel.

Plans are **monthly subscriptions**. Prices are defined inline (no need to pre-create
Products in Stripe) in [`config/plans.js`](config/plans.js) — the single source of truth
for both the pricing section and checkout.

## Admin panel

`/admin` — log in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Includes:

- **Dashboard** — Total Revenue, MRR, Active Subscriptions, Payment count, a 30-day
  revenue chart, revenue-by-plan breakdown, and recent transactions.
- **Transactions** — every payment (with live search), customer, plan, amount, status, date.
- **Subscriptions** — all subscriptions with status (active / canceled / past_due) and renewal date.

## Structure

```
seo/
├── server.js                 # app wiring (webhook mounted before body parsers)
├── config/
│   ├── plans.js              # pricing plans — single source of truth
│   └── stripe.js             # Stripe client (graceful when unconfigured)
├── db/index.js               # MySQL pool, schema/init + queries (async)
├── middleware/auth.js        # admin auth (timing-safe), route guard
├── routes/
│   ├── checkout.js           # POST /checkout/:plan → Stripe Checkout; success/cancel
│   ├── webhook.js            # POST /webhook → records payments & subs
│   └── admin.js              # login, dashboard, transactions, subscriptions
├── views/
│   ├── index.ejs             # landing page
│   ├── message.ejs           # success / cancel / 404
│   ├── admin/                # login, dashboard, transactions, subscriptions
│   └── partials/             # header, footer, admin sidebar, tx-table, …
└── public/css/               # style.css (site) + admin.css (panel)
```

## Building your app on top

- Add routes in `server.js`. Nav links live in the `site.nav` array.
- The `customers`, `subscriptions`, and `transactions` tables in `data/app.db` are ready to query.
- Reuse the `partials/` shells for consistent public and admin pages.

## Notes / next steps

- The admin uses a single env-based login. For multiple admins, move credentials into the
  `customers`/a new `admins` table with hashed passwords.
- `data/app.db` is gitignored. Back it up if you put it in production.
- For production: set `cookie.secure = true` behind HTTPS, and consider a session store
  (e.g. `connect-sqlite3`) instead of the default in-memory one.
