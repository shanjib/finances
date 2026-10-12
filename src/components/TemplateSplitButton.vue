<template>
  <div class="split" ref="rootEl">
    <button class="btn split-main" :disabled="disabled" @click="$emit('add')">{{ label }}</button>
    <button
      class="btn split-arrow"
      :class="{ open }"
      title="Add from template (T)"
      aria-haspopup="menu"
      :aria-expanded="open"
      @click="toggle"
    >▾</button>

    <ul v-if="open" class="split-menu" :style="menuStyle" role="menu" @keydown="onMenuKeydown">
      <li v-if="!templates.length" class="split-empty">
        No templates saved — create one from any transaction row.
      </li>
      <li v-for="t in templates" :key="t.id" role="none">
        <button class="split-item" role="menuitem" @click="pick(t)">
          <span class="split-name">{{ t.name }}</span>
          <span class="split-summary">{{ summarizeTemplate(t) }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { useTemplates, summarizeTemplate, type Template } from '../composables/useTemplates'

const emit = defineEmits<{
  add: []
  pick: [template: Template]
}>()

const { templates, fetchTemplates } = useTemplates()

const props = withDefaults(defineProps<{
  label?: string
  disabled?: boolean
  openUp?: boolean
}>(), { label: '+ Add', disabled: false, openUp: true })

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})

async function openMenu() {
  fetchTemplates().catch(() => {})
  // Fixed positioning so the menu isn't clipped by a scrolling/overflow-hidden parent
  const rect = rootEl.value?.getBoundingClientRect()
  if (rect) {
    menuStyle.value = props.openUp
      ? { left: `${rect.left}px`, bottom: `${window.innerHeight - rect.top + 4}px` }
      : { left: `${rect.left}px`, top: `${rect.bottom + 4}px` }
  }
  open.value = true
  await nextTick()
  rootEl.value?.querySelector<HTMLElement>('.split-item')?.focus()
}

function closeMenu() {
  open.value = false
}

function toggle() {
  if (open.value) closeMenu()
  else openMenu()
}

function pick(t: Template) {
  closeMenu()
  emit('pick', t)
}

function onMenuKeydown(e: KeyboardEvent) {
  const items = Array.from(rootEl.value?.querySelectorAll<HTMLElement>('.split-item') ?? [])
  const idx = items.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    items[Math.min(idx + 1, items.length - 1)]?.focus()
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    items[Math.max(idx - 1, 0)]?.focus()
  }
}

function onDocMousedown(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) closeMenu()
}

onMounted(() => document.addEventListener('mousedown', onDocMousedown))
onUnmounted(() => document.removeEventListener('mousedown', onDocMousedown))

defineExpose({ openMenu, closeMenu, isOpen: () => open.value })
</script>

<style scoped>
.split {
  position: relative;
  display: inline-flex;
}

.split-main {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.split-arrow {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.35);
  padding: 6px 8px;
  color: var(--btn-text);
}

.btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.split-menu {
  position: fixed;
  z-index: 700;
  list-style: none;
  min-width: 280px;
  max-width: 420px;
  max-height: 260px;
  overflow-y: auto;
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: var(--popup-shadow);
  padding: 4px;
}

.split-empty {
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
}

.split-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 10px;
  border-radius: 4px;
  text-align: left;
}

.split-item:hover,
.split-item:focus {
  background: var(--surface);
}

.split-name {
  font-size: 13px;
  font-weight: 600;
}

.split-summary {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
