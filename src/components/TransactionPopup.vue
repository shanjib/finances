<template>
  <Teleport to="body">
    <div class="popup-backdrop" @mousedown.self="handleBackdropClick" />
    <div class="popup" :style="popupStyle" ref="popupEl">
      <div class="popup-header">
        <span class="popup-title">{{ account }} · {{ formatDate(date) }}</span>
        <button class="popup-close" @click="$emit('close')">×</button>
      </div>

      <table class="tx-table" v-if="transactions.length || editingNew">
        <thead>
          <tr>
            <th>Type</th>
            <th>Amount</th>
            <th>Counterparty</th>
            <th>Category</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="tx in transactions"
            :key="tx.id"
            :class="{ 'editing': editingId === tx.id }"
          >
            <template v-if="editingId === tx.id">
              <td>
                <select v-model="editForm.type" :class="{ error: errors.type }">
                  <option v-for="t in meta.types" :key="t" :value="t">{{ t }}</option>
                  <option value="__add__">+ Add new</option>
                </select>
              </td>
              <td>
                <input
                  type="number"
                  step="0.01"
                  v-model="editForm.amount"
                  :class="{ error: errors.amount }"
                  style="width:80px"
                />
              </td>
              <td>
                <input
                  v-if="needsCounterparty(editForm.type)"
                  v-model="editForm.counterparty"
                  :class="{ error: errors.counterparty }"
                  placeholder="account"
                  style="width:90px"
                />
                <span v-else class="muted">—</span>
              </td>
              <td>
                <select v-model="editForm.category">
                  <option value="">—</option>
                  <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
                  <option value="__add__">+ Add new</option>
                </select>
              </td>
              <td>
                <input v-model="editForm.description" style="width:120px" @keydown.enter="saveEdit(tx.id)" />
              </td>
              <td class="tx-actions">
                <button class="icon-btn" @click="saveEdit(tx.id)" title="Save">✓</button>
                <button class="icon-btn" @click="cancelEdit" title="Cancel">✕</button>
              </td>
            </template>
            <template v-else>
              <td>{{ tx.type }}</td>
              <td class="amount-cell" :class="amountClass(tx)">{{ formatAmount(tx) }}</td>
              <td>{{ tx.counterparty || '—' }}</td>
              <td>{{ tx.category || '—' }}</td>
              <td>{{ tx.description || '—' }}</td>
              <td class="tx-actions">
                <button class="icon-btn" @click="startEdit(tx)" title="Edit">✏️</button>
                <button class="icon-btn" @click="confirmDelete(tx.id)" title="Delete">🗑️</button>
              </td>
            </template>
          </tr>

          <!-- New row -->
          <tr v-if="editingNew" class="editing">
            <td>
              <select v-model="newForm.type" :class="{ error: newErrors.type }">
                <option v-for="t in meta.types" :key="t" :value="t">{{ t }}</option>
                <option value="__add__">+ Add new</option>
              </select>
            </td>
            <td>
              <input
                type="number"
                step="0.01"
                v-model="newForm.amount"
                :class="{ error: newErrors.amount }"
                style="width:80px"
                ref="amountInput"
              />
            </td>
            <td>
              <input
                v-if="needsCounterparty(newForm.type)"
                v-model="newForm.counterparty"
                :class="{ error: newErrors.counterparty }"
                placeholder="account"
                style="width:90px"
              />
              <span v-else class="muted">—</span>
            </td>
            <td>
              <select v-model="newForm.category">
                <option value="">—</option>
                <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
                <option value="__add__">+ Add new</option>
              </select>
            </td>
            <td>
              <input v-model="newForm.description" style="width:120px" @keydown.enter="saveNew" />
            </td>
            <td class="tx-actions">
              <button class="icon-btn" @click="saveNew" title="Save">✓</button>
              <button class="icon-btn" @click="cancelNew" title="Cancel">✕</button>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="!transactions.length && !editingNew" class="empty-msg">No transactions for this day.</p>

      <div class="popup-footer">
        <button class="btn" @click="startNew" :disabled="editingNew || editingId !== null">+ Add</button>
      </div>
    </div>

    <ConfirmModal
      v-if="deleteTargetId !== null"
      message="Delete this transaction?"
      confirm-label="Delete"
      @confirm="executeDelete"
      @cancel="deleteTargetId = null"
    />

    <!-- Add new type/category inline prompt -->
    <div v-if="addingNewMeta" class="add-meta-prompt" @click.self="addingNewMeta = null">
      <div class="add-meta-box">
        <p>Add new {{ addingNewMeta.field }}:</p>
        <input v-model="addingNewMeta.value" @keydown.enter="saveNewMeta" autofocus />
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn" @click="saveNewMeta">Add</button>
          <button class="btn btn-ghost" @click="addingNewMeta = null">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue'
import ConfirmModal from './ConfirmModal.vue'
import { useMeta } from '../composables/useMeta'
import { useTransactions, type Transaction } from '../composables/useTransactions'

const props = defineProps<{
  account: string
  date: string
  anchorRect: DOMRect
}>()

const emit = defineEmits<{
  close: []
  updated: []
}>()

const { meta, addCategory, addType } = useMeta()
const { fetchTransactionsForDay, createTransaction, updateTransaction, deleteTransaction } = useTransactions()

const transactions = ref<Transaction[]>([])
const popupEl = ref<HTMLElement | null>(null)
const amountInput = ref<HTMLInputElement | null>(null)

const editingId = ref<number | null>(null)
const editForm = reactive({ type: '', amount: '', counterparty: '', category: '', description: '' })
const errors = reactive({ type: false, amount: false, counterparty: false })

const editingNew = ref(false)
const newForm = reactive({ type: 'expense', amount: '', counterparty: '', category: '', description: '' })
const newErrors = reactive({ type: false, amount: false, counterparty: false })

const deleteTargetId = ref<number | null>(null)

const addingNewMeta = ref<{ field: 'category' | 'type', value: string, target: 'edit' | 'new' } | null>(null)

// Popup positioning
const popupStyle = computed(() => {
  const rect = props.anchorRect
  const vpW = window.innerWidth
  const vpH = window.innerHeight
  const popW = 640
  const popH = 400

  let left: number
  let top = Math.min(rect.bottom + 4, vpH - popH - 8)
  if (top < 8) top = 8

  if (rect.left < vpW / 2) {
    left = Math.min(rect.right + 4, vpW - popW - 8)
  } else {
    left = Math.max(rect.left - popW - 4, 8)
  }

  return {
    position: 'fixed' as const,
    top: `${top}px`,
    left: `${left}px`,
    width: `${popW}px`,
    maxHeight: `${Math.min(500, vpH - top - 8)}px`,
    zIndex: 500,
  }
})

async function load() {
  transactions.value = await fetchTransactionsForDay(props.account, props.date)
}

load()

function needsCounterparty(type: string) {
  return type === 'transfer' || type === 'cc_payment'
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatAmount(tx: Transaction) {
  return `$${Math.abs(tx.amount).toFixed(2)}`
}

function amountClass(tx: Transaction) {
  const isNeg = tx.type === 'expense' || (tx.type === 'transfer' && tx.account === props.account)
  return isNeg ? 'neg' : 'pos'
}

function startEdit(tx: Transaction) {
  editingId.value = tx.id
  Object.assign(editForm, {
    type: tx.type,
    amount: String(tx.amount),
    counterparty: tx.counterparty,
    category: tx.category,
    description: tx.description,
  })
  errors.type = false
  errors.amount = false
  errors.counterparty = false
}

function cancelEdit() {
  editingId.value = null
}

function validateForm(form: typeof editForm | typeof newForm, errs: typeof errors | typeof newErrors) {
  errs.type = !form.type || form.type === '__add__'
  errs.amount = !form.amount || isNaN(parseFloat(form.amount as string))
  errs.counterparty = needsCounterparty(form.type) && !form.counterparty
  return !errs.type && !errs.amount && !errs.counterparty
}

async function saveEdit(id: number) {
  if (editForm.type === '__add__') {
    addingNewMeta.value = { field: 'type', value: '', target: 'edit' }
    return
  }
  if (editForm.category === '__add__') {
    addingNewMeta.value = { field: 'category', value: '', target: 'edit' }
    return
  }
  if (!validateForm(editForm, errors)) return

  await updateTransaction(id, {
    type: editForm.type,
    amount: parseFloat(editForm.amount as string),
    counterparty: editForm.counterparty,
    category: editForm.category,
    description: editForm.description,
  })
  editingId.value = null
  await load()
  emit('updated')
}

function startNew() {
  editingNew.value = true
  Object.assign(newForm, { type: 'expense', amount: '', counterparty: '', category: '', description: '' })
  newErrors.type = false
  newErrors.amount = false
  newErrors.counterparty = false
  nextTick(() => amountInput.value?.focus())
}

function cancelNew() {
  editingNew.value = false
}

async function saveNew() {
  if (newForm.type === '__add__') {
    addingNewMeta.value = { field: 'type', value: '', target: 'new' }
    return
  }
  if (newForm.category === '__add__') {
    addingNewMeta.value = { field: 'category', value: '', target: 'new' }
    return
  }

  const isEmpty = !newForm.amount && !newForm.description
  if (isEmpty) {
    editingNew.value = false
    return
  }

  if (!validateForm(newForm, newErrors)) return

  await createTransaction({
    date: props.date,
    account: props.account,
    type: newForm.type,
    amount: parseFloat(newForm.amount as string),
    counterparty: newForm.counterparty,
    category: newForm.category,
    description: newForm.description,
  })
  editingNew.value = false
  await load()
  emit('updated')
}

function confirmDelete(id: number) {
  deleteTargetId.value = id
}

async function executeDelete() {
  if (deleteTargetId.value === null) return
  await deleteTransaction(deleteTargetId.value)
  deleteTargetId.value = null
  await load()
  emit('updated')
}

async function saveNewMeta() {
  if (!addingNewMeta.value?.value.trim()) return
  const { field, value, target } = addingNewMeta.value
  if (field === 'category') {
    await addCategory(value.trim())
    if (target === 'edit') editForm.category = value.trim()
    else newForm.category = value.trim()
  } else {
    await addType(value.trim())
    if (target === 'edit') editForm.type = value.trim()
    else newForm.type = value.trim()
  }
  addingNewMeta.value = null
}

function handleBackdropClick() {
  if (editingNew.value) {
    saveNew()
  } else if (editingId.value !== null) {
    saveEdit(editingId.value)
  } else {
    emit('close')
  }
}
</script>

<style scoped>
.popup-backdrop {
  position: fixed;
  inset: 0;
  z-index: 499;
}

.popup {
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: auto;
  box-shadow: var(--popup-shadow);
  display: flex;
  flex-direction: column;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.popup-title {
  font-weight: 600;
  font-size: 13px;
}

.popup-close {
  font-size: 18px;
  color: var(--text-muted);
  line-height: 1;
  padding: 0 4px;
}

.popup-close:hover {
  color: var(--text);
}

.tx-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'Courier New', Courier, monospace;
  font-size: 12px;
  flex: 1;
}

.tx-table th {
  text-align: left;
  padding: 6px 8px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.tx-table td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}

tr.editing td {
  background: var(--surface);
}

.tx-actions {
  white-space: nowrap;
}

.icon-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  font-size: 13px;
  opacity: 0.6;
}

.icon-btn:hover {
  opacity: 1;
}

.amount-cell.pos {
  color: var(--positive);
}

.amount-cell.neg {
  color: var(--negative-vivid);
}

.empty-msg {
  padding: 16px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: center;
}

.popup-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}

.muted {
  color: var(--text-muted);
}

input.error,
select.error {
  border-color: var(--danger);
  outline-color: var(--danger);
}

.add-meta-prompt {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 600;
}

.add-meta-box {
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  min-width: 240px;
  box-shadow: var(--popup-shadow);
}

.add-meta-box p {
  margin-bottom: 10px;
  font-size: 13px;
}

.add-meta-box input {
  width: 100%;
}
</style>
