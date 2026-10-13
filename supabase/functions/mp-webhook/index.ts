// supabase/functions/mp-webhook/index.ts
// Recibe notificaciones de MercadoPago y actualiza el estado de la orden.
//
// Deploy:
//   supabase functions deploy mp-webhook --no-verify-jwt
//
// El --no-verify-jwt es necesario porque MP no manda el JWT de Supabase.
// Validamos en su lugar que el payload sea legítimo consultando la API de MP.
//
// Variables de entorno requeridas:
//   MP_ACCESS_TOKEN

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STATUS_MAP: Record<string, string> = {
  approved: 'approved',
  authorized: 'approved',
  in_process: 'pending',
  pending: 'pending',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'refunded'
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  const accessToken = Deno.env.get('MP_ACCESS_TOKEN');
  if (!accessToken) return new Response('mp_not_configured', { status: 500 });

  let body: any;
  try { body = await req.json(); } catch { return new Response('invalid_json', { status: 400 }); }

  // MP envía { type: 'payment', data: { id: '12345' } } y otros tipos.
  if (body?.type !== 'payment' || !body?.data?.id) {
    // ACK silencioso para tipos que no manejamos (merchant_order, etc.)
    return new Response('ignored', { status: 200 });
  }

  // Consultamos la API de MP con el access token (validamos así que la notificación es real).
  const paymentId = body.data.id;
  const detailRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!detailRes.ok) {
    console.error('MP payment fetch failed:', await detailRes.text());
    return new Response('mp_lookup_failed', { status: 502 });
  }
  const payment = await detailRes.json();

  const orderId = payment.external_reference as string | undefined;
  if (!orderId) return new Response('no_external_reference', { status: 200 });

  const newStatus = STATUS_MAP[payment.status] ?? 'pending';

  // Cliente con SERVICE_ROLE para escribir sin RLS (la BD ya validó la orden, acá solo update de estado).
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const { error } = await admin
    .from('orders')
    .update({
      payment_status: newStatus,
      payment_external_id: String(paymentId)
    })
    .eq('id', orderId);

  if (error) {
    console.error('order update failed:', error);
    return new Response('update_failed', { status: 500 });
  }

  // Si el pago terminó mal, devolvemos el stock al inventario.
  // restore_stock es idempotente — si MP manda dos webhooks, solo restaura una vez.
  if (newStatus === 'rejected' || newStatus === 'cancelled' || newStatus === 'refunded') {
    const { error: restoreError } = await admin.rpc('restore_stock', { p_order_id: orderId });
    if (restoreError) {
      console.error('restore_stock failed:', restoreError);
      // No devolvemos 500 — el update de status ya se hizo y MP reintentaría innecesariamente.
    }
  }

  return new Response('ok', { status: 200 });
});
