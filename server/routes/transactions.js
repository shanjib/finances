import express from 'express'
import { readCSV, writeCSV, appendRowCSV } from '../csv.js'

export function createTransactionsRouter(state) {
  const router = express.Router()

  router.get('/', (req, res) => {
    let txs = state.activeTransactions

    if (req.query.from) {
      txs = txs.filter(tx => tx.date >= req.query.from)
    }
    if (req.query.to) {
      txs = txs.filter(tx => tx.date <= req.query.to)
    }
    if (req.query.account) {
      txs = txs.filter(
        tx => tx.account === req.query.account || tx.counterparty === req.query.account
      )
    }

    res.json(txs)
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
