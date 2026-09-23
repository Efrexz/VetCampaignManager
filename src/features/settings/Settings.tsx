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

const TAB_COPY: Record<TabId, { title: string; sub: string }> = {
  categories: {
    title: 'Categorías',
    sub: 'Organizan las plantillas y se asignan al importar el Excel.',
  },
  templates: {
    title: 'Plantillas',
    sub: 'El mensaje que recibe cada cliente, por servicio.',
  },
  exclusions: {
    title: 'Clientes excluidos',
    sub: 'Contactos a los que la clínica no debe escribir nunca.',
  },
  webhook: {
    title: 'Conexión',
    sub: 'El canal por el que salen los envíos a WhatsApp.',
  },
}

export function Settings() {
  const [tab, setTab] = useState<TabId>('categories')

  return (
    <div className="p-6 max-w-5xl mx-auto animate-rise">
      <div className="mb-5">
        <p className="text-2xs uppercase tracking-wide text-ink-mute">Ajustes</p>
        <h2 className="text-xl font-semibold text-ink tracking-tight mt-0.5">
          {TAB_COPY[tab].title}
        </h2>
        <p className="text-sm text-ink-soft mt-1">{TAB_COPY[tab].sub}</p>
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