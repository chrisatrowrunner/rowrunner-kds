// store.tsx — KDS app state: session, routing, the live board feed, and the
// confirm → ready actions. One context so screens read a small `useStore()`
// surface (same pattern as the fan and runner apps' stores).
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { KdsOrder, StaffSession, Screen } from '../types'
import { createKdsApi } from '../lib/orders'
import { restore, signIn, signOut } from '../lib/auth'

export interface Store {
  // session
  session: StaffSession | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  // routing
  screen: Screen
  // live data
  newOrders: KdsOrder[] // confirmed_at null — the "New" column, oldest-first
  preparing: KdsOrder[] // confirmed_at set, ready_at null — the "Preparing" column
  /** ms-precision clock that ticks every second, for live age timers */
  now: number
  // actions
  confirm: (orderId: string) => Promise<void>
  ready: (orderId: string) => Promise<void>
  // chrome
  toast: (msg: string) => void
  toastMsg: string | null
}

const StoreContext = createContext<Store | null>(null)

// One API instance for the app's lifetime (Supabase when wired, else mock).
const api = createKdsApi()

export function StoreProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StaffSession | null>(null)
  const [screen, setScreen] = useState<Screen>('login')
  const [orders, setOrders] = useState<KdsOrder[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── restore a persisted session on load ──
  useEffect(() => {
    restore().then((s) => {
      if (s) {
        setSession(s)
        setScreen('board')
      }
    })
  }, [])

  // ── live board feed ──
  // Subscribe only once authenticated: Supabase RLS and Realtime both key off
  // the connection's role, so subscribing before login would bind the channel to
  // the anon role. Realtime is the fast path; we ALSO poll every few seconds as a
  // guaranteed fallback. Both just replace the full board set — safe together.
  useEffect(() => {
    if (!session) {
      setOrders([])
      return
    }
    const unsubscribe = api.subscribe(setOrders)
    const poll = setInterval(() => {
      api.listBoard().then(setOrders).catch(() => {})
    }, 4000)
    return () => {
      unsubscribe()
      clearInterval(poll)
    }
  }, [session])

  // ── 1s clock for age timers ──
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Two columns. The board feed already excludes ready/delivered orders, so we
  // only split on whether the kitchen has confirmed the ticket yet.
  const newOrders = useMemo(() => orders.filter((o) => o.confirmedAt == null), [orders])
  const preparing = useMemo(() => orders.filter((o) => o.confirmedAt != null), [orders])

  const toast = (msg: string) => {
    setToastMsg(msg)
    if (toastT.current) clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToastMsg(null), 1900)
  }

  const login = async (email: string, password: string) => {
    const s = await signIn(email, password)
    setSession(s)
    setScreen('board')
  }

  const logout = () => {
    void signOut()
    setSession(null)
    setScreen('login')
  }

  // Optimistic + authoritative: flip the flag locally for an instant response,
  // then let the poll/realtime refresh reconcile with the server.
  const confirm = async (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId && o.confirmedAt == null ? { ...o, confirmedAt: now } : o)),
    )
    try {
      await api.confirm(orderId)
    } catch {
      toast('Could not confirm — refreshing')
      api.listBoard().then(setOrders).catch(() => {})
    }
  }

  const ready = async (orderId: string) => {
    // Drop it from the board immediately; the server write removes it for real.
    setOrders((prev) => prev.filter((o) => o.id !== orderId))
    try {
      await api.ready(orderId)
    } catch {
      toast('Could not mark ready — refreshing')
      api.listBoard().then(setOrders).catch(() => {})
    }
  }

  const value: Store = {
    session,
    login,
    logout,
    screen,
    newOrders,
    preparing,
    now,
    confirm,
    ready,
    toast,
    toastMsg,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): Store {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>')
  return ctx
}

// ── live age helpers ─────────────────────────────────────────
/** "3:05" style elapsed time since the order was placed. */
export function ageLabel(placedAt: number, now: number): string {
  const sec = Math.max(0, Math.floor((now - placedAt) / 1000))
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export type Urgency = 'fresh' | 'warn' | 'late'
/** Color tier by how long the order has waited. Kitchen prep thresholds. */
export function urgency(placedAt: number, now: number): Urgency {
  const sec = (now - placedAt) / 1000
  if (sec >= 300) return 'late'
  if (sec >= 150) return 'warn'
  return 'fresh'
}
