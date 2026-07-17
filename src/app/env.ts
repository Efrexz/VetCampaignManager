/**
 * App-level configuration defaults.
 * Editable values (webhook URL, default country, column mapping) live in
 * localStorage via the settings store. These are code-level fallbacks.
 */
export const APP = {
  clinicName: 'Clínica Ariels',
  defaultCountryCode: '+51', // Peru
  schema: 'vetcampaign/v1',
  source: 'VetCampaignManager',
} as const

/**
 * Expected Excel sheet/column mapping.
 * VetPraxis column headers may change; keep tolerances permissive: we match
 * by a list of candidate headers so renaming is a one-line config fix.
 */
export const EXCEL_MAP = {
  sheetCandidates: ['Hoja1', 'Sheet1', 'Data', 'Datos'],
  columns: {
    owner: ['Propietario', 'Cliente', 'Dueño', 'Owner', 'Nombre Propietario'],
    pet: ['Mascota', 'Paciente', 'Pet', 'Nombre Mascota'],
    phone: ['Celular', 'Teléfono', 'Telefono', 'Phone', 'Cel', 'Número'],
    category: ['Categoría', 'Categoria', 'Promocion', 'Promoción', 'Promotion'],
  },
} as const