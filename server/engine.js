/**
 * Pure balance computation functions. No I/O, no side effects.
 */

function applySign(transaction) {
  const { type, amount, account, counterparty } = transaction
  const effects = {}

  switch (type) {
    case 'expense':
      effects[account] = -Math.abs(amount)
      break
    case 'income':
      effects[account] = Math.abs(amount)
      break
    case 'transfer':
    case 'cc_payment':
      effects[account] = -Math.abs(amount)
      if (counterparty) effects[counterparty] = Math.abs(amount)
      break
    case 'opening_balance':
      // User may enter negative for pre-existing credit card balance
      effects[account] = Number(amount)
      break
    default:
      effects[account] = -Math.abs(amount)
  }

  return effects
}

function sortTransactions(transactions) {
  return [...transactions].sort((a, b) => {
    const dateDiff = a.date.localeCompare(b.date)
    if (dateDiff !== 0) return dateDiff
    return a.created_at.localeCompare(b.created_at)
  })
}

export function computeRunningBalances(transactions, asOfDate) {
  const sorted = sortTransactions(transactions)
  const balances = {}

  for (const tx of sorted) {
    if (tx.date > asOfDate) break
    const effects = applySign(tx)
    for (const [acct, delta] of Object.entries(effects)) {
      balances[acct] = (balances[acct] ?? 0) + delta
    }
  }

  return balances
}

export function computeStartOfDayBalance(transactions, account, date) {
  const sorted = sortTransactions(transactions)
  let balance = 0

  for (const tx of sorted) {
    if (tx.date >= date) break
    const effects = applySign(tx)
    if (effects[account] !== undefined) {
      balance += effects[account]
    }
  }

  return balance
}

export function computeDayDelta(transactions, account, date) {
  const dayTxs = transactions.filter(tx => tx.date === date)
  if (dayTxs.length === 0) return null

  let delta = null
  for (const tx of dayTxs) {
    const effects = applySign(tx)
    if (effects[account] !== undefined) {
      delta = (delta ?? 0) + effects[account]
    }
  }

  return delta
}

export function computeMonthlySnapshot(transactions, year, month, accountOrder) {
  const y = parseInt(year)
  const m = parseInt(month)

  const daysInMonth = new Date(y, m, 0).getDate()
  const today = new Date().toISOString().slice(0, 10)

  const accounts = accountOrder.filter(acct =>
    transactions.some(tx => tx.account === acct || tx.counterparty === acct)
  )

  // Also include accounts from transactions that aren't in accountOrder
  const allAccounts = new Set(accounts)
  for (const tx of transactions) {
    allAccounts.add(tx.account)
    if (tx.counterparty) allAccounts.add(tx.counterparty)
  }
  const finalAccounts = [
    ...accounts,
    ...[...allAccounts].filter(a => !accounts.includes(a)),
  ]

  const rows = []
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const cells = {}

    for (const acct of finalAccounts) {
      const startOfDay = computeStartOfDayBalance(transactions, acct, dateStr)
      const delta = computeDayDelta(transactions, acct, dateStr)
      cells[acct] = { startOfDay, delta }
    }

    rows.push({
      date: dateStr,
      isToday: dateStr === today,
      cells,
    })
  }

  return { accounts: finalAccounts, rows }
}
