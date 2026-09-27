import express from 'express'
import path from 'path'
import fs from 'fs'
import { readCSV, writeCSV, appendRowCSV } from '../csv.js'

async function getTransactionsInRange(state, from, to) {
  let txs = [...state.activeTransactions]

  const archiveDir = path.join(state.dataDir, 'archive')
  if (fs.existsSync(archiveDir)) {
    const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.csv'))
    for (const file of files) {
      const match = file.match(/^(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.csv$/)
      if (match) {
        const fileFrom = match[1]
        const fileTo = match[2]
        // Include archive if its range overlaps with requested range
        const rangeFrom = from || '0000-00-00'
        const rangeTo = to || '9999-99-99'
        if (fileFrom <= rangeTo && fileTo >= rangeFrom) {
          const archiveTxs = await readCSV(path.join(archiveDir, file))
          txs = txs.concat(archiveTxs)
        }
      }
    }
  }

  return txs
}

export function createTransactionsRouter(state) {
  const router = express.Router()

  router.get('/export', async (req, res) => {
    try {
      const { from, to, account, type, category } = req.query
      let txs = await getTransactionsInRange(state, from, to)

      if (from) txs = txs.filter(tx => tx.date >= from)
      if (to) txs = txs.filter(tx => tx.date <= to)
      if (account) txs = txs.filter(tx => tx.account === account || tx.counterparty === account)
      if (type) txs = txs.filter(tx => tx.type === type)
      if (category) txs = txs.filter(tx => tx.category === category)

      txs.sort((a, b) => {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1
        return a.created_at < b.created_at ? -1 : 1
      })

      const CSV_COLUMNS = ['id', 'date', 'account', 'type', 'amount', 'counterparty', 'category', 'description', 'created_at']
      const header = CSV_COLUMNS.join(',')
      const rows = txs.map(tx =>
        CSV_COLUMNS.map(col => {
          const v = String(tx[col] ?? '')
          return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
        }).join(',')
      )
      const csv = [header, ...rows].join('\n')

      const fromStr = from || 'all'
      const toStr = to || 'all'
      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="transactions_${fromStr}_to_${toStr}.csv"`)
      res.send(csv)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.get('/', async (req, res) => {
    try {
      const { from, to, account, type, category } = req.query
      let txs = await getTransactionsInRange(state, from, to)

      if (from) txs = txs.filter(tx => tx.date >= from)
      if (to) txs = txs.filter(tx => tx.date <= to)
      if (account) txs = txs.filter(tx => tx.account === account || tx.counterparty === account)
      if (type) txs = txs.filter(tx => tx.type === type)
      if (category) txs = txs.filter(tx => tx.category === category)

      res.json(txs)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/', async (req, res) => {
    try {
      const { date, account, type, amount, counterparty, category, description } = req.body

      if (!date || !account || !type || amount === undefined) {
        return res.status(400).json({ error: 'Missing required fields: date, account, type, amount' })
      }

      const id = state.meta.next_id
      state.meta.next_id++

      if (type === 'opening_balance' && !state.meta.account_order.includes(account)) {
        state.meta.account_order.push(account)
      }

      const transaction = {
        id,
        date,
        account,
        type,
        amount: parseFloat(amount),
        counterparty: counterparty || '',
        category: category || '',
        description: description || '',
        created_at: new Date().toISOString(),
      }

      state.activeTransactions.push(transaction)
      await appendRowCSV(state.activeCSVPath, transaction)
      await state.saveMeta()

      res.status(201).json(transaction)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10)
      const idx = state.activeTransactions.findIndex(tx => tx.id === id)

      if (idx === -1) {
        return res.status(404).json({ error: 'Transaction not found' })
      }

      const existing = state.activeTransactions[idx]
      const updated = {
        ...existing,
        ...req.body,
        id: existing.id,
        created_at: existing.created_at,
        amount: parseFloat(req.body.amount ?? existing.amount),
      }

      state.activeTransactions[idx] = updated
      await writeCSV(state.activeCSVPath, state.activeTransactions)

      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10)
      const idx = state.activeTransactions.findIndex(tx => tx.id === id)

      if (idx === -1) {
        return res.status(404).json({ error: 'Transaction not found' })
      }

      state.activeTransactions.splice(idx, 1)
      await writeCSV(state.activeCSVPath, state.activeTransactions)

      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
