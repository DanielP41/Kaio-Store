// supabase/functions/create-mp-preference/index.ts
// Crea una preferencia de MercadoPago para una orden ya validada server-side.
//
// Deploy:
//   supabase functions deploy create-mp-preference --no-verify-jwt=false
//
// Variables de entorno requeridas (Supabase → Functions → Secrets):
//   MP_ACCESS_TOKEN          → Access token de Mercado Pago (Producción o Sandbox)
//   PUBLIC_SITE_URL          → URL pública del sitio (ej: https://kaio.example.com)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

interface CartItem { id: string; qty: number; }
interface PlaceOrderBody {
  items: CartItem[];
  couponCode?: string | null;
  shippingMethod?: 'standard' | 'express';
  customerEmail?: string;
  customerName?: string;
  usePoints?: boolean;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? '';
  if (!accessToken) return json({ error: 'mp_not_configured' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'auth_required' }, 401);

  // Cliente con el JWT del usuario para que `auth.uid()` funcione en place_order.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  let body: PlaceOrderBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  // 1. Validar y persistir la orden con la RPC (también descuenta stock).
  const { data: orderResult, error: orderError } = await supabase.rpc('place_order', {
    items: body.items,
    coupon_code: body.couponCode ?? null,
    shipping_method: body.shippingMethod ?? 'standard',
    payment_method: 'mercadopago',
    customer_email: body.customerEmail ?? '',
    customer_name: body.customerName ?? '',
    use_points: !!body.usePoints
  });

  if (orderError) return json({ ok: false, error: orderError.message }, 400);
  if (!orderResult?.ok) return json({ ok: false, ...orderResult }, 400);

  const orderId = orderResult.order_id as string;
  const total = Number(orderResult.total);

  // 2. Crear preferencia en MercadoPago.
  // Usamos un solo "item" agregado por simplicidad — MP lo soporta.
  const preferenceBody = {
    items: [{
      id: orderId,
      title: `Pedido KAIO-STORE #${String(orderId).slice(0, 8).toUpperCase()}`,
      quantity: 1,
      currency_id: 'ARS',
      unit_price: total
    }],
    payer: {
      email: body.customerEmail || undefined,
      name: body.customerName || undefined
    },
    external_reference: orderId,
    back_urls: {
      success: `${siteUrl}/full.html?mp=ok&order=${orderId}`,
      failure: `${siteUrl}/full.html?mp=fail&order=${orderId}`,
      pending: `${siteUrl}/full.html?mp=pending&order=${orderId}`
    },
    auto_return: 'approved',
    notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mp-webhook`
  };

  const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(preferenceBody)
  });

  if (!mpResponse.ok) {
    const detail = await mpResponse.text();
    console.error('MP preference failed:', detail);
    // No revertimos la orden acá — queda en 'pending' y el usuario puede reintentar el pago.
    return json({ ok: false, error: 'mp_preference_failed', detail }, 502);
  }

  const preference = await mpResponse.json();

  // 3. Guardar el preference_id en la orden para el webhook.
  await supabase
    .from('orders')
    .update({
      payment_provider: 'mercadopago',
      payment_preference_id: preference.id
    })
    .eq('id', orderId);

  return json({
    ok: true,
    orderId,
    total,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point,
    preferenceId: preference.id
  });
});
