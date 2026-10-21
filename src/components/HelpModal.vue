<template>
  <Teleport to="body">
    <div class="help-overlay" @mousedown.self="$emit('close')" @keydown.escape.stop.prevent="$emit('close')">
      <div class="help-box" tabindex="-1" ref="boxEl" role="dialog" aria-label="Keyboard shortcuts">
        <div class="help-header">
          <h2>Keyboard shortcuts</h2>
          <button class="icon-btn cancel" title="Close" @click="$emit('close')">✕</button>
        </div>

        <section v-for="group in groups" :key="group.title">
          <h3>{{ group.title }}</h3>
          <dl>
            <template v-for="row in group.rows" :key="row.keys">
              <dt><kbd v-for="k in row.keys.split(' ')" :key="k">{{ k }}</kbd></dt>
              <dd>{{ row.desc }}</dd>
            </template>
          </dl>
        </section>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineEmits<{ close: [] }>()

const boxEl = ref<HTMLElement | null>(null)
onMounted(() => boxEl.value?.focus())

const groups = [
  {
    title: 'Global',
    rows: [
      { keys: 'F', desc: 'Focus the monthly grid (home view)' },
      { keys: 'T', desc: 'Jump to today’s month (home view)' },
      { keys: '← →', desc: 'Previous / next month (home view, grid not focused)' },
      { keys: 'G H', desc: 'Go to Home' },
      { keys: 'G L', desc: 'Go to Transaction Log' },
      { keys: 'G R', desc: 'Go to Reports' },
      { keys: 'G S', desc: 'Go to Settings' },
      { keys: '?', desc: 'Show this reference' },
    ],
  },
  {
    title: 'Grid (a delta cell is focused)',
    rows: [
      { keys: '↑ ↓ ← →', desc: 'Move between delta cells' },
      { keys: 'Enter', desc: 'Open the transaction popup for the cell' },
      { keys: 'T', desc: 'Jump to today’s month and focus today’s first cell' },
      { keys: 'Esc', desc: 'Release grid focus' },
    ],
  },
  {
    title: 'Popup / transaction entry',
    rows: [
      { keys: 'N', desc: 'Add a new blank row (no row being edited)' },
      { keys: 'T', desc: 'Open the template picker (when not typing in a field)' },
      { keys: 'Enter', desc: 'Save the row and start a new blank one' },
      { keys: 'Tab Shift+Tab', desc: 'Move through the row’s fields' },
      { keys: 'Esc', desc: 'Blank row: discard it. Row with content: save / validate. Otherwise close the popup' },
    ],
  },
  {
    title: 'Popup row (popup or Transaction Log)',
    rows: [
      { keys: '↑ ↓', desc: 'Move between transaction rows (no row being edited)' },
      { keys: 'E', desc: 'Edit the focused row' },
      { keys: 'D', desc: 'Delete the focused row (asks to confirm; Enter confirms, Esc cancels)' },
    ],
  },
]
</script>

<style scoped>
.help-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.help-box {
  background: var(--popup-bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px 24px;
  width: 520px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  box-shadow: var(--popup-shadow);
  outline: none;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

h2 {
  font-size: 16px;
}

h3 {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  margin: 14px 0 6px;
}

dl {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 6px 12px;
  align-items: baseline;
}

dt {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

dd {
  font-size: 13px;
}

kbd {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--surface);
}
</style>
