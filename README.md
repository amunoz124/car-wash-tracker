# Car Wash Tracker v1.2.1

## Important if you already used v1.1

Run `migration-v1.2.sql` **once** in the Supabase SQL Editor before running this version of the app. Do **not** rerun the old `supabase.sql` on an existing database. The migration keeps your historical work entries and converts repeated weekly rows into one dealership plus multiple weekday assignments.

For a brand-new Supabase project, run `supabase.sql` instead.

### New schedule model

- `dealerships`: one row per dealership with its current rate.
- `dealership_schedule`: any number of weekday assignments linked to that dealership.
- `daily_overrides`: one-day additions/removals without changing the normal schedule.
- `work_entries`: historical car counts and rate snapshots.

In Settings, add a dealership once and check every recurring weekday (for example Monday, Wednesday, and Friday).

---

# Private Car Wash Tracker

A private, mobile-first Vite + Supabase web app for recurring dealership car-wash routes.

## Included
- Dark navy/green mobile UI matching the provided preview
- Email/password login
- Bottom navigation: Today, Monthly, History, Settings
- Weekly recurring dealership schedule
- Automatic current date and weekday
- Add/remove a dealership for today only
- Daily input is only the number of cars
- Autosave without refreshing the page
- Automatic per-dealership amount
- Automatic current-month total from the 1st through the last calendar day
- Automatic new month when the calendar month changes
- Monthly earnings chart
- Monthly totals broken down by dealership
- One-click monthly CSV export with date, dealership, cars, rate, and amount
- Daily and monthly history
- Edit previous work days, including car counts, rates, missing dealerships, and incorrect entries
- Historical rate snapshots, so future rate changes do not rewrite old totals
- Row Level Security so authenticated users only access their own rows
- Web-app manifest so the site can be added to a phone Home Screen

## 1. Install locally

```bash
npm install
cp .env.example .env
```

Fill in `.env` with your Supabase Project URL and publishable key.

## 2. Prepare Supabase

- **Existing v1.1 database:** run `migration-v1.2.sql` once.
- **Brand-new database:** run `supabase.sql`.

Do not run both on the same existing database.

## 3. Create your one account

In Supabase Authentication, create your user with your email/password. Disable public new-user signups in Authentication settings if you want this to be a one-person app.

## 4. Run it

```bash
npm run dev
```

Open the local URL Vite prints in the terminal.


## QA

Run the included regression checks any time with:

```bash
npm run qa
```

The v1.2.1 QA pass completed with **20 passed, 0 failed**. See `QA_REPORT.md` for coverage and limitations.

## 5. Production build

```bash
npm run build
```

## 6. Deploy to Vercel

Push this folder to GitHub, import the repository in Vercel, and add:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Then deploy.

## iPhone

Open the deployed site in Safari, sign in, then use Share -> Add to Home Screen. The included manifest and dark theme help it feel like a standalone app.

## Important security note

The Supabase publishable key is expected to be present in browser code. Do not put a Supabase service-role key, database password, or other private server credential in any `VITE_` environment variable.

## New monthly tools

### Totals by dealership
Open **Monthly** to see each dealership's total cars, work days, and earnings for the selected calendar month.

### CSV export
On the **Monthly** screen, choose the month and tap **Export CSV**. The downloaded file is named like `car-wash-2026-09.csv` and contains one row per recorded dealership visit plus a monthly total row.

### Correct a previous day
Open **History -> Daily History**, expand a previous work day, and tap **Edit This Day**. You can correct the dealership name, number of cars, or rate; add a dealership you forgot; or remove an incorrect entry. Saving immediately updates the history, monthly dashboard, dealership totals, and future CSV exports.
