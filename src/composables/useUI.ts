import { ref, computed, onMounted, onUnmounted } from 'vue'

/**
 * Shared UI state so global keyboard shortcuts know when something
 * (a popup or modal) owns the keyboard.
 */
const overlayCount = ref(0)
const popupOpen = ref(false)
const helpOpen = ref(false)

/** Call from a modal component's setup: counts it as open while mounted. */
export function useOverlay() {
  onMounted(() => { overlayCount.value++ })
  onUnmounted(() => { overlayCount.value-- })
}

/** Call from the transaction popup's setup. */
export function usePopupFlag() {
  onMounted(() => { popupOpen.value = true })
  onUnmounted(() => { popupOpen.value = false })
}

export function isTextEntry(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable
}

export function useUI() {
  return {
    overlayCount,
    popupOpen,
    helpOpen,
    /** True when a modal or the transaction popup should receive keys instead of the page. */
    keyboardBusy: computed(() => overlayCount.value > 0 || popupOpen.value || helpOpen.value),
  }
}
