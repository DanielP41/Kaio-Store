-- ============================================================
-- KAIO-STORE — Estado de pago (MercadoPago)
-- Pegar este SQL en Supabase → SQL Editor → Run (después de 02_place_order.sql)
-- ============================================================

alter table public.orders
  add column if not exists payment_status text not null default 'pending',
  add column if not exists payment_provider text,
  add column if not exists payment_external_id text,
  add column if not exists payment_preference_id text;

-- Índices para lookup rápido desde webhooks.
create index if not exists orders_payment_external_id_idx
  on public.orders (payment_external_id);
create index if not exists orders_payment_preference_id_idx
  on public.orders (payment_preference_id);

-- Estados válidos: 'pending' | 'approved' | 'rejected' | 'refunded' | 'cancelled' | 'cash_on_delivery'
alter table public.orders
  drop constraint if exists orders_payment_status_valid;
alter table public.orders
  add constraint orders_payment_status_valid
  check (payment_status in ('pending','approved','rejected','refunded','cancelled','cash_on_delivery'));
