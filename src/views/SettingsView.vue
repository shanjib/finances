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

    <!-- Account Order -->
    <section class="settings-section">
      <h2>Account Order</h2>
      <p class="hint">Drag to reorder. Accounts are created by adding an opening_balance transaction.</p>
      <ul class="drag-list" ref="accountListEl">
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
          {{ acct }}
        </li>
      </ul>
      <button class="btn" style="margin-top:10px" @click="saveAccountOrder" :disabled="savingOrder">
        Save Order
      </button>
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
import { ref, watch } from 'vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useMeta } from '../composables/useMeta'

const { meta, setTheme, setAccountOrder, addCategory, deleteCategory, addType, deleteType } = useMeta()

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

.icon-btn {
  font-size: 14px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 2px;
}

.icon-btn:hover {
  color: var(--danger);
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
