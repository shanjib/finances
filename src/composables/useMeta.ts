import { ref, computed } from 'vue'

interface Meta {
  next_id: number
  account_order: string[]
  hidden_accounts: string[]
  categories: string[]
  types: string[]
  theme: 'light' | 'dark' | 'warm' | null
}

const meta = ref<Meta>({
  next_id: 1,
  account_order: [],
  hidden_accounts: [],
  categories: [],
  types: [],
  theme: 'light',
})
const loading = ref(false)

async function fetchMeta() {
  loading.value = true
  try {
    const res = await fetch('/api/meta')
    const data = await res.json()
    if (!data.hidden_accounts) data.hidden_accounts = []
    meta.value = data
  } finally {
    loading.value = false
  }
}

function applyTheme(theme: string) {
  document.documentElement.setAttribute('data-theme', theme)
}

function detectSystemTheme(): 'light' | 'dark' {
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  return 'light'
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

async function renameAccount(oldName: string, newName: string) {
  const res = await fetch('/api/meta/accounts/rename', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldName, newName }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  // Refresh meta
  await fetchMeta()
  return data
}

async function setAccountVisibility(name: string, visible: boolean) {
  const res = await fetch(`/api/meta/accounts/${encodeURIComponent(name)}/visibility`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visible }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  await fetchMeta()
  return data
}

async function createAccount(name: string, openingBalance: number, date: string) {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, openingBalance, date }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error)
  await fetchMeta()
  return data
}

// Auto-fetch on first use; apply theme to root element
fetchMeta().then(() => {
  if (!meta.value.theme) {
    const detected = detectSystemTheme()
    setTheme(detected)
  } else {
    applyTheme(meta.value.theme)
  }
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
    renameAccount,
    setAccountVisibility,
    createAccount,
  }
}
