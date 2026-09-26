import express from 'express'
import fs from 'fs'
import path from 'path'
import { computeRunningBalances } from '../engine.js'
import { readCSV, writeCSV } from '../csv.js'

export function createRolloverRouter(state) {
  const router = express.Router()

  router.post('/', async (req, res) => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const balances = computeRunningBalances(state.activeTransactions, today)

      // Find the date range in active.csv
      const dates = state.activeTransactions.map(tx => tx.date).sort()
      const minDate = dates[0] || today
      const maxDate = today

      // Archive the current active.csv
      const archiveName = `${minDate}_to_${maxDate}.csv`
      const archivePath = path.join(state.dataDir, 'archive', archiveName)
      fs.renameSync(state.activeCSVPath, archivePath)

      // Create new opening_balance rows for tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().slice(0, 10)

      const newRows = []
      for (const account of state.meta.account_order) {
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
