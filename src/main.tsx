import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import { AppProviders } from './app/providers'
import { AppRouter } from './app/routes'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)