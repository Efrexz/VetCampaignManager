import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2, PawPrint, LogIn, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { Button, Card, Input } from '@/shared/components/ui'
import { APP } from '@/app/env'
import { requireSupabase, HAS_SUPABASE } from '@/integrations/supabase'
import { useAuth } from '@/shared/hooks/useAuth'

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

  if (!HAS_SUPABASE) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream">
        <Card className="p-6 max-w-md text-center space-y-3">
          <PawPrint className="mx-auto text-vegetal" size={32} />
          <h2 className="text-md font-semibold text-ink">Todo listo para usar</h2>
          <p className="text-sm text-ink-soft">
            Estás usando la app en modo sencillo: no necesitas cuenta ni
            contraseña. Tus datos quedan guardados en esta computadora.
          </p>
        </Card>
      </div>
    )
  }

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
    <div className="flex h-screen items-center justify-center bg-cream p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="flex items-center gap-2">
          <span className="rounded-sm bg-vegetal-soft text-vegetal p-2">
            <PawPrint size={20} />
          </span>
          <div>
            <h1 className="text-md font-semibold text-ink">{APP.productName}</h1>
            <p className="text-2xs text-ink-mute">Accede a tu cuenta</p>
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
    </div>
  )
}