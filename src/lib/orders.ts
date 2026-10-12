// orders.ts — the integration seam between the KDS board and the backend.
//
// The KDS reads the shared Supabase `orders` table and owns two kitchen
// timestamps on each row:
//   • confirm(id) → sets confirmed_at = now  (moves New → Preparing)
//   • ready(id)   → sets ready_at = now      (leaves the board; runner can claim)
//
// The board only ever shows orders the kitchen hasn't finished: ready_at is null
// AND stage < 4. Split into columns client-side by whether confirmed_at is set.
//
// A local in-memory mock (createMockApi) is kept for offline/dev work and is
// used automatically when Supabase env vars are absent (or VITE_USE_MOCK=1).
import type { KdsOrder } from '../types'
import { getSupabase, hasSupabase } from './supabase'

/** Everything the kitchen board needs from the backend. */
export interface KdsApi {
  /** Orders still on the kitchen board (ready_at null, stage < 4), oldest-first. */
  listBoard(): Promise<KdsOrder[]>
  /** Accept a new ticket: sets confirmed_at = now. Moves it New → Preparing. */
  confirm(orderId: string): Promise<void>
  /** Food is up: sets ready_at = now. Removes it from the board for a runner. */
  ready(orderId: string): Promise<void>
  /** Live updates — fires the full board set whenever anything changes. */
  subscribe(onChange: (orders: KdsOrder[]) => void): () => void
}

const byAge = (a: KdsOrder, b: KdsOrder) => a.placedAt - b.placedAt
const USE_MOCK = !!import.meta.env.VITE_USE_MOCK

// ── Supabase implementation (default when env vars are set) ───
// Explicit column list — NEVER select `code` (the handoff code is hidden from
// the table API by column-level grants; it's only verified via deliver_order).
const COLS =
  'id, order_no, customer_name, notes, seat, lines, placed_at, stage, confirmed_at, ready_at'

/** Raw `orders` table row (snake_case) → KdsOrder (camelCase). */
type OrderRow = {
  id: string
  order_no: number
  customer_name: string | null
  notes: string | null
  seat: KdsOrder['seat']
  lines: KdsOrder['lines'] | null
  placed_at: string
  stage: KdsOrder['stage']
  confirmed_at: string | null
  ready_at: string | null
}
function rowToOrder(r: OrderRow): KdsOrder {
  return {
    id: r.id,
    orderNo: r.order_no,
    customerName: r.customer_name,
    notes: r.notes,
    seat: r.seat,
    lines: r.lines ?? [],
    placedAt: new Date(r.placed_at).getTime(),
    stage: r.stage,
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at).getTime() : null,
    readyAt: r.ready_at ? new Date(r.ready_at).getTime() : null,
  }
}

function createSupabaseApi(): KdsApi {
  const sb = getSupabase()
  const listBoard = async () => {
    // On the board = not yet ready and not yet delivered.
    const { data, error } = await sb
      .from('orders')
      .select(COLS)
      .is('ready_at', null)
      .lt('stage', 4)
      .order('placed_at', { ascending: true })
    if (error) throw error
    return (data as unknown as OrderRow[]).map(rowToOrder)
  }
  return {
    listBoard,
    async confirm(orderId) {
      // .is('confirmed_at', null) keeps it idempotent — a second tap changes nothing.
      const { error } = await sb
        .from('orders')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('id', orderId)
        .is('confirmed_at', null)
      if (error) throw error
    },
    async ready(orderId) {
      const { error } = await sb
        .from('orders')
        .update({ ready_at: new Date().toISOString() })
        .eq('id', orderId)
        .is('ready_at', null)
      if (error) throw error
    },
    subscribe(onChange) {
      listBoard().then(onChange).catch(() => {})
      const ch = sb
        .channel('kds-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          listBoard().then(onChange).catch(() => {})
        })
        .subscribe()
      return () => {
        sb.removeChannel(ch)
      }
    },
  }
}

// ── Mock implementation (offline / no Supabase env) ──────────
// In-memory store that streams a new order every so often — for dev only.
function makeMockOrder(n: number): KdsOrder {
  // Pam's Grill (URI men's soccer pilot) items + map zones.
  const menus = [
    [{ name: 'Classic Cheeseburger', qty: 1, option: 'Double', addons: ['Bacon'] }],
    [
      { name: 'All-Beef Hot Dog', qty: 2, option: 'Chili Dog', addons: [] },
      { name: 'French Fries', qty: 1, option: 'Large', addons: ['Cheese Sauce'] },
    ],
    [{ name: 'Mozzarella Sticks', qty: 1, option: null, addons: ['Extra Marinara'] }],
    [
      { name: 'Chicken Tenders', qty: 1, option: 'Buffalo', addons: [] },
      { name: 'Onion Rings', qty: 1, option: null, addons: [] },
    ],
  ]
  const zones = [
    { zone: 'A1', label: 'Section A1', detail: 'South bleachers' },
    { zone: 'A3', label: 'Section A3', detail: 'South bleachers' },
    { zone: 'B', label: 'Zone B', detail: 'North sideline' },
    { zone: 'C', label: 'Zone C', detail: 'East end' },
    { zone: 'A0', label: 'Section A0', detail: 'South bleachers' },
  ]
  const names = ['Alex Rivera', 'Jordan Lee', 'Sam Patel', 'Casey Nguyen', null]
  const notes = ['No onions please', 'Gluten-free bun', null, null, null]
  return {
    id: 'mock_' + n + '_' + (n * 2654435761 % 100000),
    orderNo: 4900 + n,
    customerName: names[n % names.length],
    notes: notes[n % notes.length],
    seat: { section: zones[n % zones.length].zone, row: '', seat: '', ...zones[n % zones.length] },
    lines: menus[n % menus.length],
    placedAt: Date.now() - (n % 4) * 45000,
    stage: 1,
    confirmedAt: null,
    readyAt: null,
  }
}

function createMockApi(): KdsApi {
  let orders: KdsOrder[] = [0, 1, 2].map(makeMockOrder)
  let seq = 3
  const subs = new Set<(o: KdsOrder[]) => void>()
  let timer: ReturnType<typeof setInterval> | null = null

  const board = () => orders.filter((o) => o.readyAt == null && o.stage < 4).sort(byAge)
  const emit = () => {
    const snap = board()
    subs.forEach((fn) => fn(snap))
  }
  const start = () => {
    if (timer) return
    timer = setInterval(() => {
      orders = [...orders, makeMockOrder(seq++)]
      emit()
    }, 15000 + Math.floor((seq % 5) * 1000))
  }
  const stop = () => {
    if (timer) clearInterval(timer)
    timer = null
  }
  const find = (id: string) => orders.find((x) => x.id === id)

  return {
    async listBoard() {
      return board()
    },
    async confirm(orderId) {
      const o = find(orderId)
      if (o && o.confirmedAt == null) o.confirmedAt = Date.now()
      emit()
    },
    async ready(orderId) {
      const o = find(orderId)
      if (o && o.readyAt == null) o.readyAt = Date.now()
      emit()
    },
    subscribe(onChange) {
      subs.add(onChange)
      start()
      onChange(board())
      return () => {
        subs.delete(onChange)
        if (subs.size === 0) stop()
      }
    },
  }
}

/** Supabase when configured; else the local mock (offline dev). */
export function createKdsApi(): KdsApi {
  if (hasSupabase && !USE_MOCK) return createSupabaseApi()
  return createMockApi()
}

/** True when no real auth backend is configured (drives the login demo hint). */
export const isMockMode = !hasSupabase || USE_MOCK
