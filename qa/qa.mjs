import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

let passed = 0
let failed = 0
async function test(name, fn) {
  try {
    await fn()
    console.log(`PASS ${name}`)
    passed += 1
  } catch (error) {
    console.error(`FAIL ${name}\n  ${error.stack || error.message}`)
    failed += 1
  }
}

const root = path.resolve(new URL('..', import.meta.url).pathname)
const mainPath = path.join(root, 'src', 'main.js')
const mainSource = await fs.readFile(mainPath, 'utf8')
let transformed = mainSource
  .replace("import './styles.css'\n", '')
  .replace("import { supabase } from './supabase.js'\n", 'const supabase = {}\n')
  .replace("const app = document.querySelector('#app')", 'const app = null')
const bootIndex = transformed.lastIndexOf('\nboot()')
if (bootIndex >= 0) transformed = transformed.slice(0, bootIndex) + transformed.slice(bootIndex + '\nboot()'.length)
transformed += `\nexport { state, DAY_NAMES, dateKey, monthKey, monthBounds, esc, todayRoute, sumEntries, historyByDay, dealershipTotals, shiftMonthKey, renderTodayView, renderSettingsView, exportMonthCsv };\n`
const tempFile = path.join(os.tmpdir(), `car-wash-qa-${process.pid}.mjs`)
await fs.writeFile(tempFile, transformed)
const m = await import(`${pathToFileURL(tempFile).href}?v=${Date.now()}`)

await test('September ends on day 30', () => assert.equal(m.monthBounds(new Date(2026, 8, 17)).end, '2026-09-30'))
await test('October ends on day 31', () => assert.equal(m.monthBounds(new Date(2026, 9, 17)).end, '2026-10-31'))
await test('Leap February ends on day 29', () => assert.equal(m.monthBounds(new Date(2028, 1, 10)).end, '2028-02-29'))
await test('Month navigation crosses backward into prior year', () => assert.equal(m.shiftMonthKey('2026-01', -1), '2025-12'))
await test('Month navigation crosses forward into next year', () => assert.equal(m.shiftMonthKey('2026-12', 1), '2027-01'))
await test('Daily totals use saved rate snapshots', () => assert.deepEqual(m.sumEntries([{ cars:10, rate_snapshot:12 }, { cars:5, rate_snapshot:15 }]), { cars:15, total:195 }))
await test('Daily history groups multiple dealerships on one date', () => {
  const out = m.historyByDay([
    { work_date:'2026-09-10', cars:10, rate_snapshot:12 },
    { work_date:'2026-09-10', cars:5, rate_snapshot:15 },
    { work_date:'2026-09-11', cars:2, rate_snapshot:20 },
  ])
  assert.equal(out.length, 2)
  assert.equal(out[1].cars, 15)
  assert.equal(out[1].total, 195)
})
await test('Monthly dealership totals aggregate across work days', () => {
  const out = m.dealershipTotals([
    { dealership:'Toyota', work_date:'2026-09-01', cars:10, rate_snapshot:12 },
    { dealership:'Toyota', work_date:'2026-09-08', cars:5, rate_snapshot:12 },
    { dealership:'Honda', work_date:'2026-09-02', cars:2, rate_snapshot:15 },
  ])
  const toyota = out.find(x => x.dealership === 'Toyota')
  assert.equal(toyota.cars, 15)
  assert.equal(toyota.total, 180)
  assert.equal(toyota.workDays.size, 2)
})
await test('Recurring route links to one dealership record', () => {
  m.state.dealerships = [{ id:'d1', name:'Toyota', rate:12 }]
  m.state.schedule = [{ id:'s1', dealership_id:'d1' }]
  m.state.overrides = []
  const out = m.todayRoute()
  assert.equal(out.length, 1)
  assert.equal(out[0].dealershipId, 'd1')
  assert.equal(out[0].key, 'dealership:d1')
})
await test('One-day removal excludes only that schedule assignment', () => {
  m.state.dealerships = [{ id:'d1', name:'Toyota', rate:12 }, { id:'d2', name:'Honda', rate:15 }]
  m.state.schedule = [{ id:'s1', dealership_id:'d1' }, { id:'s2', dealership_id:'d2' }]
  m.state.overrides = [{ id:'o1', action:'remove', dealership_schedule_id:'s2' }]
  assert.deepEqual(m.todayRoute().map(x => x.name), ['Toyota'])
})
await test('Today-only dealership is appended without altering recurring dealership', () => {
  m.state.dealerships = [{ id:'d1', name:'Toyota', rate:12 }]
  m.state.schedule = [{ id:'s1', dealership_id:'d1' }]
  m.state.overrides = [{ id:'o2', action:'add', dealership:'Ford', rate:13 }]
  const out = m.todayRoute()
  assert.deepEqual(out.map(x => x.name), ['Toyota', 'Ford'])
  assert.equal(out[1].key, 'extra:o2')
})
await test('Today card preserves saved rate snapshot after Settings rate changes', () => {
  m.state.dealerships = [{ id:'d1', name:'Toyota', rate:14 }]
  m.state.schedule = [{ id:'s1', dealership_id:'d1' }]
  m.state.overrides = []
  m.state.entries = [{ route_key:'dealership:d1', dealership:'Toyota', cars:10, rate_snapshot:12, work_date:m.dateKey(new Date()) }]
  m.state.monthEntries = [...m.state.entries]
  const html = m.renderTodayView()
  assert.ok(html.includes('$12.00 per car'))
  assert.ok(html.includes('$120.00'))
  assert.ok(!html.includes('$140.00'))
})
await test('Settings supports multiple weekdays for one dealership', () => {
  m.state.dealerships = [{ id:'d1', name:'Toyota', rate:12 }]
  m.state.scheduleAssignments = [
    { id:'s1', dealership_id:'d1', weekday:1 },
    { id:'s2', dealership_id:'d1', weekday:3 },
    { id:'s3', dealership_id:'d1', weekday:5 },
  ]
  m.state.session = { user:{ email:'qa@example.com' } }
  const html = m.renderSettingsView()
  assert.ok(html.includes('value="1" checked'))
  assert.ok(html.includes('value="3" checked'))
  assert.ok(html.includes('value="5" checked'))
})
await test('HTML escaping covers markup and quotes', () => assert.equal(m.esc(`<a x='\"'>&`), '&lt;a x=&#39;&quot;&#39;&gt;&amp;'))
await test('CSV export escapes punctuation and includes monthly total', () => {
  m.state.history = [
    { work_date:'2026-09-01', dealership:'Toyota, West', cars:10, rate_snapshot:12 },
    { work_date:'2026-09-02', dealership:'Bob "Honda"', cars:5, rate_snapshot:15 },
  ]
  let blobText = ''
  let download = ''
  globalThis.Blob = class { constructor(parts) { blobText = parts.join('') } }
  globalThis.URL = { createObjectURL:() => 'blob:test', revokeObjectURL:() => {} }
  const link = { href:'', download:'', click() { download = this.download }, remove() {} }
  globalThis.document = { createElement:() => link, body:{ appendChild() {} } }
  globalThis.alert = () => { throw new Error('unexpected alert') }
  m.exportMonthCsv('2026-09')
  assert.ok(blobText.includes('"Toyota, West"'))
  assert.ok(blobText.includes('"Bob ""Honda"""'))
  assert.ok(blobText.includes('MONTH TOTAL,,15,,195.00'))
  assert.equal(download, 'car-wash-2026-09.csv')
})

const schema = await fs.readFile(path.join(root, 'supabase.sql'), 'utf8')
const migration = await fs.readFile(path.join(root, 'migration-v1.2.sql'), 'utf8')
await test('Schema enforces one dealership name per user', () => assert.ok(schema.includes('dealerships_user_name_unique')))
await test('Schema allows one dealership across multiple unique weekdays', () => assert.ok(schema.includes('unique (user_id, dealership_id, weekday)')))
await test('Schema has RLS enabled on normalized dealership tables', () => {
  assert.ok(schema.includes('alter table public.dealerships enable row level security'))
  assert.ok(schema.includes('alter table public.dealership_schedule enable row level security'))
})
await test('App no longer queries legacy weekly_schedule table', () => assert.equal(/from\(['"]weekly_schedule['"]\)/.test(mainSource), false))
await test('Migration keeps work_entries and removes legacy weekly_schedule', () => {
  assert.ok(migration.includes('update public.work_entries'))
  assert.ok(migration.includes('drop table public.weekly_schedule'))
  assert.equal(/drop table public\.work_entries/i.test(migration), false)
})

await fs.unlink(tempFile).catch(() => {})
console.log(`\nQA RESULT: ${passed} passed, ${failed} failed`)
if (failed) process.exit(1)
