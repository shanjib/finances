import fs from 'fs'
import path from 'path'
import { readCSV } from './csv.js'

const ARCHIVE_RE = /^(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})\.csv$/

/** Active + overlapping archive transactions, filtered to [from, to]. */
export async function gatherTransactions(state, from, to) {
  let txs = [...state.activeTransactions]

  const archiveDir = path.join(state.dataDir, 'archive')
  if (fs.existsSync(archiveDir)) {
    for (const file of fs.readdirSync(archiveDir)) {
      const match = file.match(ARCHIVE_RE)
      if (match && match[1] <= to && match[2] >= from) {
        txs = txs.concat(await readCSV(path.join(archiveDir, file)))
      }
    }
  }

  return txs.filter(tx => tx.date >= from && tx.date <= to)
}

/** Group a set of transactions by category, account (visible only) and type. */
export function summarize(txs, meta) {
  const hiddenAccounts = new Set(meta.hidden_accounts || [])

  const catMap = {}
  for (const tx of txs) {
    const key = tx.category || '(uncategorized)'
    if (!catMap[key]) catMap[key] = { total: 0, count: 0 }
    catMap[key].total += tx.amount
    catMap[key].count++
  }
  const byCategory = Object.entries(catMap)
    .map(([category, v]) => ({ category, total: v.total, count: v.count }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const acctMap = {}
  for (const tx of txs) {
    if (!hiddenAccounts.has(tx.account)) {
      if (!acctMap[tx.account]) acctMap[tx.account] = { netFlow: 0, count: 0 }
      acctMap[tx.account].netFlow += tx.amount
      acctMap[tx.account].count++
    }
    if (tx.counterparty && !hiddenAccounts.has(tx.counterparty)) {
      // counterparty receives the opposite flow for transfers
      if (tx.type === 'transfer' || tx.type === 'cc_payment') {
        if (!acctMap[tx.counterparty]) acctMap[tx.counterparty] = { netFlow: 0, count: 0 }
        acctMap[tx.counterparty].netFlow -= tx.amount
        acctMap[tx.counterparty].count++
      }
    }
  }
  const byAccount = (meta.account_order || [])
    .filter(a => acctMap[a])
    .map(account => ({ account, netFlow: acctMap[account].netFlow, count: acctMap[account].count }))

  const typeMap = {}
  for (const tx of txs) {
    if (!typeMap[tx.type]) typeMap[tx.type] = { total: 0, count: 0 }
    typeMap[tx.type].total += tx.amount
    typeMap[tx.type].count++
  }
  const byType = Object.entries(typeMap)
    .map(([type, v]) => ({ type, total: v.total, count: v.count }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  return { byCategory, byAccount, byType }
}

/** 'YYYY-MM' list from the month of `from` through the month of `to`, inclusive. */
export function monthsBetween(from, to) {
  const months = []
  let y = parseInt(from.slice(0, 4), 10)
  let m = parseInt(from.slice(5, 7), 10)
  const endKey = to.slice(0, 7)
  while (true) {
    const key = `${y}-${String(m).padStart(2, '0')}`
    if (key > endKey || months.length > 600) break
    months.push(key)
    if (++m > 12) { m = 1; y++ }
  }
  return months
}

function lastDayOf(monthKey) {
  const y = parseInt(monthKey.slice(0, 4), 10)
  const m = parseInt(monthKey.slice(5, 7), 10)
  return `${monthKey}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`
}

/**
 * Per-month summaries across [from, to], aligned to month boundaries.
 * Returns flat rows tagged with `month` ('YYYY-MM').
 */
export async function buildTrend(state, from, to) {
  const months = monthsBetween(from, to)
  if (months.length === 0) return { months, byCategory: [], byAccount: [], byType: [] }

  const all = await gatherTransactions(state, `${months[0]}-01`, lastDayOf(months[months.length - 1]))

  const out = { months, byCategory: [], byAccount: [], byType: [] }
  for (const month of months) {
    const monthTxs = all.filter(tx => tx.date.startsWith(month))
    const s = summarize(monthTxs, state.meta)
    out.byCategory.push(...s.byCategory.map(r => ({ month, ...r })))
    out.byAccount.push(...s.byAccount.map(r => ({ month, ...r })))
    out.byType.push(...s.byType.map(r => ({ month, ...r })))
  }
  return out
}
