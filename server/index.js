import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { readCSV, writeCSV, appendRowCSV } from './csv.js'
import { computeMonthlySnapshot, computeRunningBalances } from './engine.js'
import { createTransactionsRouter } from './routes/transactions.js'
import { createMetaRouter } from './routes/meta.js'
import { createRolloverRouter } from './routes/rollover.js'
import { createTemplatesRouter } from './routes/templates.js'
import { gatherTransactions, summarize, buildTrend } from './reports.js'
import { todayLocal } from './dates.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// DATA_DIR lets you point the server at a copy of the data (e.g. for testing)
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data')
const activeCSVPath = path.join(dataDir, 'active.csv')
const metaPath = path.join(dataDir, 'meta.json')

// Shared mutable state
const state = {
  activeTransactions: [],
  meta: {
    next_id: 1,
    account_order: [],
    hidden_accounts: [],
    categories: [],
    types: ['expense', 'income', 'transfer', 'cc_payment', 'opening_balance'],
    theme: null,
    templates: [],
  },
  activeCSVPath,
  dataDir,
  saveMeta: async () => {
    // Write-then-rename so a crash mid-write can't corrupt meta.json
    const tmpPath = `${metaPath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(state.meta, null, 2), 'utf-8')
    fs.renameSync(tmpPath, metaPath)
  },
}

async function init() {
  // Load meta
  if (fs.existsSync(metaPath)) {
    const loaded = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    if (!loaded.hidden_accounts) loaded.hidden_accounts = []
    if (!Array.isArray(loaded.templates)) loaded.templates = []
    // A missing theme means "not chosen yet": the frontend detects the OS preference
    if (!loaded.theme) loaded.theme = null
    state.meta = loaded
  } else {
    console.error(
      '\n⚠️  data/meta.json not found.\n' +
      'First-time setup: copy data/template-meta.json to data/meta.json,\n' +
      'then edit as needed.\n'
    )
    // Serve with safe defaults rather than crashing
  }

  // Load active CSV
  if (!fs.existsSync(activeCSVPath)) {
    console.error(
      '\n⚠️  data/active.csv not found.\n' +
      'First-time setup: copy data/template-active.csv to data/active.csv,\n' +
      'then edit the account names and opening balances.\n'
    )
  } else {
    state.activeTransactions = await readCSV(activeCSVPath)
    console.log(`Loaded ${state.activeTransactions.length} transactions from active.csv`)

    // Auto-populate account_order from CSV if it's empty
    if (state.meta.account_order.length === 0) {
      const seen = new Set()
      const ordered = []
      for (const tx of state.activeTransactions) {
        if (tx.account && !seen.has(tx.account)) {
          seen.add(tx.account)
          ordered.push(tx.account)
        }
      }
      if (ordered.length > 0) {
        state.meta.account_order = ordered
        await state.saveMeta()
        console.log(`Auto-populated account_order with ${ordered.length} accounts from active.csv`)
      }
    }
  }
}

const app = express()
app.use(express.json())

// API routes
app.use('/api/transactions', createTransactionsRouter(state))
app.use('/api/meta', createMetaRouter(state))
app.use('/api/rollover', createRolloverRouter(state))
app.use('/api/templates', createTemplatesRouter(state))

// Create account
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, openingBalance, date } = req.body
    if (!name || openingBalance === undefined || !date) {
      return res.status(400).json({ error: 'name, openingBalance, and date are required' })
    }
    const trimmedName = name.trim()
    if (!trimmedName) return res.status(400).json({ error: 'Account name cannot be empty' })

    const allAccounts = [
      ...(state.meta.account_order || []),
      ...(state.meta.hidden_accounts || []),
    ]
    if (allAccounts.some(a => a.toLowerCase() === trimmedName.toLowerCase())) {
      return res.status(400).json({ error: 'An account with that name already exists' })
    }

    const id = state.meta.next_id
    state.meta.next_id++
    state.meta.account_order.push(trimmedName)

    const transaction = {
      id,
      date,
      account: trimmedName,
      type: 'opening_balance',
      amount: parseFloat(openingBalance),
      counterparty: '',
      category: '',
      description: 'Opening balance',
      created_at: new Date().toISOString(),
    }

    state.activeTransactions.push(transaction)
    await appendRowCSV(state.activeCSVPath, transaction)
    await state.saveMeta()

    res.status(201).json({ account: trimmedName, transaction })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Current balance for a single account, optionally as-of a given date
app.get('/api/balance/:account', (req, res) => {
  const account = decodeURIComponent(req.params.account)
  const asOf = req.query.asOf || todayLocal()
  const balances = computeRunningBalances(state.activeTransactions, asOf)
  res.json({ account, balance: balances[account] ?? 0 })
})

// Reports API
app.get('/api/reports', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

    const txs = await gatherTransactions(state, from, to)
    res.json({ range: { from, to }, ...summarize(txs, state.meta) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Multi-month trend: one summary per calendar month across [from, to]
app.get('/api/reports/trend', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

    res.json({ range: { from, to }, ...(await buildTrend(state, from, to)) })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Monthly snapshot
app.get('/api/monthly/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params
    const y = parseInt(year)
    const m = parseInt(month)

    let transactions = state.activeTransactions

    // Check if any transactions cover this month; if not, check archives
    const monthStr = `${y}-${String(m).padStart(2, '0')}`
    const hasData = transactions.some(tx => tx.date.startsWith(monthStr))

    if (!hasData) {
      const archiveDir = path.join(dataDir, 'archive')
      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.csv'))
        for (const file of files) {
          const match = file.match(/^(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.csv$/)
          if (match) {
            const from = match[1].slice(0, 7)
            const to = match[2].slice(0, 7)
            if (monthStr >= from && monthStr <= to) {
              transactions = await readCSV(path.join(archiveDir, file))
              break
            }
          }
        }
      }
    }

    const snapshot = computeMonthlySnapshot(
      transactions, year, month, state.meta.account_order, state.meta.hidden_accounts
    )
    res.json(snapshot)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Archives list
app.get('/api/archives', (req, res) => {
  const archiveDir = path.join(dataDir, 'archive')
  if (!fs.existsSync(archiveDir)) return res.json([])

  const files = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.csv'))
    .map(f => {
      const match = f.match(/^(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.csv$/)
      return match ? { filename: f, from: match[1], to: match[2] } : null
    })
    .filter(Boolean)

  res.json(files)
})

// Serve the built frontend in production (NODE_ENV=production, after `npm run build`).
// Must stay after every /api route so the catch-all below never shadows them.
const distPath = path.join(__dirname, '../dist')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// Use SERVER_PORT to avoid conflict with vite's PORT env var
const PORT = process.env.SERVER_PORT || 3000
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
