-- ============================================================
-- KAIO-STORE — Aplicar cupones por scope (sección)
-- Pegar este SQL en Supabase → SQL Editor → Run
-- ============================================================
--
-- Antes: el cupón MANGA20 (scope='manga') aplicaba 20% sobre el subtotal completo.
-- Ahora: si el cupón tiene scope distinto de 'all', solo descuenta sobre los items
-- cuyos productos tienen products.section = scope.
--
-- Reemplaza la función place_order que estaba en 02_place_order.sql.

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
  scoped_subtotal numeric := 0;     -- suma solo de items que matchean el scope del cupón
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

  -- Resolvemos el cupón antes (necesitamos el scope para acumular scoped_subtotal en la pasada 1).
  if coupon_code is not null and coupon_code <> '' then
    select * into coupon_row from public.coupons
      where code = upper(coupon_code)
        and active = true
        and (expires_at is null or expires_at > now());
    if not found then
      return jsonb_build_object('ok', false, 'error', 'invalid_coupon');
    end if;
  end if;

  -- Pasada 1: validar productos, calcular subtotal real (y scoped_subtotal), validar stock.
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

    -- Acumular en scoped_subtotal si el cupón aplica a este producto.
    if coupon_row.code is not null then
      if coupon_row.scope = 'all' or coupon_row.scope = product_row.section then
        scoped_subtotal := scoped_subtotal + line_total;
      end if;
    end if;

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

  -- Aplicar descuento del cupón sobre el scoped_subtotal (no el total).
  if coupon_row.code is not null then
    if scoped_subtotal <= 0 then
      -- El cupón es válido pero no aplica a ningún ítem del carrito.
      return jsonb_build_object('ok', false, 'error', 'coupon_not_applicable', 'scope', coupon_row.scope);
    end if;
    discount := round((scoped_subtotal * coupon_row.discount)::numeric, 2);
  end if;

  -- Aplicar puntos. 1 punto = $0.10 de descuento.
  if use_points then
    select coalesce(points, 0) into user_points from public.profiles where id = uid;
    points_discount := least(user_points * 0.10, subtotal - discount);
    if points_discount < 0 then points_discount := 0; end if;
  end if;

  -- Envío.
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
