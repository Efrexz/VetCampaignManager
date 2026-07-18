import { namespaced } from './storage'

export const KEYS = {
  categories: namespaced('categories:v1'),
  templates: namespaced('templates:v1'),
  settings: namespaced('settings:v1'),
} as const