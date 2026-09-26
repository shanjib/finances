import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { readCSV, writeCSV } from './csv.js'
import { computeMonthlySnapshot } from './engine.js'
import { createTransactionsRouter } from './routes/transactions.js'
import { createMetaRouter } from './routes/meta.js'
import { createRolloverRouter } from './routes/rollover.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '../data')
const activeCSVPath = path.join(dataDir, 'active.csv')
const metaPath = path.join(dataDir, 'meta.json')

// Shared mutable state
const state = {
  activeTransactions: [],
  meta: {
    next_id: 1,
    account_order: [],
    categories: [],
    types: ['expense', 'income', 'transfer', 'cc_payment', 'opening_balance'],
    theme: 'light',
  },
  activeCSVPath,
  dataDir,
  saveMeta: async () => {
    fs.writeFileSync(metaPath, JSON.stringify(state.meta, null, 2), 'utf-8')
  },
}

async function init() {
  // Load meta
  if (fs.existsSync(metaPath)) {
    state.meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  } else {
    console.warn('meta.json not found, using defaults')
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
  }
}

const app = express()
app.use(express.json())

// API routes
app.use('/api/transactions', createTransactionsRouter(state))
app.use('/api/meta', createMetaRouter(state))
app.use('/api/rollover', createRolloverRouter(state))

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

    const snapshot = computeMonthlySnapshot(transactions, year, month, state.meta.account_order)
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

// Serve built frontend in production
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3000
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
