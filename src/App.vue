<template>
  <div style="min-height:100vh;background:var(--bg);color:var(--text)">
    <nav class="topbar">
      <span class="topbar-title">Budget Tracker</span>
      <div class="topbar-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/log">Transaction Log</RouterLink>
        <RouterLink to="/reports">Reports</RouterLink>
        <RouterLink to="/settings">Settings</RouterLink>
        <button class="help-btn" title="Keyboard shortcuts (?)" aria-label="Keyboard shortcuts" @click="helpOpen = true">?</button>
      </div>
    </nav>
    <RouterView />
    <HelpModal v-if="helpOpen" @close="helpOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import HelpModal from './components/HelpModal.vue'
import { useUI, isTextEntry } from './composables/useUI'
import './composables/useMeta' // starts meta load + theme init

const router = useRouter()
const { helpOpen, keyboardBusy } = useUI()

// "G then X" navigation chords: G arms a 1s window for the second key.
const GO_TARGETS: Record<string, string> = { h: '/', l: '/log', r: '/reports', s: '/settings' }
let goTimer: number | null = null

function clearGoMode() {
  if (goTimer !== null) {
    clearTimeout(goTimer)
    goTimer = null
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return
  if (isTextEntry(e.target) || keyboardBusy.value) {
    clearGoMode()
    return
  }

  const key = e.key.toLowerCase()

  if (goTimer !== null) {
    clearGoMode()
    const target = GO_TARGETS[key]
    if (target) {
      e.preventDefault()
      router.push(target)
    }
    return
  }

  if (key === 'g') {
    goTimer = window.setTimeout(() => { goTimer = null }, 1000)
  } else if (e.key === '?') {
    helpOpen.value = true
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  clearGoMode()
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 44px;
  background: var(--header-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-title {
  font-weight: 600;
  font-size: 15px;
}

.topbar-links {
  display: flex;
  gap: 20px;
  font-size: 13px;
}

.topbar-links a {
  color: var(--text);
  opacity: 0.7;
  transition: opacity 0.15s;
}

.help-btn {
  width: 20px;
  height: 20px;
  border: 1px solid var(--border);
  border-radius: 50%;
  font-size: 12px;
  line-height: 1;
  color: var(--text);
  opacity: 0.7;
  align-self: center;
}

.help-btn:hover {
  opacity: 1;
  color: var(--accent);
}

.topbar-links a:hover,
.topbar-links a.router-link-active {
  opacity: 1;
  color: var(--accent);
}
</style>
