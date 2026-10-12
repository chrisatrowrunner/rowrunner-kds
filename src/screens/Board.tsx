// Board.tsx — the kitchen display. A fixed landscape kiosk board with two
// columns: "New" (tap Confirm) and "Preparing" (tap Ready). Designed to be
// glanceable from across a kitchen — big type, high contrast, one tap per card.
import { useStore, ageLabel, urgency } from '../store/store'
import type { KdsOrder } from '../types'
import { seatLines } from '../lib/seat'
import { Icon } from '../components/Icon'

// urgency → chip tone for the live age timer
const URGENCY = {
  fresh: { bg: 'rgba(91,184,212,.16)', c: 'var(--ice-deep)' },
  warn: { bg: 'rgba(245,158,11,.18)', c: '#B45309' },
  late: { bg: 'rgba(239,68,68,.16)', c: '#B91C1C' },
} as const

function itemCount(o: KdsOrder): number {
  return o.lines.reduce((n, l) => n + l.qty, 0)
}

/** One order ticket. `variant` picks the action button (Confirm vs Ready). */
function OrderCard({ o, variant }: { o: KdsOrder; variant: 'new' | 'preparing' }) {
  const s = useStore()
  const u = urgency(o.placedAt, s.now)
  const tone = URGENCY[u]
  const n = itemCount(o)
  const accent = variant === 'new' ? 'var(--navy)' : 'var(--ice-deep)'

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 'var(--r-card)',
        padding: '18px 18px 16px',
        boxShadow: 'var(--shadow-card)',
        border: u === 'late' ? '2px solid rgba(239,68,68,.45)' : '1px solid var(--line)',
        borderLeft: `6px solid ${accent}`,
        animation: 'rr-rise .22s ease both',
      }}
    >
      {/* top row: seat (big) + live age */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.6, color: 'var(--faint)', textTransform: 'uppercase' }}>
            {seatLines(o.seat).area} · #{o.orderNo}
          </div>
          <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--navy)', letterSpacing: -0.5, lineHeight: 1.1 }}>
            {seatLines(o.seat).spot}
          </div>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 15,
            fontWeight: 800,
            fontVariantNumeric: 'tabular-nums',
            padding: '8px 12px',
            borderRadius: 999,
            background: tone.bg,
            color: tone.c,
            flex: '0 0 auto',
          }}
        >
          <Icon name="clock" size={15} sw={2.4} /> {ageLabel(o.placedAt, s.now)}
        </span>
      </div>

      {/* guest */}
      {o.customerName && (
        <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: 15, fontWeight: 700 }}>
          👤 {o.customerName}
        </div>
      )}

      {/* items — the kitchen reads every line in full */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {o.lines.map((l, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
            <span
              style={{
                flex: '0 0 auto',
                minWidth: 34,
                height: 30,
                padding: '0 9px',
                borderRadius: 9,
                background: 'var(--offwhite)',
                color: 'var(--navy)',
                fontSize: 17,
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {l.qty}×
            </span>
            <div style={{ minWidth: 0 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)' }}>{l.name}</span>
              {l.option && (
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--muted)' }}> · {l.option}</span>
              )}
              {l.addons.length > 0 && (
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ice-deep)', marginTop: 2 }}>
                  + {l.addons.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* note — flagged with a warning triangle */}
      {o.notes && (
        <div
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 12,
            background: 'rgba(245,158,11,.12)',
            color: '#92400E',
            fontSize: 15,
            fontWeight: 800,
            display: 'flex',
            gap: 8,
            alignItems: 'flex-start',
          }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>⚠️</span>
          <span>{o.notes}</span>
        </div>
      )}

      {/* action */}
      <button
        onClick={() => (variant === 'new' ? s.confirm(o.id) : s.ready(o.id))}
        style={{
          width: '100%',
          height: 60,
          marginTop: 16,
          borderRadius: 16,
          background: variant === 'new' ? 'var(--navy)' : 'var(--ice)',
          color: variant === 'new' ? '#fff' : 'var(--navy)',
          fontSize: 20,
          fontWeight: 800,
          letterSpacing: 0.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: variant === 'preparing' ? '0 8px 20px rgba(91,184,212,.4)' : 'none',
          transition: 'transform .1s',
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(.97)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {variant === 'new' ? (
          <>
            Confirm <Icon name="check" size={22} sw={3} />
          </>
        ) : (
          <>
            Mark ready <Icon name="arrowR" size={22} sw={2.8} />
          </>
        )}
      </button>
      <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12.5, fontWeight: 700, color: 'var(--faint)' }}>
        {n} item{n !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

/** One of the two board columns. */
function Column({
  title,
  accent,
  orders,
  variant,
  emptyIcon,
  emptyText,
}: {
  title: string
  accent: string
  orders: KdsOrder[]
  variant: 'new' | 'preparing'
  emptyIcon: string
  emptyText: string
}) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        borderRight: variant === 'new' ? '1px solid var(--line)' : 'none',
      }}
    >
      <div
        style={{
          flex: '0 0 auto',
          padding: '16px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid var(--line)',
          background: '#fff',
        }}
      >
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: accent, flex: '0 0 auto' }} />
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--navy)', letterSpacing: -0.3 }}>
          {title}
        </h2>
        <span
          style={{
            marginLeft: 'auto',
            minWidth: 34,
            height: 34,
            padding: '0 12px',
            borderRadius: 999,
            background: accent,
            color: '#fff',
            fontSize: 17,
            fontWeight: 800,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {orders.length}
        </span>
      </div>

      <div
        className="rr-scroll"
        style={{
          flex: 1,
          overflow: 'auto',
          padding: 18,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gridAutoRows: 'min-content',
          gap: 16,
          alignContent: 'start',
        }}
      >
        {orders.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: '72px 24px',
              color: 'var(--muted)',
            }}
          >
            <div style={{ fontSize: 48 }}>{emptyIcon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', marginTop: 10 }}>{emptyText}</div>
          </div>
        ) : (
          orders.map((o) => <OrderCard key={o.id} o={o} variant={variant} />)
        )}
      </div>
    </div>
  )
}

export function BoardScreen() {
  const s = useStore()
  const first = s.session?.name?.split(' ')[0] ?? 'Chef'

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--offwhite)' }}>
      {/* header */}
      <div
        style={{
          flex: '0 0 auto',
          background: 'var(--navy)',
          color: '#fff',
          padding: '14px 22px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <img src="/assets/logo-lockup-white.png" alt="RowRunner" style={{ height: 30, objectFit: 'contain' }} />
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.2 }}>Kitchen</span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--ice)',
            background: 'rgba(91,184,212,.16)',
            padding: '7px 12px',
            borderRadius: 999,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--ice)', animation: 'rr-pulse 1.6s infinite' }} />
          LIVE
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.7)' }}>Hi {first} 👋</span>
          <button
            onClick={s.logout}
            aria-label="Sign out"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              height: 42,
              padding: '0 16px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.12)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 800,
            }}
          >
            <Icon name="x" size={16} sw={2.6} /> Sign out
          </button>
        </div>
      </div>

      {/* two columns */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <Column
          title="New"
          accent="var(--navy)"
          orders={s.newOrders}
          variant="new"
          emptyIcon="✅"
          emptyText="No new orders"
        />
        <Column
          title="Preparing"
          accent="var(--ice-deep)"
          orders={s.preparing}
          variant="preparing"
          emptyIcon="🍳"
          emptyText="Nothing in the pass"
        />
      </div>
    </div>
  )
}
