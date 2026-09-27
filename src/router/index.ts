import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import SettingsView from '../views/SettingsView.vue'
import LogView from '../views/LogView.vue'
import ReportsView from '../views/ReportsView.vue'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/log', component: LogView },
    { path: '/reports', component: ReportsView },
    { path: '/settings', component: SettingsView },
  ],
})
