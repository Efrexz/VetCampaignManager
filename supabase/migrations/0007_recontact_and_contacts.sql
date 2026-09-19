-- VetCampaignManager — 0007: configurable re-contact window + per-category contact ledger
--
-- Two additive changes (no data is lost, safe to run before deploying):
--
-- 1. branches.recontact_days: clinic-wide re-contact window (days) so each
--    clinic can pick how long to wait before mailing the same service again
--    (default 10; UI clamps 1–90). Previously hardcoded to 7 days.
--
-- 2. contacts.last_contacts: per-category contact ledger
--    ({ " baño": "2026-09-01T...", ... } — normalized category name → ISO
--    timestamp of the last send of that service). The re-contact guard now
--    blocks per category: a "Promociones" message sent 2 days ago no longer
--    blocks a "Baño" reminder today. Legacy rows keep working through
--    `last_contacted_at` fallback (conservative: blocks all categories).

alter table public.branches
  add column if not exists recontact_days int not null default 10;

alter table public.branches
  add constraint branches_recontact_days_range
  check (recontact_days between 1 and 365);

alter table public.contacts
  add column if not exists last_contacts jsonb not null default '{}'::jsonb;
