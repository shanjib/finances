<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="$emit('cancel')">
      <div class="modal">
        <p class="modal-message">{{ message }}</p>
        <div class="modal-actions">
          <button class="btn btn-ghost" @click="$emit('cancel')">Cancel</button>
          <button ref="confirmBtn" class="btn btn-danger" @click="$emit('confirm')">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOverlay } from '../composables/useUI'

useOverlay()

const props = defineProps<{
  message: string
  confirmLabel?: string
  /** Focus the confirm button on open so Enter confirms (keyboard-triggered deletes). */
  focusConfirm?: boolean
}>()

const confirmBtn = ref<HTMLButtonElement | null>(null)
onMounted(() => { if (props.focusConfirm) confirmBtn.value?.focus() })
defineEmits<{
  confirm: []
  cancel: []
}>()
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--popup-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 24px;
  min-width: 280px;
  max-width: 440px;
  box-shadow: var(--popup-shadow);
}

.modal-message {
  margin-bottom: 20px;
  line-height: 1.5;
  color: var(--text);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>
