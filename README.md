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

## Running in the Background (PM2)

[PM2](https://pm2.keymetrics.io/) is a Node.js process manager that runs the app as a background daemon, detached from any terminal. Once set up, closing the terminal, logging out, or rebooting does not stop it.

**Install PM2 (one time):**
```bash
npm install -g pm2
```

**Start the app as a background process** (from the project folder):
```bash
pm2 start npm --name "budget-tracker" -- run dev
```

In this development mode the app is still served by Vite at [http://localhost:5173](http://localhost:5173).

**Register PM2 to start on login (one time):**
```bash
pm2 startup   # prints a command — copy and run it
pm2 save      # saves the process list for restore on reboot
```

After this, the app starts automatically when you log in and runs in the background indefinitely. You do not need to keep a terminal open.

**Useful commands:**
```bash
pm2 status                    # see if the app is running
pm2 logs budget-tracker       # tail the app logs
pm2 restart budget-tracker    # restart after a code change
pm2 stop budget-tracker       # pause the app
pm2 delete budget-tracker     # remove it from PM2 entirely
```

### Switching to a Production Build

Recommended once the app is stable and no longer being actively changed. `npm run dev` keeps Vite's hot-reload pipeline running in the background, which is unnecessary for a stable app. In production mode Vite compiles the frontend once into `dist/` and Express serves it directly: one process instead of two, faster startup, no rebuild watching.

The server only serves `dist/` when `NODE_ENV=production`, so development mode is unaffected.

**Build and start** (if the dev-mode process is already registered, `pm2 delete budget-tracker` first):
```bash
npm run build                                          # compile the Vue frontend into dist/
NODE_ENV=production pm2 start server/index.js --name "budget-tracker"
pm2 startup && pm2 save
```

The app is then at [http://localhost:3000](http://localhost:3000).

**When you update the app:**

| Change type | Command |
|---|---|
| Frontend (Vue/CSS) | `npm run build` then `pm2 restart budget-tracker` |
| Backend only (Express/engine) | `pm2 restart budget-tracker` |

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

Press `?` (or click the **?** in the top nav) for the full list. Highlights: `F` focuses the monthly grid, arrow keys move between delta cells, `Enter` opens the popup, `T` jumps to today, `G` then `H`/`L`/`R`/`S` navigates between pages, in the transaction popup `N` adds a row and `Enter` saves it and opens the next one, and in the popup or the Transaction Log `↑`/`↓` move between rows while `E` edits and `D` deletes the focused row.
