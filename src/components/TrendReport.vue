<template>
  <div>
    <div class="report-controls">
      <div class="date-group">
        <label>Range</label>
        <select v-model="preset">
          <option value="3">Last 3 months</option>
          <option value="6">Last 6 months</option>
          <option value="12">Last 12 months</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <template v-if="preset === 'custom'">
        <div class="date-group">
          <label>From</label>
          <input type="date" v-model="customFrom" />
        </div>
        <div class="date-group">
          <label>To</label>
          <input type="date" v-model="customTo" />
        </div>
        <button class="btn" @click="run" :disabled="loading">Run Report</button>
      </template>
      <span v-if="data && !loading" class="range-note">
        {{ monthLabel(data.months[0]) }} – {{ monthLabel(data.months[data.months.length - 1]) }}
      </span>
    </div>

    <p v-if="error" class="empty-state">{{ error }}</p>
    <div v-if="loading" class="loading-msg">Loading…</div>

    <div v-if="data && !loading">
      <section v-for="sec in sections" :key="sec.key" class="report-section">
        <h2>{{ sec.title }}</h2>
        <div v-if="sec.rows.length">
          <div class="chart-container" style="height:320px">
            <Bar :data="sec.chart" :options="chartOptions" />
          </div>
          <p v-if="sec.omitted > 0" class="chart-note">
            Chart shows the top {{ TOP_N }} of {{ sec.shown + sec.omitted }} by total; {{ sec.omitted }} omitted. The table lists all.
          </p>
          <table class="report-table">
            <thead>
              <tr>
                <th>Month</th><th>{{ sec.dimLabel }}</th><th>{{ sec.valueLabel }}</th><th>Transaction Count</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in sec.tableRows" :key="row.month + '|' + row.dim">
                <td>{{ monthLabel(row.month, true) }}</td>
                <td>{{ row.dim }}</td>
                <td class="amount-cell" :class="row.value < 0 ? 'neg' : 'pos'">
                  <span class="dollar">$</span><span class="val">{{ formatAmt(row.value) }}</span>
                </td>
                <td>{{ row.count }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="empty-state">No transactions in the selected range.</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale,
} from 'chart.js'
import { todayLocal, firstOfMonthLocal, toLocalISODate } from '../utils/date'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const TOP_N = 5

interface TrendData {
  months: string[]
  byCategory: { month: string; category: string; total: number; count: number }[]
  byAccount: { month: string; account: string; netFlow: number; count: number }[]
  byType: { month: string; type: string; total: number; count: number }[]
}

interface Row { month: string; dim: string; value: number; count: number }

const preset = ref<'3' | '6' | '12' | 'custom'>('3')
const customFrom = ref(firstOfMonthLocal())
const customTo = ref(todayLocal())
const loading = ref(false)
const error = ref('')
const data = ref<TrendData | null>(null)

function presetRange(n: number) {
  const now = new Date()
  return {
    from: toLocalISODate(new Date(now.getFullYear(), now.getMonth() - (n - 1), 1)),
    to: todayLocal(),
  }
}

async function run() {
  const range = preset.value === 'custom'
    ? { from: customFrom.value, to: customTo.value }
    : presetRange(parseInt(preset.value, 10))
  if (!range.from || !range.to || range.from > range.to) {
    error.value = 'Choose a valid date range.'
    return
  }
  error.value = ''
  loading.value = true
  try {
    const res = await fetch(`/api/reports/trend?from=${range.from}&to=${range.to}`)
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load trend')
    data.value = await res.json()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

watch(preset, p => { if (p !== 'custom') run() })
onMounted(run)

const spansYears = computed(() => {
  const m = data.value?.months ?? []
  return m.length > 0 && m[0].slice(0, 4) !== m[m.length - 1].slice(0, 4)
})

function monthLabel(key: string | undefined, long = false) {
  if (!key) return ''
  const d = new Date(parseInt(key.slice(0, 4), 10), parseInt(key.slice(5, 7), 10) - 1, 1)
  if (long) return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  const mon = d.toLocaleDateString('en-US', { month: 'short' })
  return spansYears.value ? `${mon} '${String(d.getFullYear()).slice(2)}` : mon
}

function formatAmt(amount: number) {
  return Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getCSSVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Golden-angle hues keep adjacent series distinguishable for any series count
function seriesColor(i: number) {
  return `hsl(${Math.round((i * 137.508 + 210) % 360)}, 58%, 55%)`
}

function buildSection(
  key: string, title: string, dimLabel: string, valueLabel: string,
  rows: Row[], limit: boolean, order: string[] | null,
) {
  const months = data.value?.months ?? []

  // Rank dimension values by total absolute amount across the whole range
  const totals = new Map<string, number>()
  for (const r of rows) totals.set(r.dim, (totals.get(r.dim) ?? 0) + Math.abs(r.value))
  let dims = order ? order.filter(d => totals.has(d)) : [...totals.keys()]
  if (!order) dims.sort((a, b) => totals.get(b)! - totals.get(a)!)
  const omitted = limit ? Math.max(0, dims.length - TOP_N) : 0
  if (limit) dims = dims.slice(0, TOP_N)

  const lookup = new Map(rows.map(r => [`${r.month}|${r.dim}`, r.value]))
  const chart = {
    labels: months.map(m => monthLabel(m)),
    datasets: dims.map((dim, i) => ({
      label: dim,
      data: months.map(m => lookup.get(`${m}|${dim}`) ?? 0),
      backgroundColor: seriesColor(i),
      borderRadius: 2,
    })),
  }

  const tableRows = [...rows].sort((a, b) =>
    a.month === b.month ? Math.abs(b.value) - Math.abs(a.value) : (a.month < b.month ? 1 : -1))

  return { key, title, dimLabel, valueLabel, rows, chart, omitted, shown: dims.length, tableRows }
}

const sections = computed(() => {
  const d = data.value
  if (!d) return []
  return [
    buildSection('cat', 'By Category', 'Category', 'Total Amount',
      d.byCategory.map(r => ({ month: r.month, dim: r.category, value: r.total, count: r.count })), true, null),
    buildSection('acct', 'By Account', 'Account', 'Net Flow',
      d.byAccount.map(r => ({ month: r.month, dim: r.account, value: r.netFlow, count: r.count })), false, null),
    buildSection('type', 'By Type', 'Type', 'Total Amount',
      d.byType.map(r => ({ month: r.month, dim: r.type, value: r.total, count: r.count })), true, null),
  ]
})

const chartOptions = computed(() => {
  const muted = getCSSVar('--text-muted')
  const grid = getCSSVar('--border')
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'bottom' as const, labels: { color: getCSSVar('--text'), boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` ${ctx.dataset.label}: $${Math.abs(ctx.raw as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: muted, font: { size: 11 } }, grid: { color: grid } },
      y: {
        ticks: {
          color: muted,
          font: { size: 11 },
          callback: (v: any) => `$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 0 })}`,
        },
        grid: { color: grid },
      },
    },
  }
})
</script>

<style scoped>
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

.range-note {
  margin-left: auto;
  font-size: 12px;
  color: var(--text-muted);
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
  margin-bottom: 8px;
}

.chart-note {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}

.report-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin-top: 12px;
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
