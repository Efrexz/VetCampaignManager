import { NavLink } from 'react-router-dom'
import {
  Home,
  Send,
  Settings,
  PawPrint,
  History,
  LogOut,
  Loader2,
} from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/cn'
import { APP } from '@/app/env'
import { HAS_SUPABASE } from '@/integrations/supabase'
import { useAuth } from '@/shared/hooks/useAuth'

const baseNav = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/campaign', label: 'Campaña', icon: Send, end: false },
  { to: '/settings', label: 'Ajustes', icon: Settings, end: false },
] as const

const nav = HAS_SUPABASE
  ? [...baseNav, { to: '/history', label: 'Historial', icon: History, end: false }]
  : baseNav

export function Sidebar() {
  return (
    <aside className="w-sidebar shrink-0 border-r border-mist bg-paper flex flex-col">
      <div className="h-topbar flex items-center gap-2 px-4 border-b border-mist">
        <span className="rounded-sm bg-vegetal-soft text-vegetal p-1.5">
          <PawPrint size={18} />
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-ink">{APP.clinicName}</p>
          <p className="text-2xs text-ink-mute">Campañas WhatsApp</p>
        </div>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-3 h-9 rounded-sm text-sm transition-colors',
                isActive
                  ? 'bg-mist-soft text-ink font-medium'
                  : 'text-ink-soft hover:bg-mist-soft/60 hover:text-ink',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-3 border-t border-mist space-y-2">
        <p className="text-2xs text-ink-mute leading-tight">
          {HAS_SUPABASE
            ? 'Conectado a la cuenta de la clínica'
            : 'Tus datos quedan guardados en esta computadora'}
        </p>
        <SignOutButton />
      </div>
    </aside>
  )
}

function SignOutButton() {
  const auth = useAuth()
  const [busy, setBusy] = useState(false)
  if (!HAS_SUPABASE) return null

  const handleSignOut = async () => {
    if (busy) return
    setBusy(true)
    await auth.signOut()
    setBusy(false)
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={busy}
      title={auth.userLabel || 'Cerrar sesión'}
      className={cn(
        'flex items-center gap-2.5 w-full px-3 h-9 rounded-sm text-sm transition-colors',
        'text-ink-soft hover:bg-danger-soft/40 hover:text-danger',
        busy && 'opacity-60',
      )}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : <LogOut size={16} />}
      Cerrar sesión
    </button>
  )
}