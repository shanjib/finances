import { ref } from 'vue'

export interface Template {
  id: number
  name: string
  type: string
  amount: number
  counterparty: string
  category: string
  description: string
}

export type TemplateInput = Omit<Template, 'id'>

const templates = ref<Template[]>([])

async function parse(res: Response) {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

async function fetchTemplates() {
  templates.value = await parse(await fetch('/api/templates'))
}

async function createTemplate(input: TemplateInput): Promise<Template> {
  const created: Template = await parse(await fetch('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
  await fetchTemplates()
  return created
}

async function updateTemplate(id: number, input: TemplateInput): Promise<Template> {
  const updated: Template = await parse(await fetch(`/api/templates/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  }))
  await fetchTemplates()
  return updated
}

async function deleteTemplate(id: number) {
  await parse(await fetch(`/api/templates/${id}`, { method: 'DELETE' }))
  await fetchTemplates()
}

function findByName(name: string): Template | undefined {
  const n = name.trim().toLowerCase()
  return templates.value.find(t => t.name.toLowerCase() === n)
}

export function summarizeTemplate(t: Template): string {
  const parts = [t.type, `$${Math.abs(t.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]
  if (t.counterparty) parts.push(`→ ${t.counterparty}`)
  if (t.category) parts.push(t.category)
  if (t.description) parts.push(`"${t.description}"`)
  return parts.join(' · ')
}

fetchTemplates().catch(() => {})

export function useTemplates() {
  return { templates, fetchTemplates, createTemplate, updateTemplate, deleteTemplate, findByName }
}
