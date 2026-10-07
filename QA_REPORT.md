# Car Wash Tracker v1.2.1 — QA Report

## Result

Automated source/logic QA: **20 passed, 0 failed**.

Run it any time with:

```bash
npm run qa
```

The QA suite covers calendar-month boundaries, leap years, month navigation, earnings calculations, historical rate snapshots, daily/monthly grouping, multi-day dealership scheduling, one-day route overrides, Settings weekday rendering, HTML escaping, CSV escaping/totals, normalized Supabase schema constraints, RLS presence, removal of legacy `weekly_schedule` queries, and migration preservation of `work_entries`.

## Defect fixed during QA

A saved work entry could keep its original `rate_snapshot` while the Today card displayed a newer dealership rate after a Settings change. This could make the card amount disagree with the daily/monthly saved total. v1.2.1 now uses the saved snapshot for any already-recorded entry, keeping the UI and stored earnings consistent.

Settings save error handling was also hardened so a database/network error refreshes from server state rather than leaving a Save button stuck or presenting stale state.

## Validation limitation

A full `npm install` / Vite browser production build could not be completed in the QA environment because package installation timed out. JavaScript syntax, manifest JSON, CSS brace structure, source logic, schema structure, and the automated QA suite were validated. Run `npm install`, `npm run qa`, and `npm run build` locally before production deployment.
