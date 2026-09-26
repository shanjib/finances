import { ref, computed } from 'vue'

interface Meta {
  next_id: number
  account_order: string[]
  categories: string[]
  types: string[]
  theme: 'light' | 'dark' | 'warm'
}

const meta = ref<Meta>({
  next_id: 1,
  account_order: [],
  categories: [],
  types: [],
  theme: 'light',
})
const loading = ref(false)

async function fetchMeta() {
  loading.value = true
  try {
    const res = await fetch('/api/meta')
    meta.value = await res.json()
  } finally {
    loading.value = false
  }
}

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme)
}

async function setTheme(theme: 'light' | 'dark' | 'warm') {
  await fetch('/api/meta/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  })
  meta.value.theme = theme
  applyTheme(theme)
}

async function setAccountOrder(order: string[]) {
  await fetch('/api/meta/account-order', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account_order: order }),
  })
  meta.value.account_order = order
}

async function addCategory(value: string) {
  const res = await fetch('/api/meta/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  meta.value.categories = await res.json()
}

async function deleteCategory(value: string) {
  const res = await fetch(`/api/meta/categories/${encodeURIComponent(value)}`, { method: 'DELETE' })
  meta.value.categories = await res.json()
}

async function addType(value: string) {
  const res = await fetch('/api/meta/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  meta.value.types = await res.json()
}

async function deleteType(value: string) {
  const res = await fetch(`/api/meta/types/${encodeURIComponent(value)}`, { method: 'DELETE' })
  meta.value.types = await res.json()
}

// Auto-fetch on first use; apply theme to root element
fetchMeta().then(() => {
  applyTheme(meta.value.theme)
})

export function useMeta() {
  return {
    meta,
    loading,
    theme: computed(() => meta.value.theme),
    fetchMeta,
    setTheme,
    setAccountOrder,
    addCategory,
    deleteCategory,
    addType,
    deleteType,
  }
}
