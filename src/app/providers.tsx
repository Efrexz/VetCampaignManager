import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useHydrateSettings } from '@/shared/hooks/useHydrateSettings'
import { Spinner } from '@/shared/components/ui'

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrated = useHydrateSettings()

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    )
  }

  return (
    <BrowserRouter>
      {children}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            border: '1px solid var(--color-mist)',
            background: 'var(--color-paper)',
            color: 'var(--color-ink)',
          },
        }}
      />
    </BrowserRouter>
  )
}