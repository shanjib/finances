<template>
  <Teleport to="body">
    <div class="tpl-overlay" @mousedown.self="$emit('close')" @keydown.escape.stop.prevent="onEscape">
      <div v-if="!confirmingOverwrite" class="tpl-box">
        <p>Save as template</p>
        <input
          ref="nameInput"
          v-model="name"
          placeholder="Template name"
          @keydown.enter.stop.prevent="submit"
        />
        <p v-if="error" class="tpl-error">{{ error }}</p>
        <div class="tpl-actions">
          <button class="btn" @click="submit" :disabled="saving">Save</button>
          <button class="btn btn-ghost" @click="$emit('close')">Cancel</button>
        </div>
      </div>

      <div v-else class="tpl-box" tabindex="-1" ref="confirmBox">
        <p>A template named '{{ name.trim() }}' already exists. Overwrite it?</p>
        <div class="tpl-actions">
          <button class="btn btn-danger" @click="overwrite" :disabled="saving">Overwrite</button>
          <button class="btn btn-ghost" @click="confirmingOverwrite = false">Cancel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue'
import { useTemplates } from '../composables/useTemplates'
import { useOverlay } from '../composables/useUI'
import type { Transaction } from '../composables/useTransactions'

const props = defineProps<{ tx: Transaction }>()
const emit = defineEmits<{ close: [] }>()

useOverlay()

const { createTemplate, updateTemplate, findByName, fetchTemplates } = useTemplates()

const name = ref(props.tx.description || '')
const error = ref('')
const saving = ref(false)
const confirmingOverwrite = ref(false)
const nameInput = ref<HTMLInputElement | null>(null)
const confirmBox = ref<HTMLElement | null>(null)

onMounted(() => {
  // Focus immediately so typing can start right away; refresh the list for the duplicate-name check
  nameInput.value?.focus()
  nameInput.value?.select()
  fetchTemplates().catch(() => {})
})

// Account and date are deliberately not part of a template.
function payload() {
  return {
    name: name.value.trim(),
    type: props.tx.type,
    amount: props.tx.amount,
    counterparty: props.tx.counterparty || '',
    category: props.tx.category || '',
    description: props.tx.description || '',
  }
}

async function submit() {
  error.value = ''
  if (!name.value.trim()) { error.value = 'Name is required'; return }
  if (findByName(name.value)) {
    confirmingOverwrite.value = true
    await nextTick()
    confirmBox.value?.focus()
    return
  }
  saving.value = true
  try {
    await createTemplate(payload())
    emit('close')
  } catch (e: any) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

async function overwrite() {
  const existing = findByName(name.value)
  if (!existing) return submit()
  saving.value = true
  try {
    await updateTemplate(existing.id, payload())
    emit('close')
  } catch (e: any) {
    error.value = e.message
    confirmingOverwrite.value = false
  } finally {
    saving.value = false
  }
}

function onEscape() {
  if (confirmingOverwrite.value) confirmingOverwrite.value = false
  else emit('close')
}
</script>

<style scoped>
.tpl-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
}

.tpl-box {
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
  min-width: 280px;
  max-width: 400px;
  box-shadow: var(--popup-shadow);
  outline: none;
}

.tpl-box p {
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.4;
}

.tpl-box input {
  width: 100%;
}

.tpl-error {
  color: var(--danger);
  font-size: 12px;
  margin-top: 6px;
}

.tpl-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
</style>
