import { useState } from 'react'
import { Tags, MessageSquare, Webhook, Ban } from 'lucide-react'
import { Tabs } from '@/shared/components/ui'
import { CategoriesTab } from './CategoriesTab'
import { TemplatesTab } from './TemplatesTab'
import { WebhookTab } from './WebhookTab'
import { ExclusionsTab } from './ExclusionsTab'

type TabId = 'categories' | 'templates' | 'exclusions' | 'webhook'

const tabs = [
  { id: 'categories', label: 'Categorías', icon: <Tags size={14} /> },
  { id: 'templates', label: 'Plantillas', icon: <MessageSquare size={14} /> },
  { id: 'exclusions', label: 'Clientes excluidos', icon: <Ban size={14} /> },
  { id: 'webhook', label: 'Conexión', icon: <Webhook size={14} /> },
]

export function Settings() {
  const [tab, setTab] = useState<TabId>('categories')

  return (
    <div className="p-6 max-w-5xl mx-auto animate-rise">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">Ajustes</h2>
        <p className="text-sm text-ink-soft mt-1">
          Organiza tus categorías, mensajes y la conexión con WhatsApp.
        </p>
      </div>

      <Tabs
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        className="mb-5"
      />

      {tab === 'categories' && <CategoriesTab />}
      {tab === 'templates' && <TemplatesTab />}
      {tab === 'exclusions' && <ExclusionsTab />}
      {tab === 'webhook' && <WebhookTab />}
    </div>
  )
}