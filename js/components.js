/* Kaio-Store Component Loader — with inline fallback for file:// */
(() => {
    const COMPONENT_VERSION = '20260423-1';

    /* ─── Inline fallback HTML (used when fetch fails, e.g. file:// protocol) ─── */
    const INLINE = {};

    INLINE['header-container'] = `<!-- Header Component -->
<header class="bg-surface-bright/60 backdrop-blur-[16px] w-full top-0 z-50 border-none shadow-[0_0_40px_rgba(255,144,106,0.1)] sticky">
    <div class="flex justify-between items-center w-full px-6 py-4 max-w-[1920px] mx-auto">
        <a href="full.html" class="text-4xl md:text-5xl font-black italic text-[#ff906a] tracking-widest font-headline hover:opacity-80 transition-opacity">KAIO-STORE</a>
        <div class="hidden lg:flex flex-1 max-w-xl mx-12">
            <div class="relative w-full group">
                <input id="searchInput" class="w-full bg-surface-container border-none focus:ring-1 focus:ring-secondary py-2.5 px-4 font-label text-sm placeholder:text-outline italic transition-all duration-300" placeholder="\u00bfQu\u00e9 est\u00e1s buscando?" type="text" />
                <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline transition-colors duration-300 group-focus-within:text-secondary">search</span>
                <div id="searchDropdown" class="hidden absolute top-full left-0 right-0 mt-1 bg-surface-container-high border border-outline-variant/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-[80] max-h-72 overflow-y-auto"></div>
            </div>
        </div>
        <div class="flex items-center gap-3">
            <div id="authBtn" class="relative cursor-pointer transition-transform hover:scale-105 active:scale-95" title="Mi cuenta">
                <span id="authBtnIcon" class="material-symbols-outlined text-[34px] text-[#e5e3ff] hover:text-[#ff906a] transition-colors">account_circle</span>
                <div id="authBtnAvatar" class="hidden w-9 h-9 flex items-center justify-center bg-gradient-to-br from-primary to-secondary rounded-sm">
                    <span id="authBtnInitials" class="font-headline font-black text-sm text-[#0c0c1f] select-none"></span>
                </div>
            </div>
            <div id="cartBtn" class="relative group cursor-pointer transition-transform hover:scale-105 active:scale-95">
                <span class="material-symbols-outlined text-[34px] text-[#e5e3ff] hover:text-[#ff6c92] transition-colors">shopping_cart</span>
                <span id="cartCount" class="absolute -top-2 -right-2 min-w-[20px] h-5 bg-tertiary text-on-tertiary text-[10px] font-bold px-1.5 rounded-sm hidden flex items-center justify-center">0</span>
            </div>
        </div>
    </div>
    <nav class="hidden md:flex justify-center gap-8 py-4 border-t border-outline-variant/20">
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="manga.html">Manga</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="comics.html">C\u00f3mics</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="figuras.html">Figuras</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="nuevos-ingresos.html">Nuevos Ingresos</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="indumentaria.html">Indumentaria</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="tcg.html">Centro TCG</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="videojuegos.html">Videojuegos</a>
        <a class="font-headline text-lg font-bold uppercase tracking-tighter text-[#e5e3ff] hover:text-[#00d2fd] transition-colors" href="ofertas.html">Ofertas</a>
    </nav>
</header>
<div class="w-full bg-primary-container overflow-hidden flex items-center h-8 z-40 relative">
    <div class="animate-marquee flex whitespace-nowrap items-center">
        <div class="flex items-center gap-12 pr-12 text-on-primary-fixed">
            <span class="font-label text-[10px] uppercase font-black tracking-widest">ENV\u00cdO GRATIS EN PEDIDOS SUPERIORES A $75 \u2014 ENTREGA EXPR\u00c9S GLOBAL</span>
            <span class="material-symbols-outlined text-[10px]">star</span>
            <span class="font-label text-[10px] uppercase font-black tracking-widest">ENV\u00cdO GRATIS EN PEDIDOS SUPERIORES A $75 \u2014 ENTREGA EXPR\u00c9S GLOBAL</span>
            <span class="material-symbols-outlined text-[10px]">star</span>
        </div>
        <div class="flex items-center gap-12 pr-12 text-on-primary-fixed" aria-hidden="true">
            <span class="font-label text-[10px] uppercase font-black tracking-widest">ENV\u00cdO GRATIS EN PEDIDOS SUPERIORES A $75 \u2014 ENTREGA EXPR\u00c9S GLOBAL</span>
            <span class="material-symbols-outlined text-[10px]">star</span>
            <span class="font-label text-[10px] uppercase font-black tracking-widest">ENV\u00cdO GRATIS EN PEDIDOS SUPERIORES A $75 \u2014 ENTREGA EXPR\u00c9S GLOBAL</span>
            <span class="material-symbols-outlined text-[10px]">star</span>
        </div>
    </div>
</div>`;

    INLINE['cart-container'] = `<!-- Cart Drawer Component -->
<div id="cartOverlay" class="fixed inset-0 bg-black/60 z-[90] hidden opacity-0 transition-opacity duration-300 backdrop-blur-sm"></div>
<aside id="cartDrawer" class="fixed top-0 right-0 h-full w-full max-w-md bg-surface-container-low z-[95] translate-x-full transition-transform duration-500 ease-in-out flex flex-col shadow-[-8px_0_48px_rgba(0,0,0,0.6)]">
    <div class="flex justify-between items-center px-6 py-5 border-b border-outline-variant/20">
        <div>
            <h2 class="font-headline text-xl font-black uppercase tracking-tight">Mi Carrito</h2>
            <p id="cartDrawerCount" class="font-label text-xs text-on-surface-variant uppercase tracking-widest mt-0.5">0 productos</p>
        </div>
        <button id="cartClose" class="p-2 text-on-surface-variant hover:text-tertiary transition-colors">
            <span class="material-symbols-outlined">close</span>
        </button>
    </div>
    <div id="cartItems" class="flex-1 overflow-y-auto p-6 space-y-4">
        <div id="cartEmpty" class="flex flex-col items-center justify-center h-full gap-4 text-on-surface-variant py-16">
            <span class="material-symbols-outlined text-6xl opacity-20">shopping_bag</span>
            <p class="font-label text-xs uppercase tracking-widest">Tu carrito est\u00e1 vac\u00edo</p>
        </div>
    </div>
    <div id="cartFooter" class="hidden border-t border-outline-variant/20 bg-surface-container">
        <div class="px-6 pt-5 pb-3">
            <div class="flex gap-2">
                <input id="couponInput" type="text" placeholder="C\u00d3DIGO DE DESCUENTO"
                    class="flex-1 bg-surface-container-high border border-outline-variant/30 text-on-surface font-label text-[10px] uppercase tracking-widest px-3 py-2.5 focus:ring-1 focus:ring-secondary focus:outline-none placeholder:text-outline" />
                <button id="couponBtn" class="px-4 py-2 border border-secondary text-secondary font-label text-[10px] uppercase tracking-widest hover:bg-secondary hover:text-on-secondary transition-all whitespace-nowrap">APLICAR</button>
            </div>
            <p id="couponMsg" class="font-label text-[10px] mt-2 hidden"></p>
        </div>
        <div id="cartPointsRedeem" class="px-6 pb-2 hidden"></div>
        <div class="px-6 pb-4 space-y-2 border-t border-outline-variant/10 pt-4">
            <div class="flex justify-between font-label text-[10px] uppercase tracking-widest text-on-surface-variant"><span>Subtotal</span><span id="cartSubtotal">$0.00</span></div>
            <div class="flex justify-between font-label text-[10px] uppercase tracking-widest text-on-surface-variant"><span>Env\u00edo</span><span id="cartShipping" class="text-secondary font-bold">GRATIS</span></div>
            <div id="cartDiscountRow" class="hidden justify-between font-label text-[10px] uppercase tracking-widest text-tertiary"><span>Descuento</span><span id="cartDiscount">-$0.00</span></div>
            <div id="cartPointsDiscountRow" class="hidden justify-between font-label text-[10px] uppercase tracking-widest text-secondary"><span>Descuento Puntos Kaio</span><span id="cartPointsDiscount">-$0.00</span></div>
            <div class="flex justify-between items-center pt-3 border-t border-outline-variant/20"><span class="font-label text-xs uppercase tracking-widest text-on-surface-variant">Total estimado</span><span id="cartTotal" class="font-headline text-2xl font-black text-primary">$0.00</span></div>
            <p id="cartFreeShippingMsg" class="font-label text-[10px] text-secondary hidden text-center pt-1"></p>
        </div>
        <div class="px-6 pb-6 space-y-3">
            <a href="code.html" class="block w-full bg-gradient-to-br from-primary to-primary-container text-on-primary-fixed py-4 text-center font-headline font-black uppercase tracking-widest hover:shadow-[0_0_30px_rgba(255,144,106,0.4)] transition-all rounded-sm">Ir al Checkout</a>
            <button id="cartContinue" class="w-full border border-outline-variant/30 text-on-surface-variant py-3 font-label text-xs uppercase tracking-widest hover:border-secondary hover:text-secondary transition-colors rounded-sm">Seguir Comprando</button>
        </div>
    </div>
</aside>
<div id="toastNotif" class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99] translate-y-20 opacity-0 transition-all duration-300 pointer-events-none">
    <div class="flex items-center gap-3 bg-[#0c0c1f]/80 backdrop-blur-xl border border-secondary/30 px-6 py-3 shadow-[0_0_20px_rgba(0,210,253,0.15)] rounded-full min-w-[280px] max-w-sm">
        <span id="toastIcon" class="material-symbols-outlined text-secondary text-lg flex-shrink-0">auto_awesome</span>
        <p id="toastMsg" class="font-label text-xs uppercase tracking-wider text-[#fff] flex-1 truncate"></p>
    </div>
</div>`;

    INLINE['whatsapp-container'] = `<a href="https://wa.me/1234567890" target="_blank" class="fixed bottom-24 right-4 lg:bottom-10 lg:right-10 z-[100] bg-[#25D366] text-white p-3.5 rounded-[18px] shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:scale-110 transition-all flex items-center justify-center">
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="currentColor" viewBox="0 0 16 16"><path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.1-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/></svg>
</a>`;

    INLINE['footer-container'] = `<!-- Footer Component -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<footer class="bg-[#111127] w-full pt-10 pb-6">
    <div class="max-w-7xl mx-auto px-6">
        <div class="grid grid-cols-1 md:grid-cols-[220px_1fr_300px] gap-8 mb-6">
            <div>
                <div class="text-4xl font-black text-[#ff906a] mb-3 font-headline">KAIO-STORE</div>
                <p class="font-body text-lg leading-relaxed text-[#aaa8c3] mb-4">La b\u00f3veda digital definitiva para manga, comics y figuras de colecci\u00f3n premium.</p>
                <div class="flex gap-2">
                    <a href="mailto:contacto@kaio-store.com" target="_blank" class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-[#0c0c1f] transition-all">
                        <span class="material-symbols-outlined text-base">mail</span>
                    </a>
                    <a href="https://instagram.com/kaiostore" target="_blank" class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-[#0c0c1f] transition-all group">
                        <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 group-hover:stroke-[#0c0c1f] stroke-on-surface transition-colors" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                    </a>
                    <a href="https://wa.me/1234567890" target="_blank" class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-[#0c0c1f] transition-all group">
                        <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 group-hover:stroke-[#0c0c1f] stroke-on-surface transition-colors" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </a>
                    <a href="https://youtube.com/@kaiostore" target="_blank" class="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-[#0c0c1f] transition-all group">
                        <svg viewBox="0 0 24 24" fill="none" class="w-4 h-4 group-hover:stroke-[#0c0c1f] stroke-on-surface transition-colors" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                    </a>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4">
                <div>
                    <p class="font-label text-base uppercase tracking-[0.12em] text-on-surface-variant mb-3 font-bold">Principal</p>
                    <ul class="space-y-2.5 font-body text-lg text-[#aaa8c3]">
                        <li><a class="hover:text-primary transition-colors" href="full.html">Inicio</a></li>
                        <li><a class="hover:text-primary transition-colors" href="nuevos-ingresos.html">Nuevos ingresos</a></li>
                        <li><a class="hover:text-primary transition-colors" href="ofertas.html">Ofertas</a></li>
                        <li><a class="hover:text-primary transition-colors" href="code.html">Checkout</a></li>
                    </ul>
                </div>
                <div>
                    <p class="font-label text-base uppercase tracking-[0.12em] text-on-surface-variant mb-3 font-bold">Colecciones</p>
                    <ul class="space-y-2.5 font-body text-lg text-[#aaa8c3]">
                        <li><a class="hover:text-primary transition-colors" href="manga.html">Manga</a></li>
                        <li><a class="hover:text-primary transition-colors" href="comics.html">C\u00f3mics</a></li>
                        <li><a class="hover:text-primary transition-colors" href="figuras.html">Figuras</a></li>
                    </ul>
                </div>
                <div>
                    <p class="font-label text-base uppercase tracking-[0.12em] text-on-surface-variant mb-3 font-bold">Especiales</p>
                    <ul class="space-y-2.5 font-body text-lg text-[#aaa8c3]">
                        <li><a class="hover:text-primary transition-colors" href="tcg.html">Centro TCG</a></li>
                        <li><a class="hover:text-primary transition-colors" href="videojuegos.html">Videojuegos</a></li>
                        <li><a class="hover:text-primary transition-colors" href="indumentaria.html">Indumentaria</a></li>
                    </ul>
                </div>
            </div>
            <div>
                <p class="font-label text-base uppercase tracking-[0.12em] text-on-surface-variant mb-3 font-bold">Ubicaci\u00f3n</p>
                <div id="kaioMap" style="height:160px;width:100%;border:1px solid rgba(70,70,92,0.25);"></div>
                <p class="font-label text-base text-[#aaa8c3] mt-2">Buenos Aires, Argentina</p>
            </div>
        </div>
        <div class="h-px bg-outline-variant/15 mb-4"></div>
        <p class="font-body text-base text-[#aaa8c3] text-center">&copy; 2026 KAIO-STORE. Todos los derechos reservados.</p>
    </div>
</footer>
<nav class="fixed bottom-0 left-0 w-full flex justify-around items-center px-3 pb-3 pt-2 md:hidden bg-[#0c0c1f]/95 backdrop-blur-2xl z-50 rounded-t-2xl border-t border-[#ffffff08] shadow-[0_-8px_32px_rgba(0,0,0,0.6)]">
    <a class="flex flex-col items-center justify-center text-[#aaa8c3] hover:text-secondary transition-colors font-label text-[10px] font-bold uppercase tracking-wide gap-1" href="full.html"><span class="material-symbols-outlined text-lg">home</span><span>Inicio</span></a>
    <a class="flex flex-col items-center justify-center text-[#aaa8c3] hover:text-secondary transition-colors font-label text-[9px] font-bold uppercase tracking-wide gap-1" href="manga.html"><span class="material-symbols-outlined text-lg">grid_view</span><span>Tienda</span></a>
    <button id="cartBtnMobile" class="flex flex-col items-center justify-center text-[#aaa8c3] hover:text-secondary transition-colors font-label text-[9px] font-bold uppercase tracking-wide gap-1 relative"><span class="material-symbols-outlined text-lg">shopping_bag</span><span>Carrito</span><span id="cartCountMobile" class="absolute -top-2 right-0 bg-tertiary text-on-tertiary text-[8px] font-bold w-4 h-4 flex items-center justify-center rounded-sm hidden">0</span></button>
</nav>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<script>
(function initKaioMap(){var e=document.getElementById("kaioMap");if(!e||e._leafletMap)return;var LAT=-34.6037,LNG=-58.3816;var map=L.map("kaioMap",{center:[LAT,LNG],zoom:14,zoomControl:false,scrollWheelZoom:false,attributionControl:false});e._leafletMap=map;L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19}).addTo(map);var icon=L.divIcon({className:"",html:'<div style="width:28px;height:28px;background:linear-gradient(135deg,#ff906a,#ff6c92);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 12px rgba(255,144,106,0.6)"></div>',iconSize:[28,28],iconAnchor:[14,28]});L.marker([LAT,LNG],{icon:icon}).addTo(map).bindPopup('<strong style="font-family:sans-serif;font-size:12px">KAIO-STORE</strong><br><span style="font-size:11px;color:#888">Buenos Aires, Argentina</span>',{offset:[0,-20]});L.control.zoom({position:"bottomright"}).addTo(map)})();
<\/script>`;

    /* ─── Component list ─── */
    const components = [
        { id: 'header-container',   url: 'components/header.html' },
        { id: 'footer-container',   url: 'components/footer.html' },
        { id: 'cart-container',     url: 'components/cart-drawer.html' },
        { id: 'whatsapp-container', url: 'components/whatsapp-button.html' }
    ];

    const loadComponent = async (comp) => {
        const container = document.getElementById(comp.id);
        if (!container) return;

        try {
            const res = await fetch(`${comp.url}?v=${COMPONENT_VERSION}`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            container.innerHTML = await res.text();
        } catch (err) {
            /* Fallback: use inline HTML if fetch fails (e.g. file:// protocol) */
            if (INLINE[comp.id]) {
                container.innerHTML = INLINE[comp.id];
                console.log(`[KAIO] Loaded ${comp.id} from inline fallback`);
            } else {
                console.warn(`[KAIO] Could not load ${comp.id}:`, err.message);
            }
        }

        if (comp.id === 'header-container') {
            highlightActiveLink();
            document.dispatchEvent(new CustomEvent('kaio:header-loaded'));
        }
    };

    const highlightActiveLink = () => {
        const current = window.location.pathname.split('/').pop() || 'full.html';
        document.querySelectorAll('nav a').forEach(link => {
            if (link.getAttribute('href') === current) {
                link.classList.add('text-primary');
                link.classList.remove('text-[#e5e3ff]');
            }
        });
    };

    const loadAuth = () => {
        if (document.querySelector('script[src*="auth.js"]')) return;
        
        const cdn = document.createElement('script');
        cdn.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        document.head.appendChild(cdn);
        
        cdn.onload = () => {
            const config = document.createElement('script');
            config.src = 'js/supabase-config.js';
            document.head.appendChild(config);
            
            config.onload = () => {
                const s = document.createElement('script');
                s.src = `js/auth.js?v=${COMPONENT_VERSION}`;
                s.dataset.kaio = 'auth';
                document.head.appendChild(s);
            };
        };
    };

    const init = async () => {
        await Promise.all(components.map(loadComponent));
        loadAuth();
        document.dispatchEvent(new CustomEvent('kaio:components-loaded'));
    };

    document.addEventListener('DOMContentLoaded', init);
})();
