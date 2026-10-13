# 🛒 Kaio-Store

Demo de tienda e-commerce temática (manga, cómics, figuras, TCG, videojuegos) construida con **HTML + Vanilla JS + Tailwind CSS**, integrada con **Supabase** como backend de autenticación.

## 🚀 Demo en vivo
> Abrir `full.html` directamente en el navegador o deployar en GitHub Pages.

## ✨ Características

- 🎨 **Diseño "Neon Kineticism"** — tema cyberpunk con gradientes, animaciones y efectos visuales
- 🛒 **Carrito de compras** completo con cupones de descuento y puntos Kaio
- 👤 **Autenticación real** con Supabase (registro, login, sesión persistente)
- 🔍 **Búsqueda en tiempo real** con dropdown predictivo
- 💳 **Checkout completo** con validación de formularios, múltiples métodos de pago y recibo digital con confetti
- ❤️ **Wishlist** (lista de favoritos)
- 📦 **Quick View** modal de producto sin salir del catálogo
- 🔒 **Seguridad frontend**: sanitización anti-XSS y hash SHA-256 con Web Crypto API
- 🖼️ **Imágenes optimizadas** en formato WebP (reducción ~80% de peso)
- 📱 **Responsive** — adaptado para mobile y desktop

## 🗂️ Estructura del Proyecto

```
kaio-store/
├── full.html              # Home principal
├── manga.html             # Catálogo de Manga
├── comics.html            # Catálogo de Cómics
├── figuras.html           # Catálogo de Figuras
├── tcg.html               # Centro TCG
├── videojuegos.html       # Videojuegos
├── ofertas.html           # Ofertas
├── wishlist.html          # Favoritos
├── code.html              # Checkout
├── js/
│   ├── auth.js            # Sistema de autenticación (Supabase)
│   ├── cart.js            # Carrito de compras
│   ├── checkout.js        # Flujo de pago
│   ├── catalog.js         # Filtros y catálogo
│   ├── ui.js              # Búsqueda, modales, Quick View
│   ├── components.js      # Cargador dinámico de componentes
│   └── supabase-config.js # Configuración de Supabase
├── css/
│   └── main.css           # Estilos globales (Neon Kineticism)
└── category-images/       # Imágenes de productos (WebP)
```

## 🛠️ Tecnologías

| Tecnología | Uso |
|---|---|
| HTML5 / CSS3 | Estructura y estilos base |
| Vanilla JavaScript (ES6+) | Toda la lógica de la app |
| Tailwind CSS | Framework de utilidades CSS |
| Supabase | Autenticación (Auth) en la nube |
| Web Crypto API | Hash seguro de contraseñas |
| Canvas Confetti | Animación de compra exitosa |

## ⚙️ Configuración de Supabase

El proyecto usa Supabase para la autenticación. Si querés conectarlo a tu propio proyecto:

1. Crear un proyecto en [supabase.com](https://supabase.com)
2. Ir a **Settings → API**
3. Reemplazar en `js/supabase-config.js`:

```js
const SUPABASE_URL = 'TU_URL_AQUI';
const SUPABASE_PUBLISHABLE_KEY = 'TU_KEY_AQUI';
```

4. En Supabase → **Authentication → Providers → Email**, desactivar **"Confirm email"** para desarrollo.

## 📄 Licencia

Proyecto de portfolio — uso libre con atribución.
