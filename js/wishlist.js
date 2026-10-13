/* Kaio-Store Wishlist Page */
(() => {
    const esc = (value) => {
        if (window.escapeHTML) return window.escapeHTML(value);
        if (value == null) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    };

    const wishlistGrid = () => document.getElementById('wishlistGrid');
    const wishlistEmpty = () => document.getElementById('wishlistEmpty');
    const wishlistCount = () => document.getElementById('wishlistCount');

    const renderWishlist = () => {
        const grid = wishlistGrid();
        const empty = wishlistEmpty();
        const counter = wishlistCount();
        if (!grid || !empty || !counter) return;

        const items = window.KAIOCart?.getWishlistItems?.() || [];
        counter.textContent = `${items.length} producto${items.length !== 1 ? 's' : ''} guardado${items.length !== 1 ? 's' : ''}`;

        if (!items.length) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }

        empty.classList.add('hidden');
        grid.innerHTML = items.map((item) => `
            <div class="catalog-card group" data-product-id="${esc(item.id)}" data-product-url="${esc(item.url)}" id="product-${esc(item.id)}">
                <div class="catalog-card-media catalog-card-media-portrait">
                    <img src="${esc(item.img)}" alt="${esc(item.name)}" class="catalog-card-image" />
                    <button class="catalog-card-favorite catalog-card-favorite-visible" data-wishlist-product="${esc(item.id)}" data-active="true">
                        <span class="material-symbols-outlined text-sm text-tertiary transition-colors" style="font-variation-settings:'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24">favorite</span>
                    </button>
                </div>
                <div class="catalog-card-content">
                    <span class="catalog-card-label">${esc(item.category || 'Favoritos')}</span>
                    <h4 class="catalog-card-title">${esc(item.name)}</h4>
                    <div class="mt-4 flex flex-col gap-2">
                        <span class="catalog-card-price font-headline font-black text-secondary text-lg">${esc(item.price)}</span>
                        <button class="w-full bg-surface-container-high border border-outline-variant/30 text-on-surface font-label text-[10px] font-bold uppercase tracking-widest py-3 hover:bg-secondary hover:text-on-secondary hover:border-secondary transition-all flex items-center justify-center gap-2" data-move-to-cart="${esc(item.id)}">
                            <span class="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                            Mover al carrito
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    document.addEventListener('DOMContentLoaded', renderWishlist);
    document.addEventListener('kaio:wishlist-updated', renderWishlist);
})();
