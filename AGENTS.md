# VetCampaignManager — Agent Notes

## Project
Internal tool for veterinary clinic receptionists. Imports an Excel report
exported from VetPraxis, previews recipients + WhatsApp messages, and dispatches
the campaign to an n8n webhook (which sends via Evolution API).

## Tech stack
- Vite + React 18 + TypeScript (strict)
- Tailwind CSS v4 (CSS-first config via `@theme` in `src/styles/tailwind.css`)
- react-router-dom, zustand, TanStack Table, sonner, lucide-react
- xlsx (SheetJS — installed from official CDN, NOT npm, due to npm vuln)
- react-dropzone, clsx + tailwind-merge, nanoid

## Lint / typecheck / build
Run these after every change. They must stay green:
```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run build       # full production build
npm run dev         # local dev server on http://localhost:5173
```

## Architecture conventions (read before editing)
- **UI is in Spanish.** Code, identifiers, file names, and comments in English.
- **Readability over architecture.** No enterprise patterns (DI, repository
  interfaces with multiple impls, use-case classes) unless there's a clear
  long-term benefit. Pure helper functions + zustand stores is the ceiling.
- **`lib/` is pure.** No React, no storage, no network. Excel parse, phone
  normalize, template render, payload builder — all pure & testable.
- **`storage/` is the persistence seam.** Files export async functions
  (`listCategories`, `saveCategory`, …). To migrate to Supabase later, write
  `storage/supabase/*` with the same signatures and swap imports — feature
  code unchanged.
- **Components: single responsibility.** Don't grow a file past one job.
- **No comments unless requested.**
- **IDs**: nanoids everywhere (Supabase-row-compatible), never array indices.
- **Durable data** (categories, templates, settings) → localStorage via
  versioned envelopes in `storage/`. **Session data** (current campaign) is
  in-memory in `campaignStore` only — never persisted.
- **n8n send**: `lib/campaign.ts` builds the payload (pure); `integrations/n8n.ts`
  does the single `POST`. Mock mode when webhook URL unset is built into Phase 4.

## Design tokens (do not deviate without reason)
Defined in `src/styles/tailwind.css` `@theme`. Short version:
- `cream` surfaces, `paper` cards, `ink` text (warm near-black, not pure zinc)
- `vegetal` (deep teal/pine) = primary UI
- `clay` (terracotta) = **action accent only** — reserved for the Send / CTA
- `mist` hairlines/borders
- Single UI grotesk (Inter Tight) + JetBrains Mono for phones/counts
- Radius 10px cards, 8px inputs/chips, single subtle shadow

## Library policy
Do not add a dependency without stating the concrete problem it solves. The
proposed list in the planning doc is the agreed ceiling for the MVP.

## Folder map (quick ref)
```
src/
  app/         env, providers, routes
  lib/         pure helpers (excel, phone, template, campaign, id, cn)
  storage/     localStorage-backed async functions + keyed JSON envelopes
  integrations/n8n.ts   webhook client (Phase 4)
  features/    one folder per feature (home, excel-import, campaign-preview,
               send-campaign, settings) — each lazy-loaded
  shared/      ui/ primitives, layout/ (AppShell, Sidebar, TopBar), hooks/
  styles/      tailwind.css (tokens), tokens.css (legacy empty — remove if unused)
```

## Phase status
- [x] Phase 0 — Foundations (scaffold, tokens, UI kit, shell, placeholder pages)
- [x] Phase 1 — Excel Import (parse → validate → summary screen)
- [x] Phase 2 — Settings: Categories & Templates (+ seed defaults, webhook tab)
- [x] Phase 3 — Campaign Preview & Message Preview
- [x] Phase 4 — Send Campaign & n8n (payload, mock client, dispatch UI)
- [ ] Phase 5 — Polish (empty/error states, keyboard, focus, reduced-motion, mobile)

## VetPraxis Excel format (real, observed)
- Sheet name: `Worksheet` (single)
- Columns: `CLIENTE | MASCOTA | TELÉFONOS | MOTIVO | TIPO DE EVENTO | ESTADO`
- MVP uses:   CLIENTE→owner, MASCOTA→pet (strip trailing `#`), TELÉFONOS→phone, TIPO DE EVENTO→category
- Ignored in MVP: MOTIVO (sub-reason), ESTADO (always PENDIENTE)
- TELÉFONOS can contain several numbers separated by ` - ` with optional
  annotations like `(DUEÑA)` or `(FIJO)`. Algorithm: pick the FIRST valid
  Peru mobile (9 digits, starts with 9), prefix `+51`. Fixed lines (8 digits)
  and other formats are skipped. The `(DUEÑA)` tag is NOT preferred.

## Verification script (optional, dev-only)
`scripts/verify-phase1.mts` runs ad-hoc assertions against the real sample
Excel and a synthetic edge-case workbook. Run via esbuild:
```bash
node_modules/.bin/esbuild scripts/verify-phase1.mts --bundle --platform=node \
  --format=esm --outfile=node_modules/.cache/verify-phase1.mjs \
  && node node_modules/.cache/verify-phase1.mjs
```
`samples/` holds real `.xlsx` files and is gitignored (may contain PII).