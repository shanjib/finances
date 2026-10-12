# Budget Tracker

A local-first personal cash flow tracker. Enter transactions (expenses, income, transfers, credit card payments) and view a daily-snapshot monthly grid showing each account's start-of-day balance and day's delta. Data is persisted locally to a CSV file.

## Prerequisites

- Node.js 18+

## Installation

```bash
npm install
```

## First-Time Setup

1. Copy the template CSV to create your active data file:
   ```bash
   cp data/template-active.csv data/active.csv
   ```
2. Edit `data/active.csv` to replace the example account names (`checking`, `savings`, `credit_card`) with your real account names, and set the opening balances to your current balances. Use a negative amount for credit card accounts that carry a balance.

3. Copy the template metadata and edit `account_order` to match your account names:
   ```bash
   cp data/template-meta.json data/meta.json
   ```
   Leave `theme` out; the app picks your OS light/dark preference on first launch and saves it.

## Running the App

```bash
npm run dev
```

This starts both the Express server (port 3000) and the Vite dev server (port 5173). Open [http://localhost:5173](http://localhost:5173).

## How Rollover Works

When your `active.csv` grows large or you want to start a new period:

1. Go to **Settings → Archive & Rollover**.
2. Confirm the action.

The server will:
- Compute current balances for all accounts (visible and hidden).
- Rename `data/active.csv` to `data/archive/YYYY-MM-DD_to_YYYY-MM-DD.csv`.
- Create a new `data/active.csv` with one `opening_balance` row per account (including hidden ones) dated tomorrow, seeded with the computed balances.

Historical months remain accessible — the monthly grid transparently reads from archive files when you navigate to past months.

## Keyboard Shortcuts

Press `?` (or click the **?** in the top nav) for the full list. Highlights: `F` focuses the monthly grid, arrow keys move between delta cells, `Enter` opens the popup, `T` jumps to today, `G` then `H`/`L`/`R`/`S` navigates between pages, and in the transaction popup `N` adds a row and `Enter` saves it and opens the next one.
