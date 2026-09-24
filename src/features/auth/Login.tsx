/**
 * Login for Supabase (SaaS) mode. Split screen ≥ md: left brand panel in
 * pine (same tokens as the sidebar) with paw pattern + the 3-step story;
 * right: the password form. Local mode shows a relaxed version of the same
 * split so a Simple-mode user never sees a bare form.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, PawPrint, LogIn, UserCog, FileDown, CheckCheck, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Input } from '@/shared/components/ui'
import { APP } from '@/app/env'
import { requireSupabase, HAS_SUPABASE } from '@/integrations/supabase'
import { useAuth } from '@/shared/hooks/useAuth'

const STORY = [
  { icon: FileDown, text: 'Importa el reporte pendiente de VetPraxis' },
  { icon: CheckCheck, text: 'Revisa a quién le escribirás — nada sale sin control' },
  { icon: Send, text: 'Envía recordatorios por WhatsApp en minutos' },
] as const

const PAW_POSITIONS = [
  { top: '12%', right: '8%', size: 16, rot: 25 },
  { top: '28%', right: '22%', size: 11, rot: -20 },
  { top: '55%', right: '10%', size: 18, rot: 60 },
  { top: '78%', right: '26%', size: 12, rot: -35 },
  { top: '68%', right: '78%', size: 14, rot: 15 },
  { top: '20%', right: '70%', size: 9, rot: 80 },
] as const

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // Password-only login on purpose: every account is provisioned by the
  // clinic owner in the Supabase dashboard WITH a password, so magic links
  // would be a confusing second path (self-signup was removed for the same
  // reason — a self-created user has no tenant/branch membership).
  const [busy, setBusy] = useState(false)
  const auth = useAuth()

  // Safety net for a state-propagation race: signInWithPassword may resolve
  // before the SIGNED_IN event reaches useAuth, so RequireAuth can bounce the
  // navigation back to /login. When the session lands (this effect), bring
  // the user in. Also covers sessions persisted from a previous visit.
  useEffect(() => {
    if (!HAS_SUPABASE || !auth.authenticated) {
      return
    }
    const from = (location.state as { from?: string } | null)?.from ?? '/'
    navigate(from, { replace: true })
  }, [auth.authenticated, navigate, location.state])

  const handleEmailPassword = async () => {
    setBusy(true)
    try {
      const sb = requireSupabase()
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error) throw error
      const from = (location.state as { from?: string } | null)?.from ?? '/'
      navigate(from, { replace: true })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-screen bg-cream p-4 md:p-0">
      {/* Brand panel (≥ md) */}
      <div className="hidden md:flex relative w-[42%] shrink-0 bg-pine flex-col justify-between p-10 overflow-hidden">
        {PAW_POSITIONS.map((p, i) => (
          <svg
            key={i}
            viewBox="0 0 24 24"
            fill="currentColor"
            className="absolute text-paper/5"
            style={{ top: p.top, right: p.right, width: p.size, height: p.size, transform: `rotate(${p.rot}deg)` }}
            aria-hidden="true"
          >
            <ellipse cx="12" cy="15.5" rx="5" ry="4" />
            <circle cx="7" cy="9" r="2.4" />
            <circle cx="12" cy="7" r="2.4" />
            <circle cx="17" cy="9" r="2.4" />
          </svg>
        ))}

        <div className="flex items-center gap-2.5">
          <span className="rounded-md bg-paper/15 text-paper p-2">
            <PawPrint size={22} />
          </span>
          <div className="leading-tight">
            <p className="text-base font-semibold text-paper">{APP.productName}</p>
            <p className="text-2xs text-paper/50">Recordatorios que llegan a tiempo</p>
          </div>
        </div>

        <div className="space-y-5">
          <p className="text-sm text-paper/70 leading-relaxed max-w-xs">
            La herramienta de la clínica para escribirle a los clientes
            pendientes por WhatsApp — ordenada, revisada y sin repeticiones.
          </p>
          <div className="space-y-3">
            {STORY.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5 text-sm text-paper/70">
                <span className="rounded-sm bg-paper/10 text-paper/80 p-1 shrink-0">
                  <Icon size={14} />
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>

        <p className="text-2xs text-paper/40">
          {APP.productName} · {APP.clinicName}
        </p>
      </div>

      {/* Form side */}
      <div className="flex-1 flex items-center justify-center p-4">
        {HAS_SUPABASE ? (
          <Card className="w-full max-w-md p-6 space-y-5">
            <div className="flex items-center gap-2">
              <span className="rounded-sm bg-vegetal-soft text-vegetal p-2">
                <PawPrint size={20} />
              </span>
              <div>
                <h1 className="text-md font-semibold text-ink">Accede a tu cuenta</h1>
                <p className="text-2xs text-ink-mute">Clínica · Campañas WhatsApp</p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm text-ink-soft">Correo</span>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@correo.com"
                  className="mt-1"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="text-sm text-ink-soft">Contraseña</span>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1"
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && email && password && !busy) {
                      void handleEmailPassword()
                    }
                  }}
                />
              </label>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleEmailPassword}
              disabled={busy || !email || !password}
              className="w-full"
            >
              {busy ? <Loader2 className="animate-spin" size={14} /> : <LogIn size={14} />}
              Iniciar sesión
            </Button>

            <p className="text-2xs text-ink-mute flex items-center gap-1.5 border-t border-mist pt-3">
              <UserCog size={12} className="shrink-0" />
              Las cuentas las crea el administrador de tu clínica. Si no tienes
              acceso, pídeselo a tu encargado.
            </p>
          </Card>
        ) : (
          <Card className="w-full max-w-md p-6 text-center space-y-3">
            <span className="rounded-md bg-vegetal-soft text-vegetal p-3 w-fit mx-auto block">
              <PawPrint size={26} />
            </span>
            <h2 className="text-md font-semibold text-ink">Todo listo para usar</h2>
            <p className="text-sm text-ink-soft leading-relaxed">
              Estás usando la app en modo sencillo: no necesitas cuenta ni
              contraseña. Tus datos quedan guardados en esta computadora y las
              campañas van directo al WhatsApp de la clínica.
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
