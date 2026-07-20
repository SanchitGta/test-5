# test-5

## BillingBuilder — app skeleton

Zero-dependency Node.js (v22+) scaffold: no `npm install` required.

- `npm start` — boots the server on `PORT` (default 3000) and serves an empty app shell at `/`.
- `npm test` — runs the test suite with the built-in Node test runner.

### Layout

- `src/server.js` / `src/app.js` — HTTP entry point and the empty app shell (no feature routes yet).
- `src/auth/stubAuth.js` — stubbed fixed org+user auth context attached to every request.
- `src/db/` — SQLite (`node:sqlite`) connection and schema for the `features` and `subscriptions` tables.
- `src/models/` — read/write functions for the `Feature` and `Subscription` records.

The SQLite file lives at `data/billingbuilder.db` by default (override with `DB_PATH`, e.g. `:memory:`).
