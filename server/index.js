import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { readCSV, writeCSV, appendRowCSV } from './csv.js'
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
    hidden_accounts: [],
    categories: [],
    types: ['expense', 'income', 'transfer', 'cc_payment', 'opening_balance'],
    theme: null,
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
    const loaded = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
    if (!loaded.hidden_accounts) loaded.hidden_accounts = []
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

// Reports API
app.get('/api/reports', async (req, res) => {
  try {
    const { from, to } = req.query
    if (!from || !to) return res.status(400).json({ error: 'from and to are required' })

    // Gather all transactions in range
    let txs = [...state.activeTransactions]

    const archiveDir = path.join(dataDir, 'archive')
    if (fs.existsSync(archiveDir)) {
      const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.csv'))
      for (const file of files) {
        const match = file.match(/^(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.csv$/)
        if (match && match[1] <= to && match[2] >= from) {
          const archiveTxs = await readCSV(path.join(archiveDir, file))
          txs = txs.concat(archiveTxs)
        }
      }
    }

    txs = txs.filter(tx => tx.date >= from && tx.date <= to)

    const hiddenAccounts = new Set(state.meta.hidden_accounts || [])

    // By category
    const catMap = {}
    for (const tx of txs) {
      const key = tx.category || '(uncategorized)'
      if (!catMap[key]) catMap[key] = { total: 0, count: 0 }
      catMap[key].total += tx.amount
      catMap[key].count++
    }
    const byCategory = Object.entries(catMap)
      .map(([category, v]) => ({ category, total: v.total, count: v.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    // By account (visible only)
    const acctMap = {}
    for (const tx of txs) {
      if (!hiddenAccounts.has(tx.account)) {
        if (!acctMap[tx.account]) acctMap[tx.account] = { netFlow: 0, count: 0 }
        acctMap[tx.account].netFlow += tx.amount
        acctMap[tx.account].count++
      }
      if (tx.counterparty && !hiddenAccounts.has(tx.counterparty)) {
        // counterparty receives the opposite flow for transfers
        if (tx.type === 'transfer' || tx.type === 'cc_payment') {
          if (!acctMap[tx.counterparty]) acctMap[tx.counterparty] = { netFlow: 0, count: 0 }
          acctMap[tx.counterparty].netFlow -= tx.amount
          acctMap[tx.counterparty].count++
        }
      }
    }
    const accountOrder = state.meta.account_order || []
    const byAccount = accountOrder
      .filter(a => acctMap[a])
      .map(account => ({ account, netFlow: acctMap[account].netFlow, count: acctMap[account].count }))

    // By type
    const typeMap = {}
    for (const tx of txs) {
      if (!typeMap[tx.type]) typeMap[tx.type] = { total: 0, count: 0 }
      typeMap[tx.type].total += tx.amount
      typeMap[tx.type].count++
    }
    const byType = Object.entries(typeMap)
      .map(([type, v]) => ({ type, total: v.total, count: v.count }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    res.json({ range: { from, to }, byCategory, byAccount, byType })
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

// Use SERVER_PORT to avoid conflict with vite's PORT env var
const PORT = process.env.SERVER_PORT || 3000
init().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
})
