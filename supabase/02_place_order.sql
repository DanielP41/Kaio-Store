-- ============================================================
-- KAIO-STORE — Validación server-side de pedidos
-- Pegar este SQL en Supabase → SQL Editor → Run (después de 01_stock.sql)
-- ============================================================

-- 1. Tabla de cupones (los movemos del frontend a la BD).
create table if not exists public.coupons (
  code        text primary key,
  discount    numeric(4,3) not null check (discount >= 0 and discount <= 1),
  scope       text not null default 'all',          -- 'all' o un section.id
  active      boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

-- Sembramos los cupones que estaban hardcodeados en cart.js
insert into public.coupons (code, discount, scope) values
  ('KAIO10', 0.10, 'all'),
  ('KAIO15', 0.15, 'all'),
  ('MANGA20', 0.20, 'manga')
on conflict (code) do update
  set discount = excluded.discount,
      scope = excluded.scope,
      active = true;

-- Cualquiera puede LEER cupones activos (para validar en el front si se quiere).
alter table public.coupons enable row level security;
drop policy if exists "coupons_read_active" on public.coupons;
create policy "coupons_read_active" on public.coupons
  for select using (active = true);

-- 2. Reglas de envío como constantes en una vista (single source of truth).
create or replace view public.shipping_rules as
select
  75.00::numeric  as free_shipping_threshold,
  8.99::numeric   as standard_cost,
  14.99::numeric  as express_extra;

-- 3. RPC place_order: valida y crea la orden atómicamente.
-- Recibe del cliente solo lo que NO puede falsificar para su beneficio:
--   - items: [{ id, qty }]  (cantidades; el precio se mira de la BD)
--   - coupon_code: text|null
--   - shipping_method: 'standard' | 'express'
--   - payment_method: 'card' | 'paypal' | 'transfer' | 'cash'
--   - customer_email, customer_name
--   - use_points: bool (si quiere canjear sus puntos disponibles)
-- Devuelve: { ok, order_id?, total?, error? }
create or replace function public.place_order(
  items jsonb,
  coupon_code text default null,
  shipping_method text default 'standard',
  payment_method text default 'card',
  customer_email text default '',
  customer_name text default '',
  use_points boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item jsonb;
  product_row public.products%rowtype;
  coupon_row public.coupons%rowtype;
  rules public.shipping_rules%rowtype;
  subtotal numeric := 0;
  line_total numeric;
  discount numeric := 0;
  points_discount numeric := 0;
  shipping numeric := 0;
  total numeric;
  user_points int := 0;
  order_id uuid;
  missing_stock jsonb := '[]'::jsonb;
  order_lines jsonb := '[]'::jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth_required');
  end if;

  if items is null or jsonb_array_length(items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'empty_cart');
  end if;

  select * into rules from public.shipping_rules limit 1;

  -- Pasada 1: validar productos, calcular subtotal real, validar stock.
  for item in select * from jsonb_array_elements(items)
  loop
    select * into product_row from public.products
      where id = (item->>'id')::text and is_active = true
      for update;

    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_product', 'id', item->>'id');
    end if;

    if (item->>'qty')::int < 1 then
      return jsonb_build_object('ok', false, 'error', 'invalid_qty', 'id', product_row.id);
    end if;

    if product_row.stock < (item->>'qty')::int then
      missing_stock := missing_stock || jsonb_build_object(
        'id', product_row.id,
        'name', product_row.name,
        'requested', (item->>'qty')::int,
        'available', product_row.stock
      );
      continue;
    end if;

    line_total := product_row.price_num * (item->>'qty')::int;
    subtotal := subtotal + line_total;

    order_lines := order_lines || jsonb_build_object(
      'product_id', product_row.id,
      'product_name', product_row.name,
      'qty', (item->>'qty')::int,
      'unit_price', product_row.price_num,
      'line_total', line_total
    );
  end loop;

  if jsonb_array_length(missing_stock) > 0 then
    return jsonb_build_object('ok', false, 'error', 'insufficient_stock', 'missing', missing_stock);
  end if;

  -- Validar y aplicar cupón (server-side, no confiamos en el front).
  if coupon_code is not null and coupon_code <> '' then
    select * into coupon_row from public.coupons
      where code = upper(coupon_code)
        and active = true
        and (expires_at is null or expires_at > now());
    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_coupon');
    end if;
    -- TODO: si scope <> 'all', filtrar el descuento solo a los items de esa sección.
    -- Por ahora aplicamos sobre el subtotal completo (matchea el comportamiento del front).
    discount := round((subtotal * coupon_row.discount)::numeric, 2);
  end if;

  -- Aplicar puntos si el usuario lo pidió. 1 punto = $0.10 de descuento.
  if use_points then
    select coalesce(points, 0) into user_points from public.profiles where id = uid;
    points_discount := least(user_points * 0.10, subtotal - discount);
    if points_discount < 0 then points_discount := 0; end if;
  end if;

  -- Envío: gratis si subtotal >= threshold, sino standard. Express suma extra.
  if subtotal >= rules.free_shipping_threshold then
    shipping := 0;
  else
    shipping := rules.standard_cost;
  end if;
  if shipping_method = 'express' then
    shipping := shipping + rules.express_extra;
  end if;

  total := greatest(0, subtotal + shipping - discount - points_discount);

  -- Decrementar stock atómicamente.
  for item in select * from jsonb_array_elements(items)
  loop
    update public.products
      set stock = stock - (item->>'qty')::int
      where id = (item->>'id')::text;
  end loop;

  -- Crear orden + items.
  insert into public.orders (
    user_id, total, subtotal, shipping, discount,
    coupon, shipping_method, payment_method,
    customer_email, customer_name
  ) values (
    uid, total, subtotal, shipping, discount + points_discount,
    coupon_code, shipping_method, payment_method,
    customer_email, customer_name
  ) returning id into order_id;

  insert into public.order_items (order_id, product_id, product_name, qty, unit_price, line_total)
  select
    order_id,
    (line->>'product_id')::text,
    line->>'product_name',
    (line->>'qty')::int,
    (line->>'unit_price')::numeric,
    (line->>'line_total')::numeric
  from jsonb_array_elements(order_lines) as line;

  -- Ajustar puntos del usuario: descuenta los canjeados, suma 1 pt por dólar pagado.
  update public.profiles
    set points = greatest(0, points
                          - case when use_points then user_points else 0 end
                          + floor(total)::int)
    where id = uid;

  return jsonb_build_object(
    'ok', true,
    'order_id', order_id,
    'subtotal', subtotal,
    'shipping', shipping,
    'discount', discount + points_discount,
    'total', total
  );
end;
$$;

revoke execute on function public.place_order(jsonb, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.place_order(jsonb, text, text, text, text, text, boolean) to authenticated;

-- 4. Bloquear writes directos al monto de las órdenes (antes el cliente podía mandar cualquier total).
-- Si tenés RLS habilitada en orders, agregá una policy que solo permita inserts via la función:
alter table public.orders enable row level security;
drop policy if exists "orders_no_direct_insert" on public.orders;
-- (no policy for insert = nadie puede insertar directamente, solo SECURITY DEFINER)
drop policy if exists "orders_read_own" on public.orders;
create policy "orders_read_own" on public.orders
  for select using (user_id = auth.uid());

alter table public.order_items enable row level security;
drop policy if exists "order_items_read_own" on public.order_items;
create policy "order_items_read_own" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
