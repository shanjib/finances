import { ref } from 'vue'

export interface Transaction {
  id: number
  date: string
  account: string
  type: string
  amount: number
  counterparty: string
  category: string
  description: string
  created_at: string
}

export interface MonthlyCell {
  startOfDay: number
  delta: number | null
}

export interface MonthlyRow {
  date: string
  isToday: boolean
  cells: Record<string, MonthlyCell>
}

export interface MonthlySnapshot {
  accounts: string[]
  rows: MonthlyRow[]
}

const monthlySnapshot = ref<MonthlySnapshot | null>(null)
const loadingSnapshot = ref(false)

async function fetchMonthly(year: number, month: number) {
  loadingSnapshot.value = true
  try {
    const res = await fetch(`/api/monthly/${year}/${month}`)
    monthlySnapshot.value = await res.json()
  } finally {
    loadingSnapshot.value = false
  }
}

async function fetchTransactionsForDay(account: string, date: string): Promise<Transaction[]> {
  const res = await fetch(`/api/transactions?account=${encodeURIComponent(account)}&from=${date}&to=${date}`)
  const all: Transaction[] = await res.json()
  return all.filter(tx => tx.date === date && (tx.account === account || tx.counterparty === account))
}

async function createTransaction(data: Partial<Transaction>): Promise<Transaction> {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to create transaction')
  }
  return res.json()
}

async function updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction> {
  const res = await fetch(`/api/transactions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to update transaction')
  }
  return res.json()
}

async function deleteTransaction(id: number): Promise<void> {
  const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Failed to delete transaction')
  }
}

export function useTransactions() {
  return {
    monthlySnapshot,
    loadingSnapshot,
    fetchMonthly,
    fetchTransactionsForDay,
    createTransaction,
    updateTransaction,
    deleteTransaction,
  }
}
