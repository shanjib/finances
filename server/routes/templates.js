import express from 'express'


/** Validate/normalise a template body. Returns { error } or { value }. */
function parseTemplate(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return { error: 'name is required' }
  const type = typeof body.type === 'string' ? body.type.trim() : ''
  if (!type) return { error: 'type is required' }
  const amount = parseFloat(body.amount)
  if (Number.isNaN(amount)) return { error: 'amount must be a number' }
  const str = v => (typeof v === 'string' ? v : '')
  return {
    value: {
      name,
      type,
      amount,
      counterparty: str(body.counterparty),
      category: str(body.category),
      description: str(body.description),
    },
  }
}

export function createTemplatesRouter(state) {
  const router = express.Router()

  const list = () => {
    if (!Array.isArray(state.meta.templates)) state.meta.templates = []
    return state.meta.templates
  }

  // Ids are never reused: next_template_id only ever increases.
  const nextId = () => {
    const templates = list()
    const maxId = templates.reduce((m, t) => Math.max(m, t.id), 0)
    const id = Math.max(state.meta.next_template_id || 1, maxId + 1)
    state.meta.next_template_id = id + 1
    return id
  }

  const nameTaken = (name, exceptId) =>
    list().some(t => t.id !== exceptId && t.name.toLowerCase() === name.toLowerCase())

  router.get('/', (req, res) => {
    res.json(list())
  })

  router.post('/', async (req, res) => {
    try {
      const { error, value } = parseTemplate(req.body || {})
      if (error) return res.status(400).json({ error })
      if (nameTaken(value.name)) {
        return res.status(409).json({ error: `A template named '${value.name}' already exists` })
      }
      const template = { id: nextId(), ...value }
      list().push(template)
      await state.saveMeta()
      res.status(201).json(template)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10)
      const idx = list().findIndex(t => t.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Template not found' })

      const { error, value } = parseTemplate({ ...list()[idx], ...(req.body || {}) })
      if (error) return res.status(400).json({ error })
      if (nameTaken(value.name, id)) {
        return res.status(409).json({ error: `A template named '${value.name}' already exists` })
      }
      const updated = { id, ...value }
      list()[idx] = updated
      await state.saveMeta()
      res.json(updated)
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10)
      const idx = list().findIndex(t => t.id === id)
      if (idx === -1) return res.status(404).json({ error: 'Template not found' })
      list().splice(idx, 1)
      await state.saveMeta()
      res.json({ success: true })
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  return router
}

