<template>
  <div style="min-height:100vh;background:var(--bg);color:var(--text)">
    <nav class="topbar">
      <span class="topbar-title">Budget Tracker</span>
      <div class="topbar-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/log">Transaction Log</RouterLink>
        <RouterLink to="/reports">Reports</RouterLink>
        <RouterLink to="/settings">Settings</RouterLink>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useMeta } from './composables/useMeta'

const { meta, setTheme } = useMeta()
const router = useRouter()

// System theme auto-detect on first load (only if theme not yet set in meta)
// Applied after meta loads in useMeta.ts

function onKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  const isInput = tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA'
  if (isInput) return

  const route = router.currentRoute.value.path
  if (route === '/') {
    if (e.key === 'ArrowLeft') {
      router.app?.config.globalProperties?.$emit?.('nav-prev')
      document.dispatchEvent(new CustomEvent('home-nav', { detail: 'prev' }))
    } else if (e.key === 'ArrowRight') {
      document.dispatchEvent(new CustomEvent('home-nav', { detail: 'next' }))
    }
  }
  if (e.key === 'Escape') {
    document.dispatchEvent(new CustomEvent('popup-escape'))
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
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

.topbar-links a:hover,
.topbar-links a.router-link-active {
  opacity: 1;
  color: var(--accent);
}
</style>
