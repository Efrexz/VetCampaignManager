-- Template media: optional inline image (data URI) stored once per template.
-- Sends never duplicate it: the campaign payload is stripped before recording
-- (see `stripPayloadMedia` in src/storage/campaigns.ts). Row-level policies on
-- message_templates already cover this column — no new policies needed.
alter table public.message_templates
  add column if not exists media jsonb null;
