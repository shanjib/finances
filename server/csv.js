import { parse } from 'csv-parse'
import { stringify } from 'csv-stringify'
import fs from 'fs'
import { promisify } from 'util'

const stringifyAsync = promisify(stringify)

const CSV_COLUMNS = [
  'id', 'date', 'account', 'type', 'amount',
  'counterparty', 'category', 'description', 'created_at',
]

export async function readCSV(filepath) {
  if (!fs.existsSync(filepath)) return []

  const content = fs.readFileSync(filepath, 'utf-8')
  return new Promise((resolve, reject) => {
    parse(content, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        if (context.column === 'amount') return parseFloat(value) || 0
        if (context.column === 'id') return parseInt(value, 10)
        return value
      },
    }, (err, records) => {
      if (err) reject(err)
      else resolve(records)
    })
  })
}

export async function writeCSV(filepath, transactions) {
  const output = await stringifyAsync(transactions, {
    header: true,
    columns: CSV_COLUMNS,
  })
  fs.writeFileSync(filepath, output, 'utf-8')
}

export async function appendRowCSV(filepath, transaction) {
  const row = await stringifyAsync([transaction], {
    header: !fs.existsSync(filepath),
    columns: CSV_COLUMNS,
  })
  fs.appendFileSync(filepath, row, 'utf-8')
}
