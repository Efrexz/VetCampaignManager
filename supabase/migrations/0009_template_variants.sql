-- VetCampaignManager — 0009: message template variants (anti-duplicate text)
--
-- Adds optional alternative bodies per template. When a template carries
-- variants, the rendered message for each phone is picked DETERMINISTICALLY
-- by the phone's digits (same phone always sees the same variant; a campaign
-- spreads evenly across variants). Varying message text defeats the
-- "identical bulk" pattern that gets numbers banned.
--
-- Null / empty array = no variants in play (legacy templates untouched).

alter table public.message_templates
  add column if not exists variants jsonb not null default '[]'::jsonb;
