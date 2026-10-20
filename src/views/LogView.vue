<template>
  <div class="log-page">
    <!-- Filter bar -->
    <div class="filter-bar">
      <div class="filter-row">
        <div class="filter-group">
          <label>From</label>
          <input type="date" v-model="filterFrom" />
        </div>
        <div class="filter-group">
          <label>To</label>
          <input type="date" v-model="filterTo" />
        </div>
        <div class="filter-group">
          <label>Account</label>
          <select v-model="filterAccount">
            <option value="">All Accounts</option>
            <option v-for="a in meta.account_order" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Type</label>
          <select v-model="filterType">
            <option value="">All Types</option>
            <option v-for="t in meta.types" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Category</label>
          <select v-model="filterCategory">
            <option value="">All Categories</option>
            <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <button class="btn" @click="applyFilters">Filter</button>
        <button class="btn btn-ghost" @click="clearFilters">Clear</button>
      </div>
      <div class="filter-actions">
        <button class="btn" @click="exportCSV">Export CSV</button>
        <button class="btn btn-ghost" disabled title="Coming in a future version">Import CSV</button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrapper">
      <table class="log-table" v-if="rows.length || editingNewRow">
        <thead>
          <tr>
            <th @click="setSort('date')" class="sortable">Date <span class="sort-arrow">{{ sortArrow('date') }}</span></th>
            <th @click="setSort('account')" class="sortable">Account <span class="sort-arrow">{{ sortArrow('account') }}</span></th>
            <th @click="setSort('type')" class="sortable">Type <span class="sort-arrow">{{ sortArrow('type') }}</span></th>
            <th @click="setSort('amount')" class="sortable">Amount <span class="sort-arrow">{{ sortArrow('amount') }}</span></th>
            <th @click="setSort('counterparty')" class="sortable">Counterparty <span class="sort-arrow">{{ sortArrow('counterparty') }}</span></th>
            <th @click="setSort('category')" class="sortable">Category <span class="sort-arrow">{{ sortArrow('category') }}</span></th>
            <th @click="setSort('description')" class="sortable">Description <span class="sort-arrow">{{ sortArrow('description') }}</span></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tx in sortedRows"
            :key="tx.id"
            :class="{ editing: editingId === tx.id, 'row-focused': focusedId === tx.id && editingId !== tx.id }"
            @click="focusedId = tx.id"
            @keydown.enter="onRowEnter($event, () => saveEdit(tx.id))"
          >
            <template v-if="editingId === tx.id">
              <td><input type="date" v-model="editForm.date" /></td>
              <td>
                <select v-model="editForm.account">
                  <option v-for="a in allAccounts" :key="a" :value="a">{{ a }}</option>
                </select>
              </td>
              <td>
                <select v-model="editForm.type">
                  <option v-for="t in meta.types" :key="t" :value="t">{{ t }}</option>
                </select>
              </td>
              <td class="amount-with-refresh">
                <input type="number" step="0.01" v-model="editForm.amount" />
                <button
                  v-if="editForm.type === 'cc_payment' && editForm.counterparty"
                  class="icon-btn refresh-btn"
                  title="Refresh to current balance"
                  @click="refreshEditAmount"
                >↻</button>
              </td>
              <td>
                <select v-if="needsCounterparty(editForm.type)" v-model="editForm.counterparty">
                  <option value="">— select account —</option>
                  <option v-for="a in allAccounts" :key="a" :value="a">{{ a }}</option>
                </select>
                <span v-else class="muted">—</span>
              </td>
              <td>
                <select v-model="editForm.category">
                  <option value="">—</option>
                  <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </td>
              <td><input v-model="editForm.description" /></td>
              <td class="row-actions">
                <button class="icon-btn confirm" @click="saveEdit(tx.id)" title="Save" aria-label="Save">✓</button>
                <button class="icon-btn cancel" @click="cancelEdit" title="Cancel" aria-label="Cancel">✕</button>
              </td>
            </template>
            <template v-else>
              <td>{{ tx.date }}</td>
              <td>{{ tx.account }}</td>
              <td>{{ tx.type }}</td>
              <td class="amount-cell" :class="txAmountClass(tx)">
                <span class="dollar">$</span>
                <span class="val">{{ formatAmt(tx.amount) }}</span>
              </td>
              <td>{{ tx.counterparty || '—' }}</td>
              <td>{{ tx.category || '—' }}</td>
              <td>{{ tx.description || '—' }}</td>
              <td class="row-actions">
                <button class="icon-btn" @click="duplicateTx(tx)" title="Duplicate">📋</button>
                <button class="icon-btn" @click="saveTplTx = tx" title="Save as template">🔖</button>
                <button class="icon-btn" @click="startEdit(tx)" title="Edit">✏️</button>
                <button class="icon-btn" @click="confirmDelete(tx.id)" title="Delete">🗑️</button>
              </td>
            </template>
          </tr>

          <!-- New row -->
          <tr v-if="editingNewRow" class="editing new-row" @keydown.enter="onRowEnter($event, () => saveNew(true))">
            <td><input type="date" v-model="newForm.date" /></td>
            <td>
              <select v-model="newForm.account" :class="{ error: newErrors.account }">
                <option value="">— select account —</option>
                <option v-for="a in allAccounts" :key="a" :value="a">{{ a }}</option>
              </select>
            </td>
            <td>
              <select v-model="newForm.type" ref="newTypeSelect">
                <option v-for="t in meta.types" :key="t" :value="t">{{ t }}</option>
              </select>
            </td>
            <td><input type="number" step="0.01" v-model="newForm.amount" ref="newAmountInput" :class="{ error: newErrors.amount }" /></td>
            <td>
              <select v-if="needsCounterparty(newForm.type)" v-model="newForm.counterparty" :class="{ error: newErrors.counterparty }">
                <option value="">— select account —</option>
                <option v-for="a in allAccounts" :key="a" :value="a">{{ a }}</option>
              </select>
              <span v-else class="muted">—</span>
            </td>
            <td>
              <select v-model="newForm.category">
                <option value="">—</option>
                <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
              </select>
            </td>
            <td><input v-model="newForm.description" /></td>
            <td class="row-actions">
              <button class="icon-btn confirm" @click="saveNew(false)" title="Save" aria-label="Save">✓</button>
              <button class="icon-btn cancel" @click="editingNewRow = false" title="Cancel" aria-label="Cancel">✕</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else-if="!loading" class="empty-msg">No transactions match the current filters.</p>
      <p v-if="loading" class="empty-msg">Loading…</p>
    </div>

    <div class="add-btn">
      <TemplateSplitButton
        ref="splitBtn"
        label="+ Add Transaction"
        :disabled="editingNewRow || editingId !== null"
        :open-up="true"
        @add="startNew()"
        @pick="onPickTemplate"
      />
    </div>

    <SaveTemplateDialog v-if="saveTplTx" :tx="saveTplTx" @close="saveTplTx = null" />

    <ConfirmModal
      v-if="deleteTargetId !== null"
      message="Delete this transaction?"
      confirm-label="Delete"
      focus-confirm
      @confirm="executeDelete"
      @cancel="deleteTargetId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import TemplateSplitButton from '../components/TemplateSplitButton.vue'
import SaveTemplateDialog from '../components/SaveTemplateDialog.vue'
import { useMeta } from '../composables/useMeta'
import { useUI, isTextEntry } from '../composables/useUI'
import type { Template } from '../composables/useTemplates'
import { todayLocal, firstOfMonthLocal, dayBefore } from '../utils/date'
import { useTransactions, type Transaction } from '../composables/useTransactions'

const { meta } = useMeta()
const { createTransaction, updateTransaction, deleteTransaction } = useTransactions()

const allAccounts = computed(() => [
  ...meta.value.account_order,
  ...(meta.value.hidden_accounts || []).filter(a => !meta.value.account_order.includes(a)),
])

const today = todayLocal()
const firstOfMonth = firstOfMonthLocal()
const { keyboardBusy } = useUI()

const filterFrom = ref(firstOfMonth)
const filterTo = ref(today)
const filterAccount = ref('')
const filterType = ref('')
const filterCategory = ref('')

const rows = ref<Transaction[]>([])
const loading = ref(false)

const editingId = ref<number | null>(null)
const editForm = reactive({ date: '', account: '', type: '', amount: '', counterparty: '', category: '', description: '' })

const editingNewRow = ref(false)
const newForm = reactive({ date: today, account: '', type: 'expense', amount: '', counterparty: '', category: '', description: '' })
const newAmountInput = ref<HTMLInputElement | null>(null)
const newTypeSelect = ref<HTMLSelectElement | null>(null)
const newErrors = reactive({ account: false, amount: false, counterparty: false })
const splitBtn = ref<InstanceType<typeof TemplateSplitButton> | null>(null)
const saveTplTx = ref<Transaction | null>(null)
const saving = ref(false)

const deleteTargetId = ref<number | null>(null)

// Keyboard-focused table row (by id, so it survives sorting and edits); null = none
const focusedId = ref<number | null>(null)

const sortCol = ref('date')
const sortDir = ref<'asc' | 'desc'>('desc')

function needsCounterparty(type: string) {
  return type === 'transfer' || type === 'cc_payment'
}

function formatAmt(amount: number) {
  return Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function txAmountClass(tx: Transaction) {
  return tx.amount < 0 ? 'neg' : 'pos'
}

function setSort(col: string) {
  if (sortCol.value === col) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortCol.value = col
    sortDir.value = col === 'date' ? 'desc' : 'asc'
  }
}

function sortArrow(col: string) {
  if (sortCol.value !== col) return ''
  return sortDir.value === 'asc' ? '↑' : '↓'
}

const sortedRows = computed(() => {
  const arr = [...rows.value]
  const col = sortCol.value as keyof Transaction
  const dir = sortDir.value === 'asc' ? 1 : -1
  arr.sort((a, b) => {
    const av = a[col] ?? ''
    const bv = b[col] ?? ''
    if (av < bv) return -dir
    if (av > bv) return dir
    if (col === 'date') {
      return (a.created_at < b.created_at ? 1 : -1) * (sortDir.value === 'asc' ? 1 : -1)
    }
    return 0
  })
  return arr
})

async function loadRows() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (filterFrom.value) params.set('from', filterFrom.value)
    if (filterTo.value) params.set('to', filterTo.value)
    if (filterAccount.value) params.set('account', filterAccount.value)
    if (filterType.value) params.set('type', filterType.value)
    if (filterCategory.value) params.set('category', filterCategory.value)
    const res = await fetch(`/api/transactions?${params}`)
    rows.value = await res.json()
  } finally {
    loading.value = false
  }
  focusedId.value = sortedRows.value[0]?.id ?? null
}

function moveRowFocus(dir: 1 | -1) {
  const list = sortedRows.value
  if (!list.length) return
  const idx = list.findIndex(tx => tx.id === focusedId.value)
  const next = idx === -1 ? (dir > 0 ? 0 : list.length - 1) : Math.max(0, Math.min(list.length - 1, idx + dir))
  focusedId.value = list[next].id
}

watch(focusedId, () => {
  nextTick(() => document.querySelector('.log-table tr.row-focused')?.scrollIntoView({ block: 'nearest' }))
})

function applyFilters() {
  loadRows()
}

function clearFilters() {
  filterFrom.value = firstOfMonth
  filterTo.value = today
  filterAccount.value = ''
  filterType.value = ''
  filterCategory.value = ''
  loadRows()
}

function exportCSV() {
  const params = new URLSearchParams()
  if (filterFrom.value) params.set('from', filterFrom.value)
  if (filterTo.value) params.set('to', filterTo.value)
  if (filterAccount.value) params.set('account', filterAccount.value)
  if (filterType.value) params.set('type', filterType.value)
  if (filterCategory.value) params.set('category', filterCategory.value)
  window.location.href = `/api/transactions/export?${params}`
}

function startEdit(tx: Transaction, fromKeyboard = false) {
  editingId.value = tx.id
  focusedId.value = tx.id
  Object.assign(editForm, {
    date: tx.date,
    account: tx.account,
    type: tx.type,
    amount: String(tx.amount),
    counterparty: tx.counterparty,
    category: tx.category,
    description: tx.description,
  })
  if (fromKeyboard) {
    nextTick(() => document.querySelector<HTMLElement>('.log-table tr.editing input, .log-table tr.editing select')?.focus())
  }
}

function cancelEdit() {
  editingId.value = null
}

async function saveEdit(id: number) {
  const idx = rows.value.findIndex(tx => tx.id === id)
  if (idx === -1) return
  const updated = await updateTransaction(id, {
    date: editForm.date,
    account: editForm.account,
    type: editForm.type,
    amount: parseFloat(editForm.amount),
    counterparty: editForm.counterparty,
    category: editForm.category,
    description: editForm.description,
  })
  rows.value[idx] = updated
  editingId.value = null
}

function startNew(template?: Template, carry?: { date: string; account: string }) {
  editingNewRow.value = true
  newErrors.account = false
  newErrors.amount = false
  newErrors.counterparty = false
  Object.assign(newForm, {
    date: carry?.date ?? today,
    // Templates never store an account, so it stays blank until the user picks one
    account: template ? '' : (carry?.account ?? meta.value.account_order[0] ?? ''),
    type: 'expense',
    amount: '',
    counterparty: '',
    category: '',
    description: '',
  })
  if (template) applyTemplate(template)
  // Auto-advanced rows start on the type dropdown; template rows on the amount
  nextTick(() => (carry && !template ? newTypeSelect.value : newAmountInput.value)?.focus())
}

function applyTemplate(t: Template) {
  Object.assign(newForm, {
    type: t.type,
    amount: String(t.amount),
    counterparty: t.counterparty,
    category: t.category,
    description: t.description,
  })
}

function onPickTemplate(t: Template) {
  if (editingNewRow.value) {
    applyTemplate(t)
    nextTick(() => newAmountInput.value?.focus())
  } else if (editingId.value !== null) {
    Object.assign(editForm, {
      type: t.type,
      amount: String(t.amount),
      counterparty: t.counterparty,
      category: t.category,
      description: t.description,
    })
  } else {
    startNew(t)
  }
}

/** Enter in a row's field saves it (buttons keep their own Enter/click behaviour). */
function onRowEnter(e: KeyboardEvent, save: () => void) {
  if ((e.target as HTMLElement).tagName === 'BUTTON') return
  e.preventDefault()
  save()
}

function isBlankNewRow() {
  return !newForm.amount && !newForm.description && !newForm.counterparty && !newForm.category
}

async function saveNew(advance = false) {
  newErrors.account = !newForm.account
  newErrors.amount = !newForm.amount || isNaN(parseFloat(newForm.amount))
  newErrors.counterparty = needsCounterparty(newForm.type) && !newForm.counterparty
  if (newErrors.account || newErrors.amount || newErrors.counterparty) return
  if (saving.value) return

  saving.value = true
  const carry = { date: newForm.date, account: newForm.account }
  try {
    const tx = await createTransaction({
      date: newForm.date,
      account: newForm.account,
      type: newForm.type,
      amount: parseFloat(newForm.amount),
      counterparty: newForm.counterparty,
      category: newForm.category,
      description: newForm.description,
    })
    rows.value.push(tx)
    editingNewRow.value = false
  } finally {
    saving.value = false
  }
  // Auto-advance: open a fresh row, keeping the date/account context of the one just saved
  if (advance) startNew(undefined, carry)
}

function duplicateTx(tx: Transaction) {
  editingNewRow.value = true
  Object.assign(newForm, {
    date: today,
    account: tx.account,
    type: tx.type,
    amount: String(tx.amount),
    counterparty: tx.counterparty,
    category: tx.category,
    description: tx.description,
  })
  nextTick(() => newAmountInput.value?.focus())
}

function confirmDelete(id: number) {
  focusedId.value = id
  deleteTargetId.value = id
}

async function executeDelete() {
  if (deleteTargetId.value === null) return
  const id = deleteTargetId.value
  const idx = sortedRows.value.findIndex(tx => tx.id === id)
  await deleteTransaction(id)
  rows.value = rows.value.filter(tx => tx.id !== id)
  deleteTargetId.value = null
  // Focus the row that took its place (or the new last row); no rows left → + button
  const list = sortedRows.value
  if (list.length) {
    focusedId.value = list[Math.min(Math.max(idx, 0), list.length - 1)].id
  } else {
    focusedId.value = null
    nextTick(() => splitBtn.value?.focus())
  }
}

async function refreshEditAmount() {
  if (!editForm.counterparty) return
  const asOf = dayBefore(editForm.date)
  const res = await fetch(`/api/balance/${encodeURIComponent(editForm.counterparty)}?asOf=${asOf}`)
  const data = await res.json()
  if (data.balance < 0) {
    editForm.amount = String(Math.abs(data.balance))
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (saveTplTx.value) return
  if (deleteTargetId.value !== null) {
    if (e.key === 'Escape') {
      e.preventDefault()
      deleteTargetId.value = null
    }
    return
  }

  if (e.key === 'Escape') {
    if (splitBtn.value?.isOpen()) {
      splitBtn.value.closeMenu()
    } else if (editingNewRow.value) {
      if (isBlankNewRow()) editingNewRow.value = false // ends the auto-advance streak
      else saveNew(false)
    } else if (editingId.value !== null) {
      saveEdit(editingId.value)
    } else {
      return
    }
    e.preventDefault()
    return
  }

  // Page-level shortcuts are suppressed while typing in a field or when a modal is up
  if (keyboardBusy.value || isTextEntry(e.target)) return
  // The template menu handles its own arrow keys
  if (splitBtn.value?.isOpen()) return

  const key = e.key.toLowerCase()
  const noRowEditing = !editingNewRow.value && editingId.value === null
  const focusedTx = rows.value.find(tx => tx.id === focusedId.value)
  if (noRowEditing && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault()
    moveRowFocus(e.key === 'ArrowDown' ? 1 : -1)
  } else if (noRowEditing && key === 'e' && focusedTx) {
    e.preventDefault()
    startEdit(focusedTx, true)
  } else if (noRowEditing && key === 'd' && focusedTx) {
    e.preventDefault()
    confirmDelete(focusedTx.id)
  } else if (key === 't') {
    e.preventDefault()
    splitBtn.value?.openMenu()
  }
}

onMounted(() => {
  loadRows()
  document.addEventListener('keydown', onKeydown)
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

// Auto-fill amount with current balance when cc_payment counterparty is selected
watch(
  () => [newForm.type, newForm.counterparty] as const,
  async ([type, counterparty]) => {
    if (type === 'cc_payment' && counterparty && !newForm.amount) {
      const asOf = dayBefore(newForm.date)
      const res = await fetch(`/api/balance/${encodeURIComponent(counterparty)}?asOf=${asOf}`)
      const data = await res.json()
      if (data.balance < 0) {
        newForm.amount = String(Math.abs(data.balance))
      }
    }
  }
)
</script>

<style scoped>
.log-page {
  padding: 16px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: flex-end;
  flex: 1;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-group input,
.filter-group select {
  min-width: 110px;
}

.filter-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-wrapper {
  overflow-x: auto;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
}

.log-table th {
  text-align: left;
  padding: 6px 8px;
  background: var(--header-bg);
  border-bottom: 2px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.log-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.log-table th.sortable:hover {
  background: var(--border);
}

.sort-arrow {
  color: var(--accent);
}

.log-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

/* Keyboard row focus: same ring as the grid's focused cell */
tr.row-focused {
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

tr.editing td {
  background: var(--surface);
}

.log-table td input,
.log-table td select {
  width: 100%;
  box-sizing: border-box;
}

.row-actions {
  white-space: nowrap;
}

.amount-cell {
  white-space: nowrap;
}

.amount-cell .dollar {
  float: left;
  margin-right: 2px;
}

.amount-cell .val {
  float: right;
}

.amount-cell::after {
  content: '';
  display: table;
  clear: both;
}

.amount-cell.pos .dollar,
.amount-cell.pos .val { color: var(--positive); }
.amount-cell.neg .dollar,
.amount-cell.neg .val { color: var(--negative-vivid); }

.amount-with-refresh {
  display: flex;
  align-items: center;
  gap: 2px;
}

.amount-with-refresh input {
  flex: 1;
  min-width: 0;
}

.refresh-btn {
  flex-shrink: 0;
  font-size: 14px;
  padding: 0 3px;
  color: var(--text-muted);
}

.muted {
  color: var(--text-muted);
}

.empty-msg {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.add-btn {
  margin-top: 12px;
}

input.error,
select.error {
  border-color: var(--danger);
  outline-color: var(--danger);
}
</style>
