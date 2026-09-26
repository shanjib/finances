<template>
  <div style="min-height:100vh;background:var(--bg);color:var(--text)">
    <nav class="topbar">
      <span class="topbar-title">Budget Tracker</span>
      <div class="topbar-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/settings">Settings</RouterLink>
      </div>
    </nav>
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import { useMeta } from './composables/useMeta'

useMeta()
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
