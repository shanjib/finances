<template>
  <div class="grid-wrapper">
    <!-- Month nav -->
    <div class="month-nav">
      <button class="nav-btn nav-prev" @click="prevMonth">‹ {{ prevMonthLabel }}</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="nav-btn nav-next" @click="nextMonth">{{ nextMonthLabel }} ›</button>
    </div>

    <div v-if="loading" class="loading">Loading…</div>

    <div v-else-if="snapshot" class="table-scroll">
      <table class="grid-table">
        <thead>
          <tr>
            <th class="date-col" rowspan="2">Date</th>
            <th
              v-for="acct in snapshot.accounts"
              :key="acct"
              colspan="2"
              class="account-header acct-start"
            >
              {{ acct }}
            </th>
          </tr>
          <tr>
            <template v-for="acct in snapshot.accounts" :key="acct">
              <th class="sub-header acct-start">Start</th>
              <th class="sub-header">Delta</th>
            </template>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, rowIdx) in snapshot.rows"
            :key="row.date"
            :class="{ today: row.isToday }"
          >
            <td class="date-cell">{{ formatDateLabel(row.date) }}</td>
            <template v-for="(acct, acctIdx) in snapshot.accounts" :key="acct">
              <td class="amount-td start-of-day acct-start" :class="valueClass(row.cells[acct]?.startOfDay)">
                <span class="dollar">$</span>
                <span class="value">{{ formatNumber(row.cells[acct]?.startOfDay ?? 0) }}</span>
              </td>
              <td
                class="amount-td delta-cell"
                :class="[deltaClass(row.cells[acct]?.delta), { 'grid-focused': isFocused(rowIdx, acctIdx) }]"
                :data-cell="`${rowIdx}:${acctIdx}`"
                @click="openPopup(acct, row.date, $event)"
              >
                <template v-if="row.cells[acct]?.delta !== null && row.cells[acct]?.delta !== undefined">
                  <span class="dollar">$</span>
                  <span class="value bold">{{ formatNumber(row.cells[acct]?.delta ?? 0) }}</span>
                </template>
                <span v-else class="empty-delta">·</span>
              </td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <TransactionPopup
      v-if="popup"
      :account="popup.account"
      :date="popup.date"
      :anchor-rect="popup.rect"
      @close="popup = null"
      @updated="onTransactionUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import TransactionPopup from './TransactionPopup.vue'
import { useTransactions } from '../composables/useTransactions'
import { useUI, isTextEntry } from '../composables/useUI'

const { monthlySnapshot, loadingSnapshot, fetchMonthly } = useTransactions()
const { keyboardBusy } = useUI()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth() + 1)

const loading = computed(() => loadingSnapshot.value)
const snapshot = computed(() => monthlySnapshot.value)

const popup = ref<{ account: string; date: string; rect: DOMRect } | null>(null)

const monthLabel = computed(() => {
  const d = new Date(currentYear.value, currentMonth.value - 1, 1)
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
})

const prevMonthLabel = computed(() => {
  const m = currentMonth.value === 1 ? 12 : currentMonth.value - 1
  const y = currentMonth.value === 1 ? currentYear.value - 1 : currentYear.value
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
})

const nextMonthLabel = computed(() => {
  const m = currentMonth.value === 12 ? 1 : currentMonth.value + 1
  const y = currentMonth.value === 12 ? currentYear.value + 1 : currentYear.value
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' })
})

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
  const month = d.toLocaleDateString('en-US', { month: 'short' }).slice(0, 3)
  const date = String(d.getDate()).padStart(2, '0')
  return `${day} ${month} ${date}`
}

function formatNumber(val: number): string {
  const abs = Math.abs(val)
  const formatted = abs.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return val < 0 ? `-${formatted}` : formatted
}

function valueClass(val: number | undefined) {
  if (val === undefined || val === null) return ''
  return val < 0 ? 'neg-muted' : 'pos-muted'
}

function deltaClass(delta: number | null | undefined) {
  if (delta === null || delta === undefined) return 'empty'
  return delta < 0 ? 'neg-vivid' : 'pos-vivid'
}

function openPopup(account: string, date: string, event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  popup.value = { account, date, rect }
}

async function onTransactionUpdated() {
  await fetchMonthly(currentYear.value, currentMonth.value)
}

// ---- Keyboard navigation -------------------------------------------------
// Only delta cells are reachable. `focusedCell` is a row/account index pair;
// null means the grid doesn't hold focus (so ← → navigate months).
const focusedCell = ref<{ row: number; acct: number } | null>(null)
let pendingFocusToday = false

function isFocused(row: number, acct: number) {
  return focusedCell.value?.row === row && focusedCell.value?.acct === acct
}

function todayRowIndex(): number {
  const rows = snapshot.value?.rows ?? []
  const idx = rows.findIndex(r => r.isToday)
  return idx === -1 ? 0 : idx
}

function setFocus(row: number, acct: number) {
  const rows = snapshot.value?.rows ?? []
  const accts = snapshot.value?.accounts ?? []
  if (!rows.length || !accts.length) {
    focusedCell.value = null
    return
  }
  focusedCell.value = {
    row: Math.max(0, Math.min(row, rows.length - 1)),
    acct: Math.max(0, Math.min(acct, accts.length - 1)),
  }
  nextTick(() => {
    document.querySelector('.delta-cell.grid-focused')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
}

function focusTodayFirstCell() {
  setFocus(todayRowIndex(), 0)
}

function openFocusedCell() {
  const cell = focusedCell.value
  const snap = snapshot.value
  if (!cell || !snap) return
  const el = document.querySelector<HTMLElement>(`[data-cell="${cell.row}:${cell.acct}"]`)
  if (!el) return
  popup.value = {
    account: snap.accounts[cell.acct],
    date: snap.rows[cell.row].date,
    rect: el.getBoundingClientRect(),
  }
}

function goToToday() {
  const t = new Date()
  const changed = currentYear.value !== t.getFullYear() || currentMonth.value !== t.getMonth() + 1
  if (changed) {
    pendingFocusToday = focusedCell.value !== null
    currentYear.value = t.getFullYear()
    currentMonth.value = t.getMonth() + 1
  } else if (focusedCell.value) {
    focusTodayFirstCell()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (isTextEntry(e.target) || keyboardBusy.value) return

  const key = e.key.toLowerCase()
  const cell = focusedCell.value

  if (key === 'f') {
    e.preventDefault()
    focusTodayFirstCell()
  } else if (key === 't') {
    e.preventDefault()
    goToToday()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    if (cell) setFocus(cell.row, cell.acct - 1)
    else prevMonth()
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    if (cell) setFocus(cell.row, cell.acct + 1)
    else nextMonth()
  } else if (cell && e.key === 'ArrowUp') {
    e.preventDefault()
    setFocus(cell.row - 1, cell.acct)
  } else if (cell && e.key === 'ArrowDown') {
    e.preventDefault()
    setFocus(cell.row + 1, cell.acct)
  } else if (cell && e.key === 'Enter') {
    e.preventDefault()
    openFocusedCell()
  } else if (cell && e.key === 'Escape') {
    focusedCell.value = null
  }
}

watch([currentYear, currentMonth], async () => {
  const keepFocus = pendingFocusToday
  pendingFocusToday = false
  if (!keepFocus) focusedCell.value = null
  await fetchMonthly(currentYear.value, currentMonth.value)
  if (keepFocus) focusTodayFirstCell()
})

// A reload (e.g. after editing a transaction) can change the account columns
watch(snapshot, () => {
  const cell = focusedCell.value
  if (cell) setFocus(cell.row, cell.acct)
})

onMounted(() => {
  fetchMonthly(currentYear.value, currentMonth.value)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.grid-wrapper {
  padding: 16px;
}

.month-nav {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-bottom: 16px;
}

.nav-btn {
  font-size: 13px;
  padding: 4px 10px;
  color: var(--accent);
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.nav-btn:hover {
  background: var(--surface);
}

.nav-prev {
  justify-self: start;
}

.nav-next {
  justify-self: end;
}

.month-label {
  font-size: 16px;
  font-weight: 600;
  text-align: center;
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

.table-scroll {
  overflow-x: auto;
}

.grid-table {
  border-collapse: collapse;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  width: max-content;
  min-width: 100%;
}

.grid-table th,
.grid-table td {
  border: 1px solid var(--border);
}

.grid-table th {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--header-bg);
  color: var(--text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 5px 8px;
  white-space: nowrap;
}

.account-header {
  text-align: center;
  font-weight: 600;
  color: var(--text) !important;
}

.acct-start {
  border-left: 2px solid var(--account-divider) !important;
}

.sub-header {
  font-size: 10px;
  text-align: center;
  padding: 4px 6px;
}

.date-col {
  text-align: left;
  padding: 5px 8px;
  white-space: nowrap;
}

.date-cell {
  padding: 4px 8px;
  white-space: nowrap;
  font-size: 12px;
  color: var(--text-muted);
  user-select: none;
}

tr.today {
  background: var(--today-bg);
}

tr.today .date-cell {
  color: var(--text);
  font-weight: 600;
}

.amount-td {
  padding: 4px 6px;
  white-space: nowrap;
  min-width: 90px;
  display: table-cell;
}

.amount-td.start-of-day {
  display: table-cell;
}

.amount-td {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Override table layout for flex */
.grid-table td.amount-td {
  display: table-cell;
}

/* Use inner span layout for $ alignment */
.amount-td {
  position: relative;
}

.dollar {
  float: left;
  margin-right: 2px;
}

.value {
  float: right;
}

.value.bold {
  font-weight: 700;
}

.amount-td::after {
  content: '';
  display: table;
  clear: both;
}

/* Colors */
.pos-muted .value, .pos-muted .dollar { color: var(--positive); }
.neg-muted .value, .neg-muted .dollar { color: var(--negative); }
.pos-vivid .value, .pos-vivid .dollar { color: var(--positive-vivid); }
.neg-vivid .value, .neg-vivid .dollar { color: var(--negative-vivid); }

.delta-cell {
  cursor: pointer;
  scroll-margin: 60px 20px 20px 20px;
}

/* Keyboard focus indicator: inset ring so it survives the collapsed borders and any row highlight */
.delta-cell.grid-focused {
  box-shadow: inset 0 0 0 2px var(--focus-ring);
  background: var(--surface);
}

.delta-cell:hover {
  background: var(--surface);
  opacity: 0.85;
}

.empty .empty-delta {
  color: var(--muted-cell);
  display: block;
  text-align: center;
}

.empty {
  cursor: pointer;
  color: var(--muted-cell);
}
</style>
