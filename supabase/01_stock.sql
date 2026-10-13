-- ============================================================
-- KAIO-STORE — Control de stock
-- Pegar este SQL en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Agregar columna stock (default razonable para no romper productos existentes)
alter table public.products
  add column if not exists stock integer not null default 100;

-- 2. Constraint: stock no puede ser negativo
alter table public.products
  drop constraint if exists products_stock_non_negative;
alter table public.products
  add constraint products_stock_non_negative check (stock >= 0);

-- 3. RPC: decrementar stock atómicamente (una transacción por orden)
-- Devuelve { ok: bool, missing: jsonb } — si falla, "missing" lista los productos sin stock suficiente.
create or replace function public.decrement_stock(items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  product_row public.products%rowtype;
  missing jsonb := '[]'::jsonb;
begin
  -- Validamos que haya stock suficiente para TODOS antes de tocar nada.
  for item in select * from jsonb_array_elements(items)
  loop
    select * into product_row from public.products
      where id = (item->>'id')::text
      for update;

    if not found then
      missing := missing || jsonb_build_object(
        'id', item->>'id',
        'reason', 'not_found'
      );
      continue;
    end if;

    if product_row.stock < (item->>'qty')::int then
      missing := missing || jsonb_build_object(
        'id', product_row.id,
        'name', product_row.name,
        'requested', (item->>'qty')::int,
        'available', product_row.stock,
        'reason', 'insufficient'
      );
    end if;
  end loop;

  if jsonb_array_length(missing) > 0 then
    return jsonb_build_object('ok', false, 'missing', missing);
  end if;

  -- Todo OK: descontamos stock.
  for item in select * from jsonb_array_elements(items)
  loop
    update public.products
      set stock = stock - (item->>'qty')::int
      where id = (item->>'id')::text;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

-- 4. Permitir invocar la RPC desde clientes autenticados (sólo logueados).
revoke execute on function public.decrement_stock(jsonb) from public, anon;
grant execute on function public.decrement_stock(jsonb) to authenticated;
