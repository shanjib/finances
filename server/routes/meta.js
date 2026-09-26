import express from 'express'

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

  return router
}
