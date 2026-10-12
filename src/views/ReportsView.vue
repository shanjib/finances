<template>
  <div class="reports-page">
    <div class="view-toggle" role="tablist">
      <button role="tab" :aria-selected="tab === 'single'" :class="{ active: tab === 'single' }" @click="tab = 'single'">Single Month</button>
      <button role="tab" :aria-selected="tab === 'trend'" :class="{ active: tab === 'trend' }" @click="tab = 'trend'">Trend</button>
    </div>

    <TrendReport v-if="tab === 'trend'" />

    <template v-else>
    <!-- Date range control -->
    <div class="report-controls">
      <div class="date-group">
        <label>From</label>
        <input type="date" v-model="rangeFrom" />
      </div>
      <div class="date-group">
        <label>To</label>
        <input type="date" v-model="rangeTo" />
      </div>
      <button class="btn" @click="runReport" :disabled="loading">Run Report</button>
    </div>

    <div v-if="loading" class="loading-msg">Loading…</div>

    <div v-if="reportData && !loading">
      <!-- By Category -->
      <section class="report-section">
        <h2>By Category</h2>
        <div v-if="reportData.byCategory.length">
          <div class="chart-container" style="height:300px">
            <Bar :data="categoryChartData" :options="hBarOptions" />
          </div>
          <table class="report-table">
            <thead>
              <tr><th>Category</th><th>Total Amount</th><th>Transaction Count</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData.byCategory" :key="row.category">
                <td>{{ row.category }}</td>
                <td class="amount-cell" :class="row.total < 0 ? 'neg' : 'pos'">
                  <span class="dollar">$</span><span class="val">{{ formatAmt(row.total) }}</span>
                </td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-state">No transactions in the selected date range.</p>
      </section>

      <!-- By Account -->
      <section class="report-section">
        <h2>By Account</h2>
        <div v-if="reportData.byAccount.length">
          <div class="chart-container" style="height:300px">
            <Bar :data="accountChartData" :options="vBarOptions" />
          </div>
          <table class="report-table">
            <thead>
              <tr><th>Account</th><th>Net Flow</th><th>Transaction Count</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData.byAccount" :key="row.account">
                <td>{{ row.account }}</td>
                <td class="amount-cell" :class="row.netFlow < 0 ? 'neg' : 'pos'">
                  <span class="dollar">$</span><span class="val">{{ formatAmt(row.netFlow) }}</span>
                </td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-state">No transactions in the selected date range.</p>
      </section>

      <!-- By Type -->
      <section class="report-section">
        <h2>By Type</h2>
        <div v-if="reportData.byType.length">
          <div class="chart-container" style="height:300px">
            <Bar :data="typeChartData" :options="vBarOptions" />
          </div>
          <table class="report-table">
            <thead>
              <tr><th>Type</th><th>Total Amount</th><th>Transaction Count</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in reportData.byType" :key="row.type">
                <td>{{ row.type }}</td>
                <td class="amount-cell" :class="row.total < 0 ? 'neg' : 'pos'">
                  <span class="dollar">$</span><span class="val">{{ formatAmt(row.total) }}</span>
                </td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-state">No transactions in the selected date range.</p>
      </section>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from 'chart.js'
import TrendReport from '../components/TrendReport.vue'
import { todayLocal, firstOfMonthLocal } from '../utils/date'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const tab = ref<'single' | 'trend'>('single')

interface ReportData {
  range: { from: string; to: string }
  byCategory: { category: string; total: number; count: number }[]
  byAccount: { account: string; netFlow: number; count: number }[]
  byType: { type: string; total: number; count: number }[]
}

// Computed at mount from the local calendar (toISOString() is UTC and drifts a day in the evening)
const rangeFrom = ref(firstOfMonthLocal())
const rangeTo = ref(todayLocal())
const loading = ref(false)
const reportData = ref<ReportData | null>(null)

// Read CSS vars for chart colors
function getCSSVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function barColor(value: number) {
  return value >= 0 ? getCSSVar('--positive') : getCSSVar('--negative')
}

function formatAmt(amount: number) {
  return Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function runReport() {
  loading.value = true
  try {
    const res = await fetch(`/api/reports?from=${rangeFrom.value}&to=${rangeTo.value}`)
    reportData.value = await res.json()
  } finally {
    loading.value = false
  }
}

const textColor = computed(() => getCSSVar('--text'))
const textMuted = computed(() => getCSSVar('--text-muted'))
const borderColor = computed(() => getCSSVar('--border'))

const categoryChartData = computed(() => {
  if (!reportData.value) return { labels: [], datasets: [] }
  const data = reportData.value.byCategory
  return {
    labels: data.map(r => r.category),
    datasets: [{
      label: 'Total Amount',
      data: data.map(r => r.total),
      backgroundColor: data.map(r => barColor(r.total)),
      borderRadius: 3,
    }],
  }
})

const accountChartData = computed(() => {
  if (!reportData.value) return { labels: [], datasets: [] }
  const data = reportData.value.byAccount
  return {
    labels: data.map(r => r.account),
    datasets: [{
      label: 'Net Flow',
      data: data.map(r => r.netFlow),
      backgroundColor: data.map(r => barColor(r.netFlow)),
      borderRadius: 3,
    }],
  }
})

const typeChartData = computed(() => {
  if (!reportData.value) return { labels: [], datasets: [] }
  const data = reportData.value.byType
  return {
    labels: data.map(r => r.type),
    datasets: [{
      label: 'Total Amount',
      data: data.map(r => r.total),
      backgroundColor: data.map(r => barColor(r.total)),
      borderRadius: 3,
    }],
  }
})

const baseOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx: any) => {
          const v = ctx.raw as number
          return ` $${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
        },
      },
    },
  },
  scales: {
    x: {
      ticks: { color: textMuted.value, font: { size: 11 } },
      grid: { color: borderColor.value },
    },
    y: {
      ticks: {
        color: textMuted.value,
        font: { size: 11 },
        callback: (v: any) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      },
      grid: { color: borderColor.value },
    },
  },
}))

const hBarOptions = computed(() => ({
  ...baseOptions.value,
  indexAxis: 'y' as const,
  scales: {
    y: {
      ticks: { color: textMuted.value, font: { size: 11 } },
      grid: { color: borderColor.value },
    },
    x: {
      ticks: {
        color: textMuted.value,
        font: { size: 11 },
        callback: (v: any) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
      },
      grid: { color: borderColor.value },
    },
  },
}))

const vBarOptions = computed(() => baseOptions.value)

onMounted(() => runReport())
</script>

<style scoped>
.reports-page {
  padding: 16px;
  max-width: 900px;
}

.view-toggle {
  display: inline-flex;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  border-radius: 20px;
  overflow: hidden;
}

.view-toggle button {
  padding: 5px 18px;
  font-size: 13px;
  background: var(--surface);
  color: var(--text);
}

.view-toggle button.active {
  background: var(--accent);
  color: var(--btn-text);
}

.report-controls {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  flex-wrap: wrap;
}

.date-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-group label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.loading-msg {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.report-section {
  margin-bottom: 40px;
  padding-bottom: 32px;
  border-bottom: 1px solid var(--border);
}

.report-section:last-child {
  border-bottom: none;
}

h2 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
}

.chart-container {
  margin-bottom: 20px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.report-table th {
  text-align: left;
  padding: 6px 10px;
  background: var(--header-bg);
  border-bottom: 2px solid var(--border);
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.report-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border);
  font-family: 'Courier New', Courier, monospace;
}

.amount-cell {
  white-space: nowrap;
  min-width: 120px;
}

.amount-cell .dollar { float: left; margin-right: 2px; }
.amount-cell .val { float: right; }
.amount-cell::after { content: ''; display: table; clear: both; }

.amount-cell.pos .dollar,
.amount-cell.pos .val { color: var(--positive); }
.amount-cell.neg .dollar,
.amount-cell.neg .val { color: var(--negative-vivid); }

.empty-state {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
}
</style>
