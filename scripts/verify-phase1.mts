// Temporary ad-hoc verification of Phase 1 logic against the real VetPraxis
// Excel file AND a synthetic workbook with edge cases.
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as XLSX from 'xlsx'
import { parseWorkbook } from '../src/lib/excel'
import { validateRecipients } from '../src/lib/recipients'
import { normalizePhone } from '../src/lib/phone'

async function fromBuffer(name: string, buffer: Buffer) {
  return new File([new Uint8Array(buffer)], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function assert(label: string, ok: boolean, extra?: unknown) {
  if (ok) {
    console.log(`  ✓ ${label}`)
  } else {
    console.error(`  ✗ ${label}`, extra ?? '')
    process.exitCode = 1
  }
}

async function testRealFile() {
  console.log('\n— Real VetPraxis file —')
  const p =
    'samples/Reporte de Eventos - Pendiente - 18.07.2026 al 18.07.2026.xlsx'
  const buf = fs.readFileSync(p)
  const file = await fromBuffer('reporte.xlsx', buf)
  const parsed = await parseWorkbook(file)
  assert('sheet selected', parsed.sheetName === 'Worksheet', parsed.sheetName)
  assert('no structural errors', parsed.errors.length === 0, parsed.errors)
  assert('2 rows parsed', parsed.rows.length === 2, parsed.rows.length)

  const result = validateRecipients({ rows: parsed.rows })
  console.log('  totals:', JSON.stringify(result.totals))
  assert('totalRows=2', result.totals.totalRows === 2)
  assert('valid=2', result.totals.valid === 2)
  assert('invalid=0', result.totals.invalid === 0)
  assert('duplicate=0', result.totals.duplicate === 0)

  const r1 = result.recipients[0]
  assert('row1 owner', r1.owner === 'KANNET ANGEL QUIJAITE ALAN', r1.owner)
  assert('row1 pet # stripped', r1.pet === 'MAXI', r1.pet)
  assert('row1 phone normalized', r1.normalizedPhone === '+51983211121', r1.normalizedPhone)
  assert('row1 category', r1.category === 'Vacuna', r1.category)

  const r2 = result.recipients[1]
  assert('row2 pet # stripped', r2.pet === 'DOKY', r2.pet)
  // Row 2 raw: "+51 - 985963259(DUEÑA) - 977324052" → first valid mobile = 985963259
  assert('row2 phone = first valid mobile (DUEÑA tag)', r2.normalizedPhone === '+51985963259', r2.normalizedPhone)
  assert('row2 category', r2.category === 'Antipulgas', r2.category)

  console.log('  detectedCategories:', JSON.stringify(result.detectedCategories))
  assert('2 categories detected', result.detectedCategories.length === 2)
}

async function testSynthetic() {
  console.log('\n— Synthetic edge-case workbook —')
  // Build an in-memory xlsx with the real headers and edge cases.
  const wb = XLSX.utils.book_new()

  // Case A: happy row
  // Case B: fixed line first (8 digits, invalid), then mobile → should pick mobile
  // Case C: phone empty → invalid
  // Case D: duplicate of A
  // Case E: only fixed line (8 digits, no 9-prefix) → invalid
  // Case F: pet with no '#' — stays as is
  // Case G: pet '#' glued right after name 'DOKY#'
  // Case H: owner empty but pet+phone present → still a row (phone required, owner not enforced here)
  // Case I: multi-annotation "(FIJO)"
  // Case J: category blank → "Sin categoría"
  const rows = [
    ['CLIENTE', 'MASCOTA', 'TELÉFONOS', 'MOTIVO', 'TIPO DE EVENTO', 'ESTADO'],
    ['CLIENTE A', 'PET A', '+51 - 987654321', 'mot1', 'Vacuna', 'PENDIENTE'],
    ['CLIENTE B', 'PET B #', '+51 - 44567890 - 912345678', 'mot2', 'Antipulgas', 'PENDIENTE'],
    ['CLIENTE C', 'PET C', '', 'mot3', 'Vacuna', 'PENDIENTE'],
    ['CLIENTE D', 'PET D', '+51 - 987654321', 'mot4', 'Vacuna', 'PENDIENTE'],
    ['CLIENTE E', 'PET E', '+51 - 44567890', 'mot5', 'Antipulgas', 'PENDIENTE'],
    ['CLIENTE F', 'PET F', '987123456', 'mot6', 'Hidratación', 'PENDIENTE'],
    ['CLIENTE G', 'DOKY#', '+51 - 955111222(DUEÑA)', 'mot7', 'Vacuna', 'PENDIENTE'],
    ['', 'LONELY PET', '+51 - 988777665', 'mot8', 'Antipulgas', 'PENDIENTE'],
    ['CLIENTE I', 'PET I', '+51 - 448877665(FIJO) - 990011223', 'mot9', 'Vacuna', 'PENDIENTE'],
    ['CLIENTE J', 'PET J', '+51 - 900111222', '', '', 'PENDIENTE'],
    // row that's entirely empty — should be skipped
    ['', '', '', '', '', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Worksheet')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  const file = await fromBuffer('synthetic.xlsx', Buffer.from(buffer))

  const parsed = await parseWorkbook(file)
  assert('synthetic sheet detected', parsed.sheetName === 'Worksheet')
  assert('synthetic no errors', parsed.errors.length === 0, parsed.errors)
  assert('10 data rows (1 empty skipped)', parsed.rows.length === 10, parsed.rows.length)

  const result = validateRecipients({ rows: parsed.rows })
  console.log('  totals:', JSON.stringify(result.totals))
  console.log('  detectedCategories:', JSON.stringify(result.detectedCategories))

  const byOwner = new Map(result.recipients.map((r) => [r.owner, r]))

  // Case A: valid
  const a = byOwner.get('CLIENTE A')!
  assert('A valid', a.phoneStatus === 'valid', a.phoneStatus)
  assert('A normalized', a.normalizedPhone === '+51987654321', a.normalizedPhone)

  // Case B: fixed first (8 digits, no 9-prefix) → skip → pick mobile 912345678
  const b = byOwner.get('CLIENTE B')!
  assert('B first-valid algorithm picks mobile after fixed', b.normalizedPhone === '+51912345678', b.normalizedPhone)
  assert('B valid', b.phoneStatus === 'valid')
  assert('B pet # stripped', b.pet === 'PET B', b.pet)

  // Case C: invalid empty phone
  const c = byOwner.get('CLIENTE C')!
  assert('C invalid empty', c.phoneStatus === 'invalid' && c.normalizedPhone === undefined)

  // Case D: duplicate of A → duplicate status
  const d = byOwner.get('CLIENTE D')!
  assert('D duplicate', d.phoneStatus === 'duplicate', d.phoneStatus)

  // Case E: only an 8-digit fixed line → invalid
  const e = byOwner.get('CLIENTE E')!
  assert('E fixed-line-only invalid', e.phoneStatus === 'invalid', e.phoneStatus)

  // Case F: bare 9-digit mobile without +51 prefix → valid, prefixed
  const f = byOwner.get('CLIENTE F')!
  assert('F bare mobile normalized', f.normalizedPhone === '+51987123456', f.normalizedPhone)

  // Case G: DUEÑA tag stripped, valid
  const g = byOwner.get('CLIENTE G')!
  assert('G DUEÑA tag stripped valid', g.normalizedPhone === '+51955111222', g.normalizedPhone)
  assert('G pet # glued stripped', g.pet === 'DOKY', g.pet)

  // Case H: owner empty but phone valid → still a row, valid
  const h = byOwner.get('')! // empty owner
  assert('H owner-empty row kept', !!h, '(expected a row with empty owner)')
  assert('H phone valid', h.normalizedPhone === '+51988777665')

  // Case I: first is fixed "(FIJO)" tagged → skip → pick mobile 990011223
  const i = byOwner.get('CLIENTE I')!
  assert('I (FIJO) skipped for mobile', i.normalizedPhone === '+51990011223', i.normalizedPhone)

  // Case J: category blank → "Sin categoría"
  const j = byOwner.get('CLIENTE J')!
  assert('J blank category → "Sin categoría"', j.category === 'Sin categoría', j.category)

  // Totals count
  const t = result.totals
  // Valid: A, B, F, G, H, I, J (=7).  Invalid: C, E (=2).  Duplicate: D (=1).
  assert('totals valid=7 (A,B,F,G,H,I,J)', t.valid === 7, t)
  assert('totals invalid=2 (C,E)', t.invalid === 2, t)
  assert('totals duplicate=1 (D)', t.duplicate === 1, t)
  // Confirm J really is a fresh valid mobile (not duplicate of A).
  const j2 = byOwner.get('CLIENTE J')!
  assert('J is an independent valid mobile', j2.phoneStatus === 'valid' && j2.normalizedPhone === '+51900111222', j2)
  assert('J category fallback "Sin categoría"', j2.category === 'Sin categoría')
}

async function testPhoneUnits() {
  console.log('\n— normalizePhone unit checks —')
  const cases: Array<[string, { normalized: string; valid: boolean }]> = [
    ['+51 - 983211121', { normalized: '+51983211121', valid: true }],
    ['+51 - 985963259(DUEÑA) - 977324052', { normalized: '+51985963259', valid: true }],
    ['987123456', { normalized: '+51987123456', valid: true }],
    ['+51 - 44567890', { normalized: '', valid: false }],
    ['', { normalized: '', valid: false }],
    ['   +51 - 955111222   ', { normalized: '+51955111222', valid: true }],
    ['+51 - 448877665(FIJO) - 990011223', { normalized: '+51990011223', valid: true }],
  ]
  for (const [raw, expected] of cases) {
    const got = normalizePhone(raw)
    assert(`normalizePhone(${JSON.stringify(raw)})`, got.normalized === expected.normalized && got.valid === expected.valid, got)
  }
}

async function main() {
  await testPhoneUnits()
  await testRealFile()
  await testSynthetic()
  console.log('\nDONE')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})