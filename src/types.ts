// Shared domain types for the RowRunner Kitchen Display System (KDS).
//
// These mirror the fan and runner apps' contract: one shared Supabase `orders`
// row drives all three apps. The KDS cares about the KITCHEN slice of that row —
// what to make (seat, items, guest, note) and the two kitchen timestamps it
// owns: `confirmed_at` (kitchen accepted the ticket) and `ready_at` (food is up,
// hand it to a runner). It never touches runner_id/stage-4 delivery.

/** A seat in the venue — identical shape to the fan and runner apps' `Seat`. */
export interface Seat {
  section: string
  row: string
  seat: string
}

/** One line of an order, as the kitchen needs to make it (no pricing). */
export interface OrderLine {
  name: string
  qty: number
  /** chosen option, e.g. "Classic Buffalo" — null when the item has none */
  option: string | null
  /** add-ons, e.g. ["Extra Sauce"] */
  addons: string[]
}

/**
 * Order lifecycle stages — index matches the fan/runner apps:
 *   0 received · 1 preparing · 2 picked up · 3 on the way · 4 delivered
 * The KDS only ever works orders the kitchen hasn't finished (stage < 4).
 */
export type OrderStage = 0 | 1 | 2 | 3 | 4

/** The order as the kitchen board models it. */
export interface KdsOrder {
  id: string
  orderNo: number
  /** the guest's name — printed on the ticket / label */
  customerName: string | null
  /** special instructions / dietary notes from the guest (may be empty) */
  notes: string | null
  seat: Seat
  lines: OrderLine[]
  /** when the fan placed it (epoch ms) — drives the live age timer */
  placedAt: number
  stage: OrderStage
  /** kitchen accepted the ticket (epoch ms) — null while it's a new order */
  confirmedAt: number | null
  /** food is up / ready for a runner (epoch ms) — null while still preparing */
  readyAt: number | null
}

/** A signed-in kitchen staff member. */
export interface StaffSession {
  id: string
  name: string
  email: string
}

/** KDS screens. */
export type Screen = 'login' | 'board'
