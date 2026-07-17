import { type ReactNode } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'

export function AppProviders({ children }: { children: ReactNode }) {
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