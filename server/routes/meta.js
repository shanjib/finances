import express from 'express'
import path from 'path'
import fs from 'fs'
import { readCSV, writeCSV } from '../csv.js'

export function createMetaRouter(state) {
  const router = express.Router()

  router.get('/', (req, res) => {
    res.json(state.meta)
  })

  router.put('/account-order', async (req, res) => {
    try {
      const { account_order } = req.body
      if (!Array.isArray(account_order)) {
        return res.status(400).json({ error: 'account_order must be an array' })
      }
      state.meta.account_order = account_order
      await state.saveMeta()
      res.json(state.meta)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/theme', async (req, res) => {
    try {
      const { theme } = req.body
      if (!['light', 'dark', 'warm'].includes(theme)) {
        return res.status(400).json({ error: 'Invalid theme' })
      }
      state.meta.theme = theme
      await state.saveMeta()
      res.json({ theme })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/categories', async (req, res) => {
    try {
      const { value } = req.body
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ error: 'value is required' })
      }
      if (!state.meta.categories.includes(value)) {
        state.meta.categories.push(value)
        await state.saveMeta()
      }
      res.json(state.meta.categories)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.delete('/categories/:value', async (req, res) => {
    try {
      const value = decodeURIComponent(req.params.value)
      state.meta.categories = state.meta.categories.filter(c => c !== value)
      await state.saveMeta()
      res.json(state.meta.categories)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.post('/types', async (req, res) => {
    try {
      const { value } = req.body
      if (!value || typeof value !== 'string') {
        return res.status(400).json({ error: 'value is required' })
      }
      if (!state.meta.types.includes(value)) {
        state.meta.types.push(value)
        await state.saveMeta()
      }
      res.json(state.meta.types)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.delete('/types/:value', async (req, res) => {
    try {
      const value = decodeURIComponent(req.params.value)
      state.meta.types = state.meta.types.filter(t => t !== value)
      await state.saveMeta()
      res.json(state.meta.types)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // Rename account across all CSV files
  router.put('/accounts/rename', async (req, res) => {
    try {
      const { oldName, newName } = req.body
      if (!oldName || !newName) {
        return res.status(400).json({ error: 'oldName and newName are required' })
      }
      const trimmedNew = newName.trim()
      if (!trimmedNew) {
        return res.status(400).json({ error: 'newName cannot be empty' })
      }

      const allAccounts = [
        ...(state.meta.account_order || []),
        ...(state.meta.hidden_accounts || []),
      ]
      if (!allAccounts.some(a => a.toLowerCase() === oldName.toLowerCase())) {
        return res.status(404).json({ error: 'Account not found' })
      }
      if (allAccounts.some(a => a.toLowerCase() === trimmedNew.toLowerCase() && a.toLowerCase() !== oldName.toLowerCase())) {
        return res.status(400).json({ error: 'An account with that name already exists' })
      }

      let rowsUpdated = 0
      let filesUpdated = 0

      // Rename in active transactions
      let changed = false
      for (const tx of state.activeTransactions) {
        if (tx.account === oldName) { tx.account = trimmedNew; rowsUpdated++; changed = true }
        if (tx.counterparty === oldName) { tx.counterparty = trimmedNew; rowsUpdated++; changed = true }
      }
      if (changed) {
        await writeCSV(state.activeCSVPath, state.activeTransactions)
        filesUpdated++
      }

      // Rename in archives
      const archiveDir = path.join(state.dataDir, 'archive')
      if (fs.existsSync(archiveDir)) {
        const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.csv'))
        for (const file of files) {
          const fp = path.join(archiveDir, file)
          const txs = await readCSV(fp)
          let archiveChanged = false
          for (const tx of txs) {
            if (tx.account === oldName) { tx.account = trimmedNew; rowsUpdated++; archiveChanged = true }
            if (tx.counterparty === oldName) { tx.counterparty = trimmedNew; rowsUpdated++; archiveChanged = true }
          }
          if (archiveChanged) {
            await writeCSV(fp, txs)
            filesUpdated++
          }
        }
      }

      // Update meta
      if (!state.meta.hidden_accounts) state.meta.hidden_accounts = []
      state.meta.account_order = state.meta.account_order.map(a => a === oldName ? trimmedNew : a)
      state.meta.hidden_accounts = state.meta.hidden_accounts.map(a => a === oldName ? trimmedNew : a)
      await state.saveMeta()

      res.json({ rowsUpdated, filesUpdated })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  // Set account visibility
  router.put('/accounts/:name/visibility', async (req, res) => {
    try {
      const name = decodeURIComponent(req.params.name)
      const { visible } = req.body
      if (!state.meta.hidden_accounts) state.meta.hidden_accounts = []

      if (visible) {
        state.meta.hidden_accounts = state.meta.hidden_accounts.filter(a => a !== name)
        if (!state.meta.account_order.includes(name)) {
          state.meta.account_order.push(name)
        }
      } else {
        state.meta.account_order = state.meta.account_order.filter(a => a !== name)
        if (!state.meta.hidden_accounts.includes(name)) {
          state.meta.hidden_accounts.push(name)
        }
      }

      await state.saveMeta()
      res.json({ account: name, visible })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}
