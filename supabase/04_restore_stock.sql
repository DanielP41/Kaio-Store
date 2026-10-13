-- ============================================================
-- KAIO-STORE — Reversión de stock para órdenes rechazadas/canceladas
-- Pegar este SQL en Supabase → SQL Editor → Run
-- ============================================================

-- Devuelve el stock al inventario para una orden cuyo pago no se completó.
-- Idempotente: si ya se restauró, no hace nada (controlado por columna restocked).
alter table public.orders
  add column if not exists restocked boolean not null default false;

create or replace function public.restore_stock(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  restored int := 0;
begin
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  -- Idempotencia: si ya se restauró, salimos.
  if order_row.restocked then
    return jsonb_build_object('ok', true, 'already_restored', true);
  end if;

  -- Solo restauramos si el pago no terminó en aprobado.
  if order_row.payment_status not in ('rejected', 'cancelled', 'refunded') then
    return jsonb_build_object('ok', false, 'error', 'order_not_eligible',
                              'status', order_row.payment_status);
  end if;

  for item_row in
    select * from public.order_items where order_id = p_order_id
  loop
    update public.products
      set stock = stock + item_row.qty
      where id = item_row.product_id;
    restored := restored + 1;
  end loop;

  update public.orders set restocked = true where id = p_order_id;

  return jsonb_build_object('ok', true, 'lines_restored', restored);
end;
$$;

-- Solo invocable desde el server (service_role la usa el webhook).
revoke execute on function public.restore_stock(uuid) from public, anon, authenticated;
