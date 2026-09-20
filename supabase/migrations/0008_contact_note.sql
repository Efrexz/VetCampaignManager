-- VetCampaignManager — 0008: exclusion-list note
--
-- Adds a free-text note to the branch-scoped contact ledger so the UI can
-- show WHY a client is excluded ("algo pasó", "pide que no le escribamos").
-- Purely additive; the do_not_contact column (0005) was already honored by
-- the send guard — this only powers the new "Clientes excluidos" tab.

alter table public.contacts
  add column if not exists note text null;
