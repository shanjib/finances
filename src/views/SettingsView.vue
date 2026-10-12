<template>
  <main class="settings">
    <h1>Settings</h1>

    <!-- Theme -->
    <section class="settings-section">
      <h2>Theme</h2>
      <div class="theme-options">
        <button
          v-for="t in ['light', 'dark', 'warm']"
          :key="t"
          class="theme-btn"
          :class="{ active: meta.theme === t }"
          @click="handleTheme(t as 'light' | 'dark' | 'warm')"
        >
          {{ t.charAt(0).toUpperCase() + t.slice(1) }}
        </button>
      </div>
    </section>

    <!-- Accounts -->
    <section class="settings-section">
      <h2>Accounts</h2>

      <h3 class="sub-heading">Active</h3>
      <p class="hint">Drag to reorder. Visible in the monthly grid and reports.</p>
      <ul class="drag-list" v-if="meta.account_order.length">
        <li
          v-for="(acct, i) in localAccountOrder"
          :key="acct"
          class="drag-item"
          draggable="true"
          @dragstart="onDragStart(i)"
          @dragover.prevent="onDragOver(i)"
          @drop="onDrop(i)"
          @dragend="onDragEnd"
        >
          <span class="drag-handle">⠿</span>
          <template v-if="renamingAccount === acct">
            <input
              class="rename-input"
              v-model="renameValue"
              @keydown.enter="confirmRename(acct)"
              @keydown.escape="renamingAccount = null"
              ref="renameInputRef"
            />
            <span v-if="renameError" class="inline-error">{{ renameError }}</span>
            <button class="icon-btn confirm" @click="confirmRename(acct)" title="Save" aria-label="Save">✓</button>
            <button class="icon-btn cancel" @click="renamingAccount = null" title="Cancel" aria-label="Cancel">✕</button>
          </template>
          <template v-else>
            <span class="acct-name">{{ acct }}</span>
            <button class="icon-btn" @click="startRename(acct)" title="Rename">✏️</button>
            <button class="icon-btn" @click="hideAccount(acct)" title="Hide">👁️</button>
          </template>
        </li>
      </ul>
      <p v-else class="hint">No active accounts.</p>
      <button class="btn" style="margin-top:10px" @click="saveAccountOrder" :disabled="savingOrder">
        Save Order
      </button>

      <h3 class="sub-heading" style="margin-top:20px">Hidden</h3>
      <p class="hint">Hidden accounts are excluded from the grid and reports. Their transaction data is preserved.</p>
      <ul class="drag-list" v-if="meta.hidden_accounts && meta.hidden_accounts.length">
        <li
          v-for="acct in meta.hidden_accounts"
          :key="acct"
          class="drag-item hidden-item"
        >
          <template v-if="renamingAccount === acct">
            <input
              class="rename-input"
              v-model="renameValue"
              @keydown.enter="confirmRename(acct)"
              @keydown.escape="renamingAccount = null"
            />
            <span v-if="renameError" class="inline-error">{{ renameError }}</span>
            <button class="icon-btn confirm" @click="confirmRename(acct)" title="Save" aria-label="Save">✓</button>
            <button class="icon-btn cancel" @click="renamingAccount = null" title="Cancel" aria-label="Cancel">✕</button>
          </template>
          <template v-else>
            <span class="acct-name muted">{{ acct }}</span>
            <button class="icon-btn" @click="startRename(acct)" title="Rename">✏️</button>
            <button class="icon-btn" @click="showAccount(acct)" title="Show">👁️</button>
          </template>
        </li>
      </ul>
      <p v-else class="hint">No hidden accounts.</p>

      <!-- Rename success/summary message -->
      <div v-if="renameResult" class="success-msg">
        Renamed: {{ renameResult.rowsUpdated }} rows updated across {{ renameResult.filesUpdated }} file(s).
        <button class="icon-btn" @click="renameResult = null">×</button>
      </div>

      <!-- Add Account -->
      <div v-if="!showAddAccount">
        <button class="btn btn-ghost" style="margin-top:16px" @click="showAddAccount = true">+ Add Account</button>
      </div>
      <div v-else class="add-account-form">
        <h3 class="sub-heading">New Account</h3>
        <div class="form-row">
          <label>Name</label>
          <input v-model="newAcctName" placeholder="Account name" />
          <span v-if="newAcctErrors.name" class="inline-error">{{ newAcctErrors.name }}</span>
        </div>
        <div class="form-row">
          <label>Opening Balance</label>
          <input type="number" step="0.01" v-model="newAcctBalance" placeholder="0.00" />
          <span v-if="newAcctErrors.balance" class="inline-error">{{ newAcctErrors.balance }}</span>
        </div>
        <div class="form-row">
          <label>Date</label>
          <input type="date" v-model="newAcctDate" />
          <span v-if="newAcctErrors.date" class="inline-error">{{ newAcctErrors.date }}</span>
        </div>
        <div class="form-actions">
          <button class="btn" @click="saveNewAccount" :disabled="savingAccount">Save</button>
          <button class="btn btn-ghost" @click="cancelAddAccount">Cancel</button>
        </div>
      </div>
    </section>

    <!-- Categories -->
    <section class="settings-section">
      <h2>Categories</h2>
      <ul class="tag-list">
        <li v-for="cat in meta.categories" :key="cat" class="tag-item">
          <span>{{ cat }}</span>
          <button class="icon-btn" @click="deleteCategory(cat)">×</button>
        </li>
      </ul>
      <div class="inline-add">
        <input v-model="newCategory" placeholder="New category" @keydown.enter="addCategoryInline" />
        <button class="btn" @click="addCategoryInline">Add</button>
      </div>
    </section>

    <!-- Types -->
    <section class="settings-section">
      <h2>Transaction Types</h2>
      <ul class="tag-list">
        <li v-for="type in meta.types" :key="type" class="tag-item">
          <span>{{ type }}</span>
          <button class="icon-btn" @click="deleteType(type)">×</button>
        </li>
      </ul>
      <div class="inline-add">
        <input v-model="newType" placeholder="New type" @keydown.enter="addTypeInline" />
        <button class="btn" @click="addTypeInline">Add</button>
      </div>
    </section>

    <!-- Templates -->
    <section class="settings-section">
      <h2>Templates</h2>
      <p class="hint">
        Presets that pre-fill a new transaction row. Save one with the 🔖 icon on any transaction.
        Account and date are never stored; they come from where you add the transaction.
      </p>
      <ul class="drag-list" v-if="templates.length">
        <li v-for="t in templates" :key="t.id" class="template-item" :class="{ editing: editingTplId === t.id }">
          <template v-if="editingTplId === t.id">
            <div class="tpl-form">
              <div class="form-row">
                <label>Name</label>
                <input v-model="tplForm.name" @keydown.enter="saveTemplate(t.id)" @keydown.escape="editingTplId = null" />
              </div>
              <div class="form-row">
                <label>Type</label>
                <select v-model="tplForm.type">
                  <option v-for="ty in meta.types" :key="ty" :value="ty">{{ ty }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>Amount</label>
                <input type="number" step="0.01" v-model="tplForm.amount" @keydown.enter="saveTemplate(t.id)" />
              </div>
              <div v-if="tplNeedsCounterparty" class="form-row">
                <label>Counterparty</label>
                <select v-model="tplForm.counterparty">
                  <option value="">— select account —</option>
                  <option v-for="a in allAccounts" :key="a" :value="a">{{ a }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>Category</label>
                <select v-model="tplForm.category">
                  <option value="">—</option>
                  <option v-for="c in meta.categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
              <div class="form-row">
                <label>Description</label>
                <input v-model="tplForm.description" @keydown.enter="saveTemplate(t.id)" />
              </div>
              <span v-if="tplError" class="inline-error">{{ tplError }}</span>
              <div class="form-actions">
                <button class="icon-btn confirm" @click="saveTemplate(t.id)" title="Save" aria-label="Save">✓</button>
                <button class="icon-btn cancel" @click="editingTplId = null" title="Cancel" aria-label="Cancel">✕</button>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="tpl-text">
              <span class="acct-name">{{ t.name }}</span>
              <span class="tpl-summary">{{ summarizeTemplate(t) }}</span>
            </div>
            <button class="icon-btn" @click="startEditTemplate(t)" title="Edit">✏️</button>
            <button class="icon-btn" @click="removeTemplate(t.id)" title="Delete">🗑️</button>
          </template>
        </li>
      </ul>
      <p v-else class="hint">No templates saved yet.</p>
    </section>

    <!-- Rollover -->
    <section class="settings-section">
      <h2>Archive &amp; Rollover</h2>
      <p class="hint">
        Archives the current active.csv (preserving all history) and starts a new file seeded with
        today's balances as opening entries dated tomorrow.
      </p>
      <button class="btn btn-danger" @click="showRolloverConfirm = true">Archive &amp; Rollover</button>
    </section>

    <ConfirmModal
      v-if="showRolloverConfirm"
      message="This will archive data/active.csv and create a new active.csv seeded with current balances. Continue?"
      confirm-label="Archive & Rollover"
      @confirm="doRollover"
      @cancel="showRolloverConfirm = false"
    />

    <div v-if="rolloverResult" class="rollover-result">
      <h3>Rollover complete. New opening balances:</h3>
      <ul>
        <li v-for="row in rolloverResult" :key="row.id">
          {{ row.account }}: ${{ row.amount.toFixed(2) }}
        </li>
      </ul>
      <button class="btn btn-ghost" @click="rolloverResult = null">Dismiss</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useMeta } from '../composables/useMeta'
import { useTemplates, summarizeTemplate, type Template } from '../composables/useTemplates'
import { todayLocal } from '../utils/date'

const {
  meta, setTheme, setAccountOrder, addCategory, deleteCategory, addType, deleteType,
  renameAccount, setAccountVisibility, createAccount,
} = useMeta()

const { templates, updateTemplate, deleteTemplate } = useTemplates()

const allAccounts = computed(() => [
  ...meta.value.account_order,
  ...(meta.value.hidden_accounts || []).filter(a => !meta.value.account_order.includes(a)),
])

// Templates
const editingTplId = ref<number | null>(null)
const tplError = ref('')
const tplForm = reactive({ name: '', type: '', amount: '', counterparty: '', category: '', description: '' })
const tplNeedsCounterparty = computed(() => tplForm.type === 'transfer' || tplForm.type === 'cc_payment')

function startEditTemplate(t: Template) {
  editingTplId.value = t.id
  tplError.value = ''
  Object.assign(tplForm, {
    name: t.name,
    type: t.type,
    amount: String(t.amount),
    counterparty: t.counterparty,
    category: t.category,
    description: t.description,
  })
}

async function saveTemplate(id: number) {
  tplError.value = ''
  if (!tplForm.name.trim()) { tplError.value = 'Name is required'; return }
  if (tplForm.amount === '' || isNaN(parseFloat(tplForm.amount))) { tplError.value = 'Amount is required'; return }
  try {
    await updateTemplate(id, {
      name: tplForm.name.trim(),
      type: tplForm.type,
      amount: parseFloat(tplForm.amount),
      counterparty: tplNeedsCounterparty.value ? tplForm.counterparty : '',
      category: tplForm.category,
      description: tplForm.description,
    })
    editingTplId.value = null
  } catch (e: any) {
    tplError.value = e.message
  }
}

async function removeTemplate(id: number) {
  await deleteTemplate(id)
  if (editingTplId.value === id) editingTplId.value = null
}

async function handleTheme(t: 'light' | 'dark' | 'warm') {
  await setTheme(t)
}

// Account order drag
const localAccountOrder = ref<string[]>([...meta.value.account_order])
watch(() => meta.value.account_order, v => { localAccountOrder.value = [...v] })

let dragFrom = -1
const savingOrder = ref(false)

function onDragStart(i: number) { dragFrom = i }
function onDragOver(i: number) {
  if (dragFrom === i) return
  const arr = [...localAccountOrder.value]
  const item = arr.splice(dragFrom, 1)[0]
  arr.splice(i, 0, item)
  localAccountOrder.value = arr
  dragFrom = i
}
function onDrop(i: number) {}
function onDragEnd() {}

async function saveAccountOrder() {
  savingOrder.value = true
  try {
    await setAccountOrder([...localAccountOrder.value])
  } finally {
    savingOrder.value = false
  }
}

// Rename
const renamingAccount = ref<string | null>(null)
const renameValue = ref('')
const renameError = ref('')
const renameResult = ref<{ rowsUpdated: number; filesUpdated: number } | null>(null)
const renameInputRef = ref<HTMLInputElement | null>(null)

function startRename(acct: string) {
  renamingAccount.value = acct
  renameValue.value = acct
  renameError.value = ''
  nextTick(() => renameInputRef.value?.focus())
}

async function confirmRename(oldName: string) {
  renameError.value = ''
  const newName = renameValue.value.trim()
  if (!newName) { renameError.value = 'Name cannot be empty'; return }
  if (newName === oldName) { renamingAccount.value = null; return }
  try {
    const result = await renameAccount(oldName, newName)
    renameResult.value = result
    renamingAccount.value = null
  } catch (e: any) {
    renameError.value = e.message
  }
}

// Hide/show
async function hideAccount(name: string) {
  await setAccountVisibility(name, false)
}

async function showAccount(name: string) {
  await setAccountVisibility(name, true)
}

// Add account
const showAddAccount = ref(false)
const newAcctName = ref('')
const newAcctBalance = ref('')
const newAcctDate = ref(todayLocal())
const newAcctErrors = ref({ name: '', balance: '', date: '' })
const savingAccount = ref(false)

function cancelAddAccount() {
  showAddAccount.value = false
  newAcctName.value = ''
  newAcctBalance.value = ''
  newAcctDate.value = todayLocal()
  newAcctErrors.value = { name: '', balance: '', date: '' }
}

async function saveNewAccount() {
  newAcctErrors.value = { name: '', balance: '', date: '' }
  let valid = true
  if (!newAcctName.value.trim()) { newAcctErrors.value.name = 'Required'; valid = false }
  if (newAcctBalance.value === '' || isNaN(parseFloat(newAcctBalance.value))) {
    newAcctErrors.value.balance = 'Required'; valid = false
  }
  if (!newAcctDate.value) { newAcctErrors.value.date = 'Required'; valid = false }
  if (!valid) return

  savingAccount.value = true
  try {
    await createAccount(newAcctName.value.trim(), parseFloat(newAcctBalance.value), newAcctDate.value)
    cancelAddAccount()
  } catch (e: any) {
    newAcctErrors.value.name = e.message
  } finally {
    savingAccount.value = false
  }
}

// Categories
const newCategory = ref('')
async function addCategoryInline() {
  if (!newCategory.value.trim()) return
  await addCategory(newCategory.value.trim())
  newCategory.value = ''
}

// Types
const newType = ref('')
async function addTypeInline() {
  if (!newType.value.trim()) return
  await addType(newType.value.trim())
  newType.value = ''
}

// Rollover
const showRolloverConfirm = ref(false)
const rolloverResult = ref<any[] | null>(null)

async function doRollover() {
  showRolloverConfirm.value = false
  const res = await fetch('/api/rollover', { method: 'POST' })
  const data = await res.json()
  if (data.success) {
    rolloverResult.value = data.openingBalances
  }
}
</script>

<style scoped>
.settings {
  max-width: 680px;
  margin: 0 auto;
  padding: 24px 16px;
}

h1 {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 24px;
}

.settings-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
}

.settings-section:last-child {
  border-bottom: none;
}

h2 {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 10px;
}

.sub-heading {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.hint {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 10px;
}

.theme-options {
  display: flex;
  gap: 8px;
}

.theme-btn {
  padding: 7px 18px;
  border: 2px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-btn:hover {
  border-color: var(--accent);
}

.theme-btn.active {
  border-color: var(--accent);
  background: var(--accent);
  color: var(--btn-text);
}

.drag-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.drag-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: grab;
  font-size: 13px;
  user-select: none;
}

.drag-item:active {
  cursor: grabbing;
}

.drag-handle {
  color: var(--text-muted);
  font-size: 16px;
}

.hidden-item {
  cursor: default;
}

.acct-name {
  flex: 1;
}

.acct-name.muted {
  color: var(--text-muted);
}

.rename-input {
  flex: 1;
  min-width: 0;
}

.inline-error {
  color: var(--danger);
  font-size: 12px;
}

.success-msg {
  margin-top: 10px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-account-form {
  margin-top: 16px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.form-row label {
  font-size: 12px;
  color: var(--text-muted);
  width: 120px;
  flex-shrink: 0;
}

.form-row input {
  flex: 1;
  min-width: 0;
}

.form-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.tag-list {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 20px;
  font-size: 12px;
}

.tag-item .icon-btn {
  font-size: 14px;
  color: var(--text-muted);
  padding: 0 2px;
}

.tag-item .icon-btn:hover {
  color: var(--danger);
}

.template-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 13px;
}

.template-item.editing {
  display: block;
}

.tpl-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tpl-summary {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tpl-form .form-row select {
  flex: 1;
  min-width: 0;
}

.inline-add {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inline-add input {
  width: 200px;
}

.rollover-result {
  margin-top: 20px;
  padding: 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.rollover-result h3 {
  font-size: 14px;
  margin-bottom: 10px;
}

.rollover-result ul {
  list-style: none;
  margin-bottom: 12px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
}

.rollover-result li {
  padding: 2px 0;
}
</style>
