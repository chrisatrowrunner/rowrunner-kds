// App.tsx — RowRunner KDS: routing shell + toast.
import { StoreProvider, useStore } from './store/store'
import { Icon } from './components/Icon'
import { LoginScreen } from './screens/Login'
import { BoardScreen } from './screens/Board'

function Router() {
  const s = useStore()
  return s.screen === 'board' ? <BoardScreen /> : <LoginScreen />
}

function Toast() {
  const { toastMsg } = useStore()
  if (!toastMsg) return null
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 32,
        zIndex: 80,
        background: 'rgba(7,46,72,.96)',
        color: '#fff',
        borderRadius: 14,
        padding: '15px 22px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 16,
        fontWeight: 700,
        boxShadow: '0 12px 30px rgba(0,0,0,.3)',
        animation: 'rr-rise .25s ease both',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'var(--ice)',
          color: 'var(--navy)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: '0 0 auto',
        }}
      >
        <Icon name="info" size={15} sw={3} />
      </span>
      {toastMsg}
    </div>
  )
}

function Shell() {
  const { screen } = useStore()
  return (
    <div className="kds-app">
      <div key={screen} style={{ height: '100%', animation: 'rr-rise .3s ease both' }}>
        <Router />
      </div>
      <Toast />
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
