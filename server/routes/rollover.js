import express from 'express'
import fs from 'fs'
import path from 'path'
import { computeRunningBalances } from '../engine.js'
import { readCSV, writeCSV } from '../csv.js'
import { todayLocal, tomorrowLocal } from '../dates.js'

export function createRolloverRouter(state) {
  const router = express.Router()

  router.post('/', async (req, res) => {
    try {
      const today = todayLocal()
      const balances = computeRunningBalances(state.activeTransactions, today)

      // Find the date range in active.csv
      const dates = state.activeTransactions.map(tx => tx.date).sort()
      const minDate = dates[0] || today
      const maxDate = today

      // Archive the current active.csv
      const archiveName = `${minDate}_to_${maxDate}.csv`
      const archivePath = path.join(state.dataDir, 'archive', archiveName)
      if (fs.existsSync(archivePath)) {
        return res.status(409).json({ error: `Archive ${archiveName} already exists; refusing to overwrite it` })
      }
      fs.renameSync(state.activeCSVPath, archivePath)

      // Seed opening balances for visible AND hidden accounts, so a hidden
      // account's balance history survives until it is shown again. Any other
      // account that still carries a balance (not in either list) is kept too.
      const accounts = [
        ...(state.meta.account_order || []),
        ...(state.meta.hidden_accounts || []),
      ]
      for (const account of Object.keys(balances)) {
        if (!accounts.includes(account)) accounts.push(account)
      }

      const tomorrowStr = tomorrowLocal()
      const newRows = []
      for (const account of accounts) {
        const balance = balances[account] ?? 0
        const id = state.meta.next_id++
        newRows.push({
          id,
          date: tomorrowStr,
          account,
          type: 'opening_balance',
          amount: balance,
          counterparty: '',
          category: '',
          description: '',
          created_at: new Date().toISOString(),
        })
      }

      await writeCSV(state.activeCSVPath, newRows)
      state.activeTransactions = await readCSV(state.activeCSVPath)
      await state.saveMeta()

      res.json({ success: true, openingBalances: newRows })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
