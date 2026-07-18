-- RowRunner KDS — kitchen timestamps on the shared `orders` table.
-- Run once in Supabase: Dashboard ▸ SQL Editor ▸ New query ▸ paste ▸ Run.
-- Idempotent and safe to run on top of the existing schema.
--
-- Adds the three timestamps the Kitchen Display System (and the future print
-- worker) own, and exposes them to the table API. It does NOT touch the hidden
-- `code` column — that stays unreadable.

-- 1) Columns ---------------------------------------------------------------
alter table public.orders add column if not exists confirmed_at timestamptz;  -- kitchen accepted the ticket
alter table public.orders add column if not exists ready_at     timestamptz;  -- food is up → runner can claim
alter table public.orders add column if not exists printed_at   timestamptz;  -- reserved for the label print worker

-- 2) Make them readable via the table API ----------------------------------
-- Column-level GRANTs are ADDITIVE: this only adds SELECT on the three new
-- columns to the grant list that already excludes `code`. `code` is never
-- granted here, so it stays hidden and can only be checked by deliver_order().
grant select (confirmed_at, ready_at, printed_at) on public.orders to anon, authenticated;

-- 3) Writes — no new policy needed -----------------------------------------
-- The KDS sets confirmed_at / ready_at BEFORE any runner claims the order
-- (runner_id is still null), so the existing UPDATE policy already permits it:
--
--   create policy "staff claim and deliver" on public.orders
--     for update
--     using       (auth.uid() is not null and (runner_id is null or runner_id = auth.uid()::text))
--     with check  (runner_id is null or runner_id = auth.uid()::text);
--
-- Verify the policy is present and shaped as above:
--   select cmd, qual, with_check from pg_policies
--    where tablename = 'orders' and policyname = 'staff claim and deliver';
--
-- (UPDATE privilege on the new columns is inherited from the table-level grant
--  authenticated already holds — only SELECT was ever column-restricted.)
