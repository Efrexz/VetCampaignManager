import { getJSON, setJSON } from './storage'
import { KEYS } from './keys'
import { APP } from '@/app/env'
import type { AppSettings } from '@/lib/types'

export const DEFAULT_SETTINGS: AppSettings = {
  webhookUrl: '',
  defaultCountryCode: APP.defaultCountryCode,
}

export async function getSettings(): Promise<AppSettings> {
  return getJSON<AppSettings>(KEYS.settings, DEFAULT_SETTINGS)
}

export async function saveSettings(s: AppSettings): Promise<AppSettings> {
  await setJSON(KEYS.settings, s)
  return s
}