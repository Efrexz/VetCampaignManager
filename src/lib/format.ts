export function maskUrl(url: string): string {
  return url.replace(
    /^(https?:\/\/)([^/]+)(.*)$/,
    (_, proto: string, host: string) => `${proto}${host.slice(0, 4)}•••••`,
  )
}

/**
 * Human-friendly relative time in Spanish, e.g. "Hace 2 horas", "Ayer",
 * "hace 5 min". Falls back to a short date for anything older than a week.
 */
export function relativeTimeEs(iso: string, now = new Date()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diffMin = Math.round((now.getTime() - t) / 60000)
  if (diffMin < 1) return 'Ahora mismo'
  if (diffMin < 60) {
    return `Hace ${diffMin} min`
  }
  const min = diffMin % 60
  const h = Math.floor(diffMin / 60)
  if (h < 24) {
    return min > 0 ? `Hace ${h} h ${min} min` : `Hace ${h} h`
  }
  const d = Math.floor(h / 24)
  if (d === 1 && h - 24 < 12) return 'Ayer'
  if (d < 7) return `Hace ${d} días`
  return new Date(t).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
  }).replace('.', '')
}
