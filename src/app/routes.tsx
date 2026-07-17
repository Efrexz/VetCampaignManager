import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/shared/components/layout/AppShell'
import { Spinner } from '@/shared/components/ui/Spinner'

const HomePage = lazy(() => import('@/features/home/Home'))
const ExcelImportPage = lazy(() =>
  import('@/features/excel-import/ExcelImport').then((m) => ({
    default: m.ExcelImport,
  })),
)
const CampaignPreviewPage = lazy(() =>
  import('@/features/campaign-preview/CampaignPreview').then((m) => ({
    default: m.CampaignPreview,
  })),
)
const SendCampaignPage = lazy(() =>
  import('@/features/send-campaign/SendCampaign').then((m) => ({
    default: m.SendCampaign,
  })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/Settings').then((m) => ({ default: m.Settings })),
)

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="campaign" element={<ExcelImportPage />} />
        <Route path="campaign/preview" element={<CampaignPreviewPage />} />
        <Route path="campaign/send" element={<SendCampaignPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export function AppRouter() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <AppRoutes />
    </Suspense>
  )
}