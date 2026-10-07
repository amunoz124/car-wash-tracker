import './styles.css'
import { supabase } from './supabase.js'

const app = document.querySelector('#app')

const state = {
  session: null,
  view: 'today',
  dealerships: [],
  scheduleAssignments: [],
  schedule: [],
  overrides: [],
  entries: [],
  history: [],
  monthEntries: [],
  selectedMonth: null,
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const icons = {
  car: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M16 38h32l-4.5-12.4A7 7 0 0 0 36.9 21h-9.8a7 7 0 0 0-6.6 4.6L16 38Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><path d="M12 39.5c0-3 2.4-5.5 5.5-5.5h29c3 0 5.5 2.4 5.5 5.5V48H12v-8.5Z" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linejoin="round"/><circle cx="20" cy="47" r="4" fill="currentColor"/><circle cx="44" cy="47" r="4" fill="currentColor"/><path d="M9 30h7M48 30h7M20 39h24" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`,
  today: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z" fill="currentColor"/></svg>`,
  month: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3v4M17 3v4M3 9h18" stroke="currentColor" stroke-width="2"/><path d="M7 13h3v3H7zM14 13h3v3h-3z" fill="currentColor"/></svg>`,
  history: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v6h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.2 15a8 8 0 1 0 .4-7.7L4 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m19.4 15 .1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V19a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H3a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 4.2 5.6l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V1.6a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.1a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.1 2.7Z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.3-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m14 7 3 3" stroke="currentColor" stroke-width="2"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M15 8l4 4-4 4M19 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 3v4M17 3v4M3 9h18" stroke="currentColor" stroke-width="2"/></svg>`,
}

function localDateParts(date = new Date()) {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(), weekday: date.getDay() }
}

function dateKey(date = new Date()) {
  const { year, month, day } = localDateParts(date)
  return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
}

function monthKey(date = new Date()) {
  const { year, month } = localDateParts(date)
  return `${year}-${String(month).padStart(2,'0')}`
}

function monthBounds(date = new Date()) {
  const { year, month } = localDateParts(date)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: `${year}-${String(month).padStart(2,'0')}-01`,
    end: `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`,
    label: new Date(year, month - 1, 1).toLocaleDateString(undefined, { month:'long', year:'numeric' }),
  }
}

function money(value) {
  return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(Number(value || 0))
}

function esc(value='') {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))
}

function shell(content, { login = false } = {}) {
  app.innerHTML = login ? `<main class="login-page">${content}</main>` : `<main class="app-shell">${content}</main>`
}

function showMessage(text, type='error', selector='#message') {
  const node = document.querySelector(selector)
  if (!node) return
  node.className = `message ${type}`
  node.textContent = text
}

function renderLogin() {
  shell(`
    <section class="auth-card">
      <div class="brand-mark">${icons.car}<span class="drop drop-one"></span><span class="drop drop-two"></span><span class="drop drop-three"></span></div>
      <h1>Car Wash Tracker</h1>
      <p class="auth-subtitle">Sign in to your account</p>
      <form id="loginForm" class="stack auth-form">
        <label>Email<input id="email" type="email" autocomplete="email" placeholder="you@example.com" required></label>
        <label>Password<div class="password-wrap"><input id="password" type="password" autocomplete="current-password" placeholder="Your password" required><button id="togglePassword" type="button" class="password-toggle" aria-label="Show password">👁</button></div></label>
        <button class="primary wide" type="submit">Sign In</button>
        <div id="message" class="message" role="status"></div>
      </form>
      <div class="private-note"><span></span> Private <b>•</b> Account protected <b>•</b> Only you</div>
    </section>
  `, { login: true })

  document.querySelector('#togglePassword').addEventListener('click', () => {
    const input = document.querySelector('#password')
    input.type = input.type === 'password' ? 'text' : 'password'
  })

  document.querySelector('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault()
    const email = document.querySelector('#email').value.trim()
    const password = document.querySelector('#password').value
    const button = e.currentTarget.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Signing in…'
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      showMessage(error.message)
      button.disabled = false
      button.textContent = 'Sign In'
    }
  })
}

async function loadData() {
  const today = new Date()
  const todayKey = dateKey(today)
  const weekday = today.getDay()
  const bounds = monthBounds(today)
  const since = new Date(today.getFullYear(), today.getMonth() - 11, 1)
  const historyStart = dateKey(since)

  const [dealershipsRes, assignmentsRes, todayAssignmentsRes, overridesRes, entriesRes, monthRes, historyRes] = await Promise.all([
    supabase.from('dealerships').select('*').eq('active', true).order('sort_order').order('name'),
    supabase.from('dealership_schedule').select('*').order('weekday').order('sort_order'),
    supabase.from('dealership_schedule').select('*').eq('weekday', weekday).order('sort_order'),
    supabase.from('daily_overrides').select('*').eq('work_date', todayKey).order('created_at'),
    supabase.from('work_entries').select('*').eq('work_date', todayKey),
    supabase.from('work_entries').select('*').gte('work_date', bounds.start).lte('work_date', bounds.end),
    supabase.from('work_entries').select('*').gte('work_date', historyStart).order('work_date', { ascending:false }),
  ])

  const responses = [dealershipsRes, assignmentsRes, todayAssignmentsRes, overridesRes, entriesRes, monthRes, historyRes]
  const error = responses.find(r => r.error)?.error
  if (error) throw error

  state.dealerships = dealershipsRes.data || []
  state.scheduleAssignments = assignmentsRes.data || []
  state.schedule = todayAssignmentsRes.data || []
  state.overrides = overridesRes.data || []
  state.entries = entriesRes.data || []
  state.monthEntries = monthRes.data || []
  state.history = historyRes.data || []
  if (!state.selectedMonth) state.selectedMonth = monthKey(today)
}

function dealershipById(id) {
  return state.dealerships.find(d => d.id === id)
}

function todayRoute() {
  const removed = new Set(
    state.overrides.filter(o => o.action === 'remove' && o.dealership_schedule_id).map(o => o.dealership_schedule_id)
  )

  const normal = state.schedule
    .filter(item => !removed.has(item.id))
    .map(item => {
      const dealership = dealershipById(item.dealership_id)
      if (!dealership) return null
      return {
        key:`dealership:${dealership.id}`,
        source:'weekly',
        sourceId:item.id,
        dealershipId:dealership.id,
        name:dealership.name,
        rate:Number(dealership.rate),
      }
    })
    .filter(Boolean)

  const extras = state.overrides
    .filter(o => o.action === 'add')
    .map(o => ({ key:`extra:${o.id}`, source:'extra', sourceId:o.id, dealershipId:null, name:o.dealership, rate:Number(o.rate) }))

  return [...normal, ...extras]
}

function entryFor(key) {
  return state.entries.find(e => e.route_key === key)
}

function sumEntries(entries) {
  return entries.reduce((acc,e) => {
    const cars = Number(e.cars || 0)
    acc.cars += cars
    acc.total += cars * Number(e.rate_snapshot || 0)
    return acc
  }, { cars:0, total:0 })
}

function todayTotals() {
  return sumEntries(state.entries)
}

function currentMonthTotals() {
  return sumEntries(state.monthEntries)
}

function historyByDay(entries = state.history) {
  const groups = new Map()
  for (const e of entries) {
    const current = groups.get(e.work_date) || { date:e.work_date, cars:0, total:0, entries:[] }
    current.cars += Number(e.cars || 0)
    current.total += Number(e.cars || 0) * Number(e.rate_snapshot || 0)
    current.entries.push(e)
    groups.set(e.work_date, current)
  }
  return [...groups.values()].sort((a,b) => b.date.localeCompare(a.date))
}

function historyByMonth() {
  const groups = new Map()
  for (const e of state.history) {
    const key = e.work_date.slice(0,7)
    const current = groups.get(key) || { key, cars:0, total:0, days:new Set() }
    current.cars += Number(e.cars || 0)
    current.total += Number(e.cars || 0) * Number(e.rate_snapshot || 0)
    if (Number(e.cars || 0) > 0) current.days.add(e.work_date)
    groups.set(key, current)
  }
  return [...groups.values()].sort((a,b) => b.key.localeCompare(a.key))
}

function dealershipTotals(entries) {
  const groups = new Map()
  for (const e of entries) {
    const cars = Number(e.cars || 0)
    if (cars <= 0) continue
    const name = String(e.dealership || 'Unknown Dealership')
    const current = groups.get(name) || { dealership:name, cars:0, total:0, workDays:new Set() }
    current.cars += cars
    current.total += cars * Number(e.rate_snapshot || 0)
    current.workDays.add(e.work_date)
    groups.set(name, current)
  }
  return [...groups.values()].sort((a,b) => a.dealership.localeCompare(b.dealership))
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportMonthCsv(key) {
  const entries = entriesForMonth(key)
    .filter(e => Number(e.cars || 0) > 0)
    .sort((a,b) => a.work_date.localeCompare(b.work_date) || String(a.dealership).localeCompare(String(b.dealership)))

  if (!entries.length) {
    alert('There are no recorded entries to export for this month.')
    return
  }

  const lines = [
    ['Date','Dealership','Cars','Rate Per Car','Amount'].map(csvCell).join(','),
    ...entries.map(e => [
      e.work_date,
      e.dealership,
      Number(e.cars || 0),
      Number(e.rate_snapshot || 0).toFixed(2),
      (Number(e.cars || 0) * Number(e.rate_snapshot || 0)).toFixed(2),
    ].map(csvCell).join(','))
  ]

  const totals = sumEntries(entries)
  lines.push('')
  lines.push(['MONTH TOTAL','',totals.cars,'',totals.total.toFixed(2)].map(csvCell).join(','))

  const blob = new Blob([`﻿${lines.join('\n')}`], { type:'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `car-wash-${key}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function appHeader(title = 'Car Wash Tracker', subtitle = '') {
  return `
    <header class="app-header">
      <div class="header-brand">
        <div class="mini-logo">${icons.car}</div>
        <div><h1>${esc(title)}</h1>${subtitle ? `<p>${esc(subtitle)}</p>` : ''}</div>
      </div>
      <button id="signOut" class="icon-button" title="Sign out" aria-label="Sign out">${icons.logout}</button>
    </header>
  `
}

function bottomNav() {
  const nav = [
    ['today','Today',icons.today],
    ['monthly','Monthly',icons.month],
    ['history','History',icons.history],
    ['settings','Settings',icons.settings],
  ]
  return `<nav class="bottom-nav" aria-label="Main navigation">${nav.map(([key,label,icon]) => `<button class="nav-item ${state.view===key?'active':''}" data-view="${key}">${icon}<span>${label}</span></button>`).join('')}</nav>`
}

function renderApp() {
  const now = new Date()
  const body = state.view === 'monthly'
    ? renderMonthlyView()
    : state.view === 'history'
      ? renderHistoryView()
      : state.view === 'settings'
        ? renderSettingsView()
        : renderTodayView()

  shell(`
    <div class="desktop-frame">
      ${appHeader('Car Wash Tracker', state.view === 'today' ? now.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}) : '')}
      <section class="view-container">${body}</section>
    </div>
    ${bottomNav()}
    ${renderAddModal()}
    ${renderRemoveModal()}
    ${renderEditDayModal()}
    ${renderNewDealershipModal()}
  `)

  bindGlobalEvents()
  bindViewEvents()
}

function renderTodayView() {
  const now = new Date()
  const route = todayRoute()
  const current = todayTotals()
  const month = currentMonthTotals()
  const bounds = monthBounds(now)

  return `
    <section class="today-intro">
      <div>
        <div class="eyebrow">Today</div>
        <h2>${DAY_NAMES[now.getDay()]}, ${now.toLocaleDateString(undefined,{month:'long',day:'numeric'})}</h2>
      </div>
      <div class="date-chip">${icons.calendar}<span>${esc(bounds.label)}</span></div>
    </section>

    <section class="summary-grid three">
      <article><span>Dealerships</span><strong>${route.length}</strong></article>
      <article><span>Cars Today</span><strong id="carsToday">${current.cars}</strong></article>
      <article class="accent-card"><span>Today's Earnings</span><strong id="earningsToday">${money(current.total)}</strong></article>
    </section>

    <section class="dealer-panel">
      <div class="section-title-row"><div><h2>Today's Route</h2><p>Enter only the number of cars. Everything saves automatically.</p></div><div id="saveState" class="save-state">Saved</div></div>
      <div class="dealer-list">
        ${route.length ? route.map(item => {
          const e = entryFor(item.key)
          const cars = Number(e?.cars || 0)
          // Once work has been recorded, keep using that entry's saved rate snapshot.
          // This prevents a later Settings rate change from visually rewriting today's recorded work.
          const effectiveRate = e ? Number(e.rate_snapshot) : Number(item.rate)
          return `
            <article class="dealer-card" data-key="${esc(item.key)}" data-rate="${effectiveRate}">
              <div class="dealer-info">
                <h3>${esc(item.name)}</h3>
                <p>${money(effectiveRate)} per car</p>
                ${item.source === 'extra' ? '<span class="today-only">Today only</span>' : ''}
              </div>
              <label class="cars-input"><span>Cars</span><input type="number" min="0" step="1" inputmode="numeric" value="${cars || ''}" placeholder="0" aria-label="Cars washed at ${esc(item.name)}"></label>
              <div class="dealer-amount"><span>Amount</span><strong>${money(cars * effectiveRate)}</strong></div>
              <button class="remove-today outline-danger" data-source="${item.source}" data-id="${item.sourceId}">${icons.trash}<span>Remove</span></button>
            </article>
          `
        }).join('') : `<div class="empty-state"><div class="empty-icon">${icons.car}</div><h3>No dealerships scheduled today</h3><p>Add one for today without changing your normal weekly schedule.</p></div>`}
      </div>

      <div class="route-actions">
        <button id="openAdd" class="outline-accent">${icons.plus}<span>Add Dealership</span></button>
        <div class="month-mini"><span>${esc(bounds.label)}</span><strong id="monthMiniTotal">${money(month.total)}</strong></div>
      </div>
    </section>
  `
}

function entriesForMonth(key) {
  return state.history.filter(e => e.work_date.startsWith(key))
}

function monthDateFromKey(key) {
  const [year,month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1)
}

function shiftMonthKey(key, delta) {
  const d = monthDateFromKey(key)
  d.setMonth(d.getMonth() + delta)
  return monthKey(d)
}

function renderMonthlyView() {
  const key = state.selectedMonth || monthKey(new Date())
  const date = monthDateFromKey(key)
  const label = date.toLocaleDateString(undefined,{month:'long',year:'numeric'})
  const monthEntries = entriesForMonth(key)
  const totals = sumEntries(monthEntries)
  const dealers = dealershipTotals(monthEntries)
  const days = historyByDay(monthEntries).filter(d => d.cars > 0)
  const avg = days.length ? totals.total / days.length : 0
  const max = Math.max(1, ...days.map(d => d.total))
  const currentKey = monthKey(new Date())
  const oldestKey = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 11, 1))

  return `
    <section class="month-heading">
      <button id="prevMonth" class="month-arrow" ${key<=oldestKey?'disabled':''}>‹</button>
      <div><div class="eyebrow">Monthly Summary</div><h2>${esc(label)}</h2><p>Automatically counted from the 1st through the last day.</p></div>
      <button id="nextMonth" class="month-arrow" ${key>=currentKey?'disabled':''}>›</button>
    </section>

    <section class="summary-grid four">
      <article class="accent-card"><span>Total Earnings</span><strong>${money(totals.total)}</strong></article>
      <article><span>Total Cars</span><strong>${totals.cars}</strong></article>
      <article><span>Work Days</span><strong>${days.length}</strong></article>
      <article><span>Avg. per Day</span><strong>${money(avg)}</strong></article>
    </section>

    <section class="dealer-breakdown-card">
      <div class="section-title-row breakdown-heading">
        <div><h2>Totals by Dealership</h2><p>See exactly how many cars and how much each dealership generated this month.</p></div>
        <button id="exportCsv" class="outline-accent export-button" ${monthEntries.some(e=>Number(e.cars||0)>0)?'':'disabled'}>${icons.calendar}<span>Export CSV</span></button>
      </div>
      ${dealers.length ? `<div class="dealer-breakdown-list">${dealers.map(d => `<div class="dealer-breakdown-row"><div><strong>${esc(d.dealership)}</strong><span>${d.cars} car${d.cars===1?'':'s'} · ${d.workDays.size} work day${d.workDays.size===1?'':'s'}</span></div><b>${money(d.total)}</b></div>`).join('')}</div>` : '<div class="empty-state compact-empty"><h3>No dealership totals yet</h3><p>Totals will appear after you record work for this month.</p></div>'}
    </section>

    <section class="chart-card">
      <div class="section-title-row"><div><h2>Daily Earnings</h2><p>${days.length ? `${days.length} recorded work day${days.length===1?'':'s'}` : 'No entries for this month yet.'}</p></div></div>
      ${days.length ? `<div class="bar-chart" aria-label="Daily earnings chart">${[...days].reverse().map(day => {
        const height = Math.max(8, Math.round(day.total / max * 100))
        const d = new Date(`${day.date}T12:00:00`)
        return `<div class="bar-column" title="${d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}: ${money(day.total)}"><div class="bar-value">${money(day.total)}</div><div class="bar-track"><div class="bar" style="height:${height}%"></div></div><span>${d.getDate()}</span></div>`
      }).join('')}</div>` : '<div class="empty-chart">Your chart will appear after you enter car counts.</div>'}
    </section>
  `
}

function renderHistoryView() {
  const days = historyByDay().filter(d => d.cars > 0)
  const months = historyByMonth()
  return `
    <section class="history-header"><div><div class="eyebrow">History</div><h2>Your Work History</h2><p>Review daily totals or jump to a previous month.</p></div></section>
    <div class="history-tabs"><button class="history-tab active" data-history="daily">Daily History</button><button class="history-tab" data-history="monthly">Monthly History</button></div>
    <section id="dailyHistory" class="history-card">
      ${days.length ? days.map(day => {
        const d = new Date(`${day.date}T12:00:00`)
        return `<details class="history-day"><summary><div><strong>${d.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric'})}</strong><span>${day.cars} cars</span></div><b>${money(day.total)}</b><i>›</i></summary><div class="history-detail">${day.entries.filter(e=>Number(e.cars||0)>0).map(e=>`<div><span>${esc(e.dealership)} <small>${Number(e.cars)} × ${money(e.rate_snapshot)}</small></span><strong>${money(Number(e.cars)*Number(e.rate_snapshot))}</strong></div>`).join('')}<div class="history-edit-action">${day.date < dateKey(new Date()) ? `<button class="edit-history-day outline-accent small" data-date="${day.date}">${icons.edit}<span>Edit This Day</span></button>` : '<span class="history-today-note">Use the Today screen to edit today.</span>'}</div></div></details>`
      }).join('') : '<div class="empty-state compact-empty"><h3>No history yet</h3><p>Your completed work days will appear here.</p></div>'}
    </section>
    <section id="monthlyHistory" class="history-card hidden">
      ${months.length ? months.map(m => {
        const label = monthDateFromKey(m.key).toLocaleDateString(undefined,{month:'long',year:'numeric'})
        return `<button class="month-history-row" data-month="${m.key}"><div><strong>${esc(label)}</strong><span>${m.cars} cars · ${m.days.size} work days</span></div><b>${money(m.total)}</b><i>›</i></button>`
      }).join('') : '<div class="empty-state compact-empty"><h3>No monthly history yet</h3></div>'}
    </section>
  `
}

function renderSettingsView() {
  return `
    <section class="settings-header"><div><div class="eyebrow">Settings</div><h2>Dealerships & Weekly Schedule</h2><p>Each dealership is saved once. Select every day of the week you normally visit it.</p></div><button id="openNewDealership" class="outline-accent">${icons.plus}<span>Add Dealership</span></button></section>
    <section class="settings-card dealership-settings-card">
      <div class="dealership-settings-list">
        ${state.dealerships.length ? state.dealerships.map(dealershipSettingsCard).join('') : '<div class="empty-state compact-empty"><h3>No dealerships yet</h3><p>Add your first dealership and choose all of its normal work days.</p></div>'}
      </div>
    </section>
    <section class="settings-tip"><strong>Example:</strong> Toyota can be checked for Monday, Wednesday, and Friday while remaining a single dealership in Supabase.</section>
    <section class="account-card"><div><h3>Account</h3><p>${esc(state.session?.user?.email || '')}</p></div><button id="settingsSignOut" class="outline-danger">${icons.logout}<span>Sign Out</span></button></section>
  `
}

function dealershipSettingsCard(item) {
  const scheduledDays = new Set(state.scheduleAssignments.filter(x => x.dealership_id === item.id).map(x => Number(x.weekday)))
  return `<article class="dealership-settings-row" data-id="${item.id}">
    <div class="dealership-settings-fields">
      <label>Dealership<input class="dealer-setting-name" value="${esc(item.name)}" autocomplete="off"></label>
      <label>Rate / car<input class="dealer-setting-rate" type="number" min="0" step="0.01" value="${Number(item.rate)}"></label>
      <div class="dealer-setting-actions"><button class="save-dealership primary small" type="button">Save</button><button class="delete-dealership icon-button-small danger-icon" type="button" aria-label="Delete ${esc(item.name)}">${icons.trash}</button></div>
    </div>
    <div class="weekday-picker" aria-label="Scheduled days for ${esc(item.name)}">
      ${DAY_NAMES.map((day, i) => `<label class="weekday-option"><input class="dealer-day-checkbox" type="checkbox" value="${i}" ${scheduledDays.has(i)?'checked':''}><span>${day.slice(0,3)}</span></label>`).join('')}
    </div>
  </article>`
}

function renderNewDealershipModal() {
  return `<dialog id="newDealershipModal" class="modal"><form id="newDealershipForm"><div class="modal-header"><div><h2>Add Dealership</h2><p>Create it once, then choose all recurring days.</p></div><button id="closeNewDealershipModal" class="modal-close" type="button">×</button></div><label>Dealership Name<input id="newDealerName" placeholder="e.g. Toyota" required></label><label>Rate per Car ($)<input id="newDealerRate" type="number" min="0" step="0.01" placeholder="e.g. 12.00" required></label><div><span class="modal-field-label">Normal Days</span><div class="weekday-picker modal-weekday-picker">${DAY_NAMES.map((day,i)=>`<label class="weekday-option"><input class="new-dealer-day" type="checkbox" value="${i}"><span>${day.slice(0,3)}</span></label>`).join('')}</div></div><button class="primary wide" type="submit">Add Dealership</button><button id="cancelNewDealership" class="ghost wide" type="button">Cancel</button><div id="newDealerMessage" class="message"></div></form></dialog>`
}

function renderAddModal() {
  return `<dialog id="addModal" class="modal"><form id="addTodayForm" method="dialog"><div class="modal-header"><div><h2>Add Dealership for Today</h2><p>This won't change your weekly schedule.</p></div><button id="closeAddModal" class="modal-close" type="button">×</button></div><label>Dealership Name<input id="addName" placeholder="e.g. Ford" required></label><label>Rate per Car ($)<input id="addRate" type="number" min="0" step="0.01" placeholder="e.g. 12.00" required></label><button class="primary wide" type="submit">Add Dealership</button><button id="cancelAdd" class="ghost wide" type="button">Cancel</button><div id="modalMessage" class="message"></div></form></dialog>`
}

function renderRemoveModal() {
  return `<dialog id="removeModal" class="modal confirm-modal"><form method="dialog"><div class="modal-header"><div><h2>Remove Dealership?</h2><p id="removeCopy">This affects today only.</p></div><button id="closeRemoveModal" class="modal-close" type="button">×</button></div><div class="confirm-actions"><button id="confirmRemove" class="danger solid-danger" type="button">Remove</button><button id="cancelRemove" class="ghost" type="button">Cancel</button></div></form></dialog>`
}


function renderEditDayModal() {
  return `<dialog id="editDayModal" class="modal edit-day-modal"><form id="editDayForm"><div class="modal-header"><div><h2>Edit Work Day</h2><p id="editDayLabel">Correct cars, rates, or missing dealerships.</p></div><button id="closeEditDayModal" class="modal-close" type="button">×</button></div><div id="editDayRows" class="edit-day-rows"></div><button id="addPastDealer" class="outline-accent wide" type="button">${icons.plus}<span>Add Dealership to This Day</span></button><div class="edit-day-footer"><button class="primary" type="submit">Save Changes</button><button id="cancelEditDay" class="ghost" type="button">Cancel</button></div><div id="editDayMessage" class="message"></div></form></dialog>`
}

function editDayRow(entry = {}) {
  const isNew = !entry.id
  return `<div class="edit-day-row" data-id="${entry.id || ''}" data-new="${isNew ? 'true' : 'false'}" data-deleted="false"><div class="edit-day-fields"><label>Dealership<input class="edit-dealer-name" value="${esc(entry.dealership || '')}" placeholder="Dealership name"></label><label>Cars<input class="edit-dealer-cars" type="number" min="0" step="1" inputmode="numeric" value="${Number(entry.cars || 0)}"></label><label>Rate / car<input class="edit-dealer-rate" type="number" min="0" step="0.01" value="${Number(entry.rate_snapshot || 0)}"></label><div class="edit-row-amount"><span>Amount</span><strong>${money(Number(entry.cars || 0) * Number(entry.rate_snapshot || 0))}</strong></div></div><button class="toggle-edit-row danger" type="button">${icons.trash}<span>Remove</span></button></div>`
}

function openEditDay(date) {
  const modal = document.querySelector('#editDayModal')
  const rows = document.querySelector('#editDayRows')
  const entries = state.history.filter(e => e.work_date === date)
  const d = new Date(`${date}T12:00:00`)
  modal.dataset.date = date
  document.querySelector('#editDayLabel').textContent = d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})
  rows.innerHTML = entries.length ? entries.map(editDayRow).join('') : editDayRow()
  bindEditDayRowEvents()
  modal.showModal()
}

function bindEditDayRowEvents() {
  document.querySelectorAll('#editDayRows .edit-day-row').forEach(row => {
    if (row.dataset.bound === 'true') return
    row.dataset.bound = 'true'
    const cars = row.querySelector('.edit-dealer-cars')
    const rate = row.querySelector('.edit-dealer-rate')
    const amount = row.querySelector('.edit-row-amount strong')
    const update = () => amount.textContent = money(Math.max(0, Number(cars.value || 0)) * Math.max(0, Number(rate.value || 0)))
    cars.addEventListener('input', update)
    rate.addEventListener('input', update)
    row.querySelector('.toggle-edit-row').addEventListener('click', (e) => {
      const deleted = row.dataset.deleted === 'true'
      row.dataset.deleted = deleted ? 'false' : 'true'
      row.classList.toggle('marked-delete', !deleted)
      row.querySelectorAll('input').forEach(input => input.disabled = !deleted)
      e.currentTarget.innerHTML = !deleted ? '<span>Undo Remove</span>' : `${icons.trash}<span>Remove</span>`
    })
  })
}

function bindGlobalEvents() {
  document.querySelector('#signOut')?.addEventListener('click', () => supabase.auth.signOut())
  document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
    state.view = btn.dataset.view
    renderApp()
  }))

  const addModal = document.querySelector('#addModal')
  document.querySelector('#openAdd')?.addEventListener('click', () => addModal.showModal())
  document.querySelector('#closeAddModal')?.addEventListener('click', () => addModal.close())
  document.querySelector('#cancelAdd')?.addEventListener('click', () => addModal.close())

  const removeModal = document.querySelector('#removeModal')
  document.querySelector('#closeRemoveModal')?.addEventListener('click', () => removeModal.close())
  document.querySelector('#cancelRemove')?.addEventListener('click', () => removeModal.close())

  const editDayModal = document.querySelector('#editDayModal')
  document.querySelector('#closeEditDayModal')?.addEventListener('click', () => editDayModal.close())
  document.querySelector('#cancelEditDay')?.addEventListener('click', () => editDayModal.close())
}

function bindViewEvents() {
  if (state.view === 'today') bindTodayEvents()
  if (state.view === 'monthly') bindMonthlyEvents()
  if (state.view === 'history') bindHistoryEvents()
  if (state.view === 'settings') bindSettingsEvents()
}

function syncEntryState(item, cars) {
  const today = dateKey(new Date())
  const make = () => ({ user_id:state.session.user.id, work_date:today, route_key:savedItem.key, dealership:savedItem.name, rate_snapshot:savedItem.rate, cars })
  const existingIndex = state.entries.findIndex(e => e.route_key === item.key)
  if (existingIndex >= 0) state.entries[existingIndex] = { ...state.entries[existingIndex], ...make() }
  else state.entries.push(make())

  const monthIndex = state.monthEntries.findIndex(e => e.work_date === today && e.route_key === item.key)
  if (monthIndex >= 0) state.monthEntries[monthIndex] = { ...state.monthEntries[monthIndex], ...make() }
  else state.monthEntries.push(make())

  const historyIndex = state.history.findIndex(e => e.work_date === today && e.route_key === item.key)
  if (historyIndex >= 0) state.history[historyIndex] = { ...state.history[historyIndex], ...make() }
  else state.history.push(make())
}

function updateTodaySummary() {
  const current = todayTotals()
  const month = currentMonthTotals()
  const cars = document.querySelector('#carsToday')
  const earnings = document.querySelector('#earningsToday')
  const monthTotal = document.querySelector('#monthMiniTotal')
  if (cars) cars.textContent = current.cars
  if (earnings) earnings.textContent = money(current.total)
  if (monthTotal) monthTotal.textContent = money(month.total)
}

function setSaveState(text, mode='') {
  const node = document.querySelector('#saveState')
  if (!node) return
  node.textContent = text
  node.className = `save-state ${mode}`
}

function bindTodayEvents() {
  const today = dateKey(new Date())

  document.querySelector('#addTodayForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const dealership = document.querySelector('#addName').value.trim()
    const rate = Number(document.querySelector('#addRate').value)
    if (!dealership || !Number.isFinite(rate) || rate < 0) return showMessage('Enter a dealership name and valid rate.', 'error', '#modalMessage')

    const button = e.currentTarget.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Adding…'
    const { error } = await supabase.from('daily_overrides').insert({ user_id:state.session.user.id, work_date:today, action:'add', dealership, rate })
    if (error) {
      showMessage(error.message, 'error', '#modalMessage')
      button.disabled = false
      button.textContent = 'Add Dealership'
    } else {
      document.querySelector('#addModal').close()
      await refresh(false)
    }
  })

  document.querySelectorAll('.dealer-card').forEach(card => {
    const key = card.dataset.key
    const item = todayRoute().find(r => r.key === key)
    const effectiveRate = Number(card.dataset.rate ?? item?.rate ?? 0)
    const savedItem = { ...item, rate:effectiveRate }
    const input = card.querySelector('input[type="number"]')
    const amount = card.querySelector('.dealer-amount strong')
    let timer

    input.addEventListener('input', () => {
      clearTimeout(timer)
      const cars = Math.max(0, Math.floor(Number(input.value || 0)))
      input.value = cars || ''
      amount.textContent = money(cars * effectiveRate)
      syncEntryState(savedItem, cars)
      updateTodaySummary()
      setSaveState('Saving…', 'saving')

      timer = setTimeout(async () => {
        const payload = { user_id:state.session.user.id, work_date:today, route_key:savedItem.key, dealership:savedItem.name, rate_snapshot:savedItem.rate, cars }
        const { error } = await supabase.from('work_entries').upsert(payload, { onConflict:'user_id,work_date,route_key' })
        if (error) setSaveState('Save failed', 'error')
        else setSaveState('Saved', 'saved')
      }, 450)
    })
  })

  let pendingRemove = null
  const removeModal = document.querySelector('#removeModal')
  document.querySelectorAll('.remove-today').forEach(btn => btn.addEventListener('click', () => {
    const card = btn.closest('.dealer-card')
    pendingRemove = { source:btn.dataset.source, id:btn.dataset.id, key:card.dataset.key, name:card.querySelector('.dealer-info h3').textContent }
    document.querySelector('#removeCopy').textContent = `Remove ${pendingRemove.name} from today's route? Your normal weekly schedule will stay the same.`
    removeModal.showModal()
  }))

  document.querySelector('#confirmRemove')?.addEventListener('click', async () => {
    if (!pendingRemove) return
    const { source, id, key } = pendingRemove
    const button = document.querySelector('#confirmRemove')
    button.disabled = true
    button.textContent = 'Removing…'

    if (source === 'weekly') {
      const { error } = await supabase.from('daily_overrides').insert({ user_id:state.session.user.id, work_date:today, action:'remove', dealership_schedule_id:id })
      if (error) return alert(error.message)
      await supabase.from('work_entries').delete().eq('work_date', today).eq('route_key', key)
    } else {
      const { error } = await supabase.from('daily_overrides').delete().eq('id', id)
      if (error) return alert(error.message)
      await supabase.from('work_entries').delete().eq('work_date', today).eq('route_key', `extra:${id}`)
    }
    removeModal.close()
    await refresh(false)
  })
}

function bindMonthlyEvents() {
  document.querySelector('#prevMonth')?.addEventListener('click', () => {
    state.selectedMonth = shiftMonthKey(state.selectedMonth, -1)
    renderApp()
  })
  document.querySelector('#nextMonth')?.addEventListener('click', () => {
    state.selectedMonth = shiftMonthKey(state.selectedMonth, 1)
    renderApp()
  })
  document.querySelector('#exportCsv')?.addEventListener('click', () => exportMonthCsv(state.selectedMonth))
}

function bindHistoryEvents() {
  document.querySelectorAll('.history-tab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.history-tab').forEach(x => x.classList.toggle('active', x === btn))
    document.querySelector('#dailyHistory').classList.toggle('hidden', btn.dataset.history !== 'daily')
    document.querySelector('#monthlyHistory').classList.toggle('hidden', btn.dataset.history !== 'monthly')
  }))
  document.querySelectorAll('.month-history-row').forEach(btn => btn.addEventListener('click', () => {
    state.selectedMonth = btn.dataset.month
    state.view = 'monthly'
    renderApp()
  }))
  document.querySelectorAll('.edit-history-day').forEach(btn => btn.addEventListener('click', (e) => {
    e.preventDefault()
    e.stopPropagation()
    openEditDay(btn.dataset.date)
  }))

  document.querySelector('#addPastDealer')?.addEventListener('click', () => {
    const rows = document.querySelector('#editDayRows')
    rows.insertAdjacentHTML('beforeend', editDayRow())
    bindEditDayRowEvents()
    const newest = rows.lastElementChild
    newest?.querySelector('.edit-dealer-name')?.focus()
  })

  document.querySelector('#editDayForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const modal = document.querySelector('#editDayModal')
    const date = modal.dataset.date
    const rows = [...document.querySelectorAll('#editDayRows .edit-day-row')]
    const deleteIds = []
    const updates = []
    const inserts = []

    for (const row of rows) {
      if (row.dataset.deleted === 'true') {
        if (row.dataset.id) deleteIds.push(row.dataset.id)
        continue
      }
      const dealership = row.querySelector('.edit-dealer-name').value.trim()
      const cars = Math.max(0, Math.floor(Number(row.querySelector('.edit-dealer-cars').value || 0)))
      const rate = Number(row.querySelector('.edit-dealer-rate').value)
      if (!dealership || !Number.isFinite(rate) || rate < 0) {
        return showMessage('Every active row needs a dealership name and valid rate.', 'error', '#editDayMessage')
      }
      if (row.dataset.id) {
        updates.push({ id:row.dataset.id, dealership, cars, rate_snapshot:rate })
      } else {
        const unique = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`
        inserts.push({ user_id:state.session.user.id, work_date:date, route_key:`history:${unique}`, dealership, rate_snapshot:rate, cars })
      }
    }

    const saveButton = e.currentTarget.querySelector('button[type="submit"]')
    saveButton.disabled = true
    saveButton.textContent = 'Saving…'

    try {
      if (deleteIds.length) {
        const { error } = await supabase.from('work_entries').delete().in('id', deleteIds)
        if (error) throw error
      }
      for (const item of updates) {
        const { error } = await supabase.from('work_entries').update({ dealership:item.dealership, cars:item.cars, rate_snapshot:item.rate_snapshot, updated_at:new Date().toISOString() }).eq('id', item.id)
        if (error) throw error
      }
      if (inserts.length) {
        const { error } = await supabase.from('work_entries').insert(inserts)
        if (error) throw error
      }
      modal.close()
      await refresh(false)
    } catch (error) {
      saveButton.disabled = false
      saveButton.textContent = 'Save Changes'
      showMessage(error.message, 'error', '#editDayMessage')
    }
  })
}

function bindSettingsEvents() {
  document.querySelector('#settingsSignOut')?.addEventListener('click', () => supabase.auth.signOut())

  const modal = document.querySelector('#newDealershipModal')
  document.querySelector('#openNewDealership')?.addEventListener('click', () => modal.showModal())
  document.querySelector('#closeNewDealershipModal')?.addEventListener('click', () => modal.close())
  document.querySelector('#cancelNewDealership')?.addEventListener('click', () => modal.close())

  document.querySelectorAll('.save-dealership').forEach(btn => btn.addEventListener('click', saveDealershipCard))
  document.querySelectorAll('.delete-dealership').forEach(btn => btn.addEventListener('click', deleteDealership))

  document.querySelector('#newDealershipForm')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const name = document.querySelector('#newDealerName').value.trim()
    const rate = Number(document.querySelector('#newDealerRate').value)
    const weekdays = [...document.querySelectorAll('.new-dealer-day:checked')].map(x => Number(x.value))
    if (!name || !Number.isFinite(rate) || rate < 0) return showMessage('Enter a dealership name and valid rate.', 'error', '#newDealerMessage')

    const button = e.currentTarget.querySelector('button[type="submit"]')
    button.disabled = true
    button.textContent = 'Adding…'

    const { data, error } = await supabase.from('dealerships').insert({ user_id:state.session.user.id, name, rate, sort_order:100 }).select('id').single()
    if (error) {
      button.disabled = false
      button.textContent = 'Add Dealership'
      return showMessage(error.message, 'error', '#newDealerMessage')
    }

    if (weekdays.length) {
      const rows = weekdays.map((weekday, index) => ({ user_id:state.session.user.id, dealership_id:data.id, weekday, sort_order:index }))
      const { error:scheduleError } = await supabase.from('dealership_schedule').insert(rows)
      if (scheduleError) {
        await supabase.from('dealerships').delete().eq('id', data.id)
        button.disabled = false
        button.textContent = 'Add Dealership'
        return showMessage(scheduleError.message, 'error', '#newDealerMessage')
      }
    }

    modal.close()
    await refresh(false)
  })
}

async function saveDealershipCard(e) {
  const row = e.target.closest('.dealership-settings-row')
  const dealershipId = row.dataset.id
  const name = row.querySelector('.dealer-setting-name').value.trim()
  const rate = Number(row.querySelector('.dealer-setting-rate').value)
  const wantedDays = new Set([...row.querySelectorAll('.dealer-day-checkbox:checked')].map(x => Number(x.value)))
  if (!name || !Number.isFinite(rate) || rate < 0) return alert('Enter a valid dealership name and rate.')

  const button = e.target
  button.disabled = true
  button.textContent = 'Saving…'

  try {
    const { error:updateError } = await supabase.from('dealerships').update({ name, rate, updated_at:new Date().toISOString() }).eq('id', dealershipId)
    if (updateError) throw updateError

    const existing = state.scheduleAssignments.filter(x => x.dealership_id === dealershipId)
    const existingDays = new Set(existing.map(x => Number(x.weekday)))
    const deleteIds = existing.filter(x => !wantedDays.has(Number(x.weekday))).map(x => x.id)
    const addDays = [...wantedDays].filter(day => !existingDays.has(day))

    if (deleteIds.length) {
      const { error } = await supabase.from('dealership_schedule').delete().in('id', deleteIds)
      if (error) throw error
    }
    if (addDays.length) {
      const rows = addDays.map((weekday, index) => ({ user_id:state.session.user.id, dealership_id:dealershipId, weekday, sort_order:100 + index }))
      const { error } = await supabase.from('dealership_schedule').insert(rows)
      if (error) throw error
    }

    await refresh(false)
  } catch (error) {
    alert(error.message || 'Unable to save dealership changes.')
    // Reload the server state so a partial network/database failure is not hidden by stale UI.
    await refresh(false)
  } finally {
    if (button.isConnected) {
      button.disabled = false
      button.textContent = 'Save'
    }
  }
}

async function deleteDealership(e) {
  const row = e.target.closest('.dealership-settings-row')
  const name = row.querySelector('.dealer-setting-name').value.trim() || 'this dealership'
  if (!confirm(`Delete ${name} from your dealership list and weekly schedule? Historical work entries will be kept.`)) return
  const { error } = await supabase.from('dealerships').delete().eq('id', row.dataset.id)
  if (error) alert(error.message)
  else await refresh(false)
}

async function refresh(resetView = false) {
  try {
    if (resetView) state.view = 'today'
    await loadData()
    renderApp()
  } catch (error) {
    shell(`<section class="auth-card error-card"><h1>Something went wrong</h1><p>${esc(error.message)}</p><button class="primary" onclick="location.reload()">Try again</button></section>`, { login:true })
  }
}

async function boot() {
  const { data:{ session } } = await supabase.auth.getSession()
  state.session = session
  if (session) await refresh(true)
  else renderLogin()

  supabase.auth.onAuthStateChange(async (_event, session) => {
    state.session = session
    if (session) await refresh(true)
    else renderLogin()
  })
}

boot()
