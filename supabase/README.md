# Supabase — setup KAIO-STORE

Esta carpeta contiene la SQL y las Edge Functions que el frontend espera. Hay que pegar los `.sql` en orden y deployar las Edge Functions.

## 1. SQL — pegar en Supabase → SQL Editor

Ejecutar **en este orden**:

1. `01_stock.sql` — agrega columna `stock` a `products` y RPC `decrement_stock`.
2. `02_place_order.sql` — tabla `coupons`, vista `shipping_rules`, RPC `place_order`, RLS de orders.
3. `03_payments.sql` — columnas `payment_status`, `payment_provider`, `payment_external_id`, `payment_preference_id` en `orders`.

> Si tu tabla `products` aún no existe, creala primero con sus columnas básicas (`id text primary key, name text, price_num numeric, ...`). Idem `orders`, `order_items`, `profiles`, `cart_items`, `wishlist_items`.

## 2. Edge Functions — MercadoPago

### Variables de entorno (Supabase → Project Settings → Edge Functions → Secrets)

| Variable | Valor |
|----------|-------|
| `MP_ACCESS_TOKEN` | Access token de MercadoPago. Sandbox: `TEST-...`, prod: `APP_USR-...`. Sacalo en https://www.mercadopago.com.ar/developers/panel |
| `PUBLIC_SITE_URL` | URL pública del sitio (ej: `https://kaio-store.vercel.app` o `http://localhost:8000` para dev) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya están autoinjectadas por Supabase, no las cargues a mano.

### Deploy

```bash
# Una sola vez:
supabase login
supabase link --project-ref <tu-project-ref>

# Cada vez que cambian las funciones:
supabase functions deploy create-mp-preference
supabase functions deploy mp-webhook --no-verify-jwt
```

> El `--no-verify-jwt` en `mp-webhook` es **crítico**: MercadoPago no manda JWT de Supabase. La autenticidad la validamos consultando la API de MP con tu access token (ver `mp-webhook/index.ts`).

### Configurar webhook en MercadoPago

1. Andá a https://www.mercadopago.com.ar/developers/panel/webhooks
2. URL: `https://<tu-project-ref>.supabase.co/functions/v1/mp-webhook`
3. Eventos: `payment` (chequear `payment.created` y `payment.updated`).

## 3. Auth — Google Sign-In

Para que el botón "Continuar con Google" funcione:

1. Supabase → Authentication → Providers → Google → habilitar.
2. Crear OAuth Client en https://console.cloud.google.com/apis/credentials (tipo "Web application").
3. Pegar el `Client ID` y `Client Secret` en Supabase.
4. En la consola de Google, agregar como **Authorized redirect URI**:
   `https://<tu-project-ref>.supabase.co/auth/v1/callback`

## 4. Verificar el flujo end-to-end

1. Cargá un producto al carrito.
2. Logueate (con email o Google).
3. Andá al checkout, llená el form, dejá MercadoPago seleccionado.
4. Click "Finalizar" → te redirige a MP (sandbox si estás en localhost).
5. Pagá con la tarjeta de prueba: `5031 7557 3453 0604`, CVV `123`, vencimiento futuro, DNI `12345678`.
6. MP redirige a `full.html?mp=ok&order=<uuid>`. Ves el toast de confirmación.
7. En Supabase Studio → Table Editor → `orders`: tu orden tiene `payment_status='approved'` (lo escribió el webhook).
