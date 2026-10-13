/* Kaio-Store Cart, Wishlist & Commerce Logic */
(() => {
    // Escape local: window.escapeHTML puede no estar listo si auth.js carga después.
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

    const CART_KEY = 'kaioCart';
    const WISHLIST_KEY = 'kaioWishlist';
    const COUPON_KEY = 'kaioCoupon';

    const SHIPPING_THRESHOLD = 75;
    const SHIPPING_COST = 8.99;
    const COUPONS = { KAIO10: 0.10, MANGA20: 0.20, KAIO15: 0.15 };
    const STANDARD_ETA = 'Despacho en 24 hs habiles';
    const CHECKOUT_NOTE = 'Proteccion y resumen local';
    const POINTS_VALUE = 0.1; // Cada punto Kaio vale $0.10 de descuento

    const storage = {
        cart: JSON.parse(localStorage.getItem(CART_KEY) || '[]'),
        wishlist: JSON.parse(localStorage.getItem(WISHLIST_KEY) || '[]'),
        coupon: localStorage.getItem(COUPON_KEY) || null,
        pointsUsed: false
    };

    const fmt = (value) => (window.KAIOCatalog?.formatMoney?.(value) || `$${Number(value || 0).toFixed(2)}`);
    const slugify = (value) => (window.KAIOCatalog?.slugify?.(value) || String(value || '').toLowerCase().replace(/\s+/g, '-'));

    const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(storage.cart));
    const saveWishlist = () => localStorage.setItem(WISHLIST_KEY, JSON.stringify(storage.wishlist));
    let syncTimer = null;
    let syncingRemote = false;

    const normalizeCartItem = (item) => {
        if (!item) return null;

        if (typeof item === 'string') {
            return { id: slugify(item), qty: 1 };
        }

        const id = slugify(item.id || item.name || '');
        if (!id) return null;

        return {
            id,
            qty: Number(item.qty) > 0 ? Number(item.qty) : 1,
            name: item.name || '',
            price: item.price || '',
            priceNum: Number(item.priceNum) || 0,
            img: item.img || ''
        };
    };

    storage.cart = storage.cart.map(normalizeCartItem).filter(Boolean);
    storage.wishlist = storage.wishlist.map((item) => slugify(item)).filter(Boolean);

    const syncRemoteNow = async () => {
        if (syncingRemote) return;
        if (!window.KAIOAuth?.isLoggedIn?.()) return;
        if (!window.KAIOSupabaseStore) return;

        syncingRemote = true;
        try {
            await Promise.all([
                window.KAIOSupabaseStore.saveCart(storage.cart),
                window.KAIOSupabaseStore.saveWishlist(storage.wishlist)
            ]);
        } finally {
            syncingRemote = false;
        }
    };

    const queueRemoteSync = () => {
        clearTimeout(syncTimer);
        syncTimer = setTimeout(syncRemoteNow, 240);
    };

    const hydrateRemoteState = async () => {
        if (!window.KAIOAuth?.isLoggedIn?.()) return;
        if (!window.KAIOSupabaseStore) return;

        const [remoteCart, remoteWishlist] = await Promise.all([
            window.KAIOSupabaseStore.loadCart(),
            window.KAIOSupabaseStore.loadWishlist()
        ]);

        if (Array.isArray(remoteCart)) {
            storage.cart = remoteCart.map(normalizeCartItem).filter(Boolean);
            saveCart();
            updateCartUI();
        }

        if (Array.isArray(remoteWishlist)) {
            storage.wishlist = remoteWishlist.map((item) => slugify(item)).filter(Boolean);
            saveWishlist();
            updateWishlistButtons();
        }
    };

    const resolveProductSnapshot = (item) => {
        const product = window.KAIOCatalog?.resolveProductSync?.(item?.id || item?.name || item) || null;
        return {
            id: product?.id || item.id,
            name: product?.name || item.name || item.id,
            priceNum: product?.priceNum ?? item.priceNum ?? 0,
            price: product?.price || item.price || fmt(product?.priceNum ?? item.priceNum ?? 0),
            img: product?.img || item.img || '',
            category: product?.category || '',
            section: product?.section || '',
            url: product?.url || '',
            stock: product?.stock == null ? Infinity : Number(product.stock)
        };
    };

    const getStock = (productId) => {
        const product = window.KAIOCatalog?.resolveProductSync?.(productId);
        if (!product || product.stock == null) return Infinity;
        return Number(product.stock);
    };

    const getWishlistItems = () => storage.wishlist
        .map((id) => resolveProductSnapshot({ id }))
        .filter((item) => item.id && item.name);

    const getDetailedItems = () => storage.cart.map((item) => {
        const snapshot = resolveProductSnapshot(item);
        return {
            ...snapshot,
            qty: item.qty,
            lineTotal: snapshot.priceNum * item.qty
        };
    });

    const subtotalAmt = () => getDetailedItems().reduce((sum, item) => sum + item.lineTotal, 0);
    const baseShippingAmt = () => (subtotalAmt() >= SHIPPING_THRESHOLD || storage.cart.length === 0) ? 0 : SHIPPING_COST;
    const discountAmt = () => (storage.coupon && COUPONS[storage.coupon]) ? subtotalAmt() * COUPONS[storage.coupon] : 0;
    const getFreeShippingProgress = (subtotal) => {
        if (subtotal <= 0) return 0;
        return Math.min(100, Math.round((subtotal / SHIPPING_THRESHOLD) * 100));
    };

    const pointsDiscountAmt = () => {
        if (!storage.pointsUsed) return 0;
        const user = window.KAIOAuth?.getCurrentUser?.();
        if (!user || !user.points) return 0;
        const availableDiscount = user.points * POINTS_VALUE;
        const subtotal = subtotalAmt();
        const couponDiscount = discountAmt();
        return Math.min(subtotal - couponDiscount, availableDiscount);
    };

    const getSummary = (extraShipping = 0) => {
        const subtotal = subtotalAmt();
        const baseShipping = storage.cart.length ? baseShippingAmt() : 0;
        const shipping = storage.cart.length ? baseShipping + extraShipping : 0;
        const discount = discountAmt();
        const pointsDiscount = pointsDiscountAmt();
        const remainingForFreeShipping = Math.max(0, SHIPPING_THRESHOLD - subtotal);

        return {
            subtotal,
            shipping,
            baseShipping,
            extraShipping,
            discount,
            pointsDiscount,
            total: Math.max(0, subtotal + shipping - discount - pointsDiscount),
            coupon: storage.coupon,
            pointsUsed: storage.pointsUsed,
            items: getDetailedItems(),
            totalItems: storage.cart.reduce((sum, item) => sum + item.qty, 0),
            remainingForFreeShipping,
            freeShippingProgress: getFreeShippingProgress(subtotal),
            etaCopy: STANDARD_ETA,
            checkoutCopy: CHECKOUT_NOTE
        };
    };

    const dispatchCartUpdate = () => {
        saveCart();
        queueRemoteSync();
        document.dispatchEvent(new CustomEvent('kaio:cart-updated', { detail: getSummary() }));
    };

    const dispatchWishlistUpdate = () => {
        saveWishlist();
        queueRemoteSync();
        document.dispatchEvent(new CustomEvent('kaio:wishlist-updated', { detail: [...storage.wishlist] }));
    };

    const updateWishlistButtons = () => {
        document.querySelectorAll('[data-wishlist-product]').forEach((button) => {
            const icon = button.querySelector('.material-symbols-outlined');
            if (!icon) return;

            const active = storage.wishlist.includes(button.dataset.wishlistProduct);
            button.dataset.active = active ? 'true' : 'false';
            icon.style.fontVariationSettings = active
                ? "'FILL' 1,'wght' 400,'GRAD' 0,'opsz' 24"
                : "'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24";
            icon.style.color = active ? '#ff6c92' : '';
        });
    };

    const syncProductButtons = () => {
        window.KAIOCatalog?.hydratePage?.();
        updateWishlistButtons();
    };

    const setCoupon = (rawCode) => {
        const code = String(rawCode || '').trim().toUpperCase();
        if (!code || !COUPONS[code]) {
            return { ok: false, message: 'Codigo invalido o expirado' };
        }

        storage.coupon = code;
        localStorage.setItem(COUPON_KEY, code);
        document.dispatchEvent(new CustomEvent('kaio:coupon-updated', { detail: { coupon: code } }));
        dispatchCartUpdate();

        return {
            ok: true,
            coupon: code,
            message: `Cupon aplicado: ${COUPONS[code] * 100}% de descuento`
        };
    };

    const clearCoupon = () => {
        storage.coupon = null;
        localStorage.removeItem(COUPON_KEY);
        document.dispatchEvent(new CustomEvent('kaio:coupon-updated', { detail: { coupon: null } }));
        dispatchCartUpdate();
    };

    const addItem = (input) => {
        const incoming = typeof input === 'string'
            ? resolveProductSnapshot({ id: input })
            : resolveProductSnapshot({
                id: input.id,
                name: input.name,
                price: input.price,
                priceNum: input.priceNum,
                img: input.img
            });

        if (!incoming.id) return null;

        const stock = getStock(incoming.id);
        if (stock <= 0) {
            window.showToast?.(`"${incoming.name}" está agotado.`);
            return null;
        }

        const existing = storage.cart.find((item) => item.id === incoming.id);
        const nextQty = (existing?.qty || 0) + 1;
        if (nextQty > stock) {
            window.showToast?.(`Solo quedan ${stock} unidades de "${incoming.name}".`);
            return null;
        }

        if (existing) {
            existing.qty = nextQty;
            existing.name = existing.name || incoming.name;
            existing.price = existing.price || incoming.price;
            existing.priceNum = existing.priceNum || incoming.priceNum;
            existing.img = existing.img || incoming.img;
        } else {
            storage.cart.push({
                id: incoming.id,
                qty: 1,
                name: incoming.name,
                price: incoming.price,
                priceNum: incoming.priceNum,
                img: incoming.img
            });
        }

        dispatchCartUpdate();
        return incoming;
    };

    const updateItemQty = (id, nextQty) => {
        const item = storage.cart.find((entry) => entry.id === id);
        if (!item) return;

        const requested = Number(nextQty);
        const stock = getStock(id);
        const capped = Math.min(requested, stock);
        if (requested > stock) {
            window.showToast?.(`Solo quedan ${stock} unidades disponibles.`);
        }

        item.qty = capped;
        if (item.qty <= 0) {
            storage.cart = storage.cart.filter((entry) => entry.id !== id);
        }
        dispatchCartUpdate();
    };

    const removeItem = (id) => {
        storage.cart = storage.cart.filter((item) => item.id !== id);
        dispatchCartUpdate();
    };

    const toggleWishlist = (id) => {
        const product = resolveProductSnapshot({ id });
        const index = storage.wishlist.indexOf(id);

        if (index >= 0) {
            storage.wishlist.splice(index, 1);
            dispatchWishlistUpdate();
            window.showToast?.(`"${product.name}" eliminado de favoritos`);
            return false;
        }

        storage.wishlist.push(id);
        dispatchWishlistUpdate();
        window.showToast?.(`"${product.name}" agregado a favoritos`);
        return true;
    };

    const clear = () => {
        storage.cart = [];
        storage.coupon = null;
        storage.pointsUsed = false;
        localStorage.removeItem(CART_KEY);
        localStorage.removeItem(COUPON_KEY);
        dispatchCartUpdate();
    };

    const togglePoints = (active) => {
        storage.pointsUsed = active;
        dispatchCartUpdate();
    };

    const updateCartUI = () => {
        const summary = getSummary();

        ['cartCount', 'cartCountMobile'].forEach((id) => {
            const element = document.getElementById(id);
            if (!element) return;
            element.textContent = summary.totalItems;
            element.classList.toggle('hidden', summary.totalItems === 0);
        });

        const setText = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        };

        setText('cartDrawerCount', `${summary.totalItems} producto${summary.totalItems !== 1 ? 's' : ''}`);
        setText('cartSubtotal', fmt(summary.subtotal));
        setText('cartTotal', fmt(summary.total));

        const shippingEl = document.getElementById('cartShipping');
        if (shippingEl) {
            shippingEl.textContent = summary.shipping === 0 ? 'GRATIS' : fmt(summary.shipping);
            shippingEl.className = summary.shipping === 0 ? 'text-secondary font-bold' : 'text-on-surface';
        }

        const hintEl = document.getElementById('cartFreeShippingMsg');
        if (hintEl) {
            if (summary.remainingForFreeShipping > 0 && summary.items.length > 0) {
                hintEl.textContent = `Agrega ${fmt(summary.remainingForFreeShipping)} mas para envio gratis`;
                hintEl.classList.remove('hidden');
            } else if (summary.items.length > 0) {
                hintEl.textContent = 'Ya desbloqueaste el envio gratis en esta compra';
                hintEl.classList.remove('hidden');
            } else {
                hintEl.classList.add('hidden');
            }
        }

        const shippingBadgeEl = document.getElementById('cartFreeShippingBadge');
        if (shippingBadgeEl) {
            shippingBadgeEl.textContent = summary.items.length === 0
                ? `$${SHIPPING_THRESHOLD.toFixed(0)} para activar`
                : summary.remainingForFreeShipping > 0
                    ? `${fmt(summary.remainingForFreeShipping)} restantes`
                    : 'Beneficio desbloqueado';
        }

        const shippingBarEl = document.getElementById('cartFreeShippingBar');
        if (shippingBarEl) {
            shippingBarEl.style.width = `${summary.items.length ? summary.freeShippingProgress : 0}%`;
        }

        const etaEl = document.getElementById('cartEta');
        if (etaEl) etaEl.textContent = summary.etaCopy;

        const paymentNoteEl = document.getElementById('cartPaymentNote');
        if (paymentNoteEl) paymentNoteEl.textContent = summary.checkoutCopy;

        const discountRow = document.getElementById('cartDiscountRow');
        if (discountRow) {
            discountRow.style.display = summary.discount > 0 ? 'flex' : 'none';
            setText('cartDiscount', `-${fmt(summary.discount)}`);
        }

        const pointsDiscountRow = document.getElementById('cartPointsDiscountRow');
        if (pointsDiscountRow) {
            pointsDiscountRow.style.display = summary.pointsDiscount > 0 ? 'flex' : 'none';
            setText('cartPointsDiscount', `-${fmt(summary.pointsDiscount)}`);
        }

        const pointsRedeemEl = document.getElementById('cartPointsRedeem');
        if (pointsRedeemEl) {
            const user = window.KAIOAuth?.getCurrentUser?.();
            if (user && user.points > 0 && summary.totalItems > 0) {
                pointsRedeemEl.classList.remove('hidden');
                const pointsVal = fmt(user.points * POINTS_VALUE);
                pointsRedeemEl.innerHTML = `
                    <div class="flex items-center justify-between gap-4 p-3 bg-surface-container-high border border-outline-variant/20">
                        <div>
                            <p class="font-headline font-black text-[10px] text-secondary uppercase italic">Puntos Kaio Disponibles</p>
                            <p class="font-label text-xs font-bold">${user.points} pts <span class="text-on-surface-variant font-normal">(${pointsVal})</span></p>
                        </div>
                        <button id="btnTogglePoints" class="px-4 py-2 font-headline font-black text-[10px] uppercase tracking-widest transition-all ${summary.pointsUsed ? 'bg-error/10 text-error border border-error/20' : 'bg-secondary text-on-secondary-fixed shadow-[0_0_15px_rgba(0,210,253,0.3)]'}">
                            ${summary.pointsUsed ? 'Quitar' : 'Canjear'}
                        </button>
                    </div>
                `;
                // Add event listener manually after innerHTML
                const btn = pointsRedeemEl.querySelector('#btnTogglePoints');
                if (btn) {
                    btn.onclick = () => {
                        togglePoints(!summary.pointsUsed);
                        window.showToast?.(summary.pointsUsed ? 'Puntos removidos' : 'Puntos aplicados como descuento');
                    };
                }
            } else {
                pointsRedeemEl.classList.add('hidden');
            }
        }

        const footerEl = document.getElementById('cartFooter');
        if (footerEl) footerEl.classList.toggle('hidden', summary.totalItems === 0);

        const couponInput = document.getElementById('couponInput');
        const couponMsg = document.getElementById('couponMsg');
        if (couponInput && couponMsg) {
            if (summary.coupon && COUPONS[summary.coupon]) {
                couponInput.value = summary.coupon;
                couponInput.disabled = true;
                couponMsg.textContent = `Cupon "${summary.coupon}" aplicado - ${COUPONS[summary.coupon] * 100}% OFF`;
                couponMsg.className = 'font-label text-[10px] mt-2 text-secondary';
                couponMsg.classList.remove('hidden');
            } else {
                couponInput.disabled = false;
                if (!couponInput.matches(':focus')) couponInput.value = '';
                couponMsg.classList.add('hidden');
            }
        }

        const itemsEl = document.getElementById('cartItems');
        const emptyEl = document.getElementById('cartEmpty');
        if (!itemsEl) return;

        itemsEl.querySelectorAll('.cart-item').forEach((node) => node.remove());

        if (!summary.items.length) {
            if (emptyEl) emptyEl.style.display = '';
            return;
        }

        if (emptyEl) emptyEl.style.display = 'none';

        summary.items.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'cart-item flex gap-4 items-start bg-surface-container p-4';
            row.innerHTML = `
                <div class="w-14 flex-shrink-0 overflow-hidden bg-surface-container-high" style="height:72px">
                    <img src="${esc(item.img)}" alt="${esc(item.name)}" class="w-full h-full object-cover" loading="lazy" decoding="async" />
                </div>
                <div class="flex-1 min-w-0">
                    <p class="font-headline font-bold text-xs uppercase truncate">${esc(item.name)}</p>
                    <p class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mt-1 truncate">${esc(item.category || 'Seleccion curada')}</p>
                    <div class="flex items-center justify-between gap-3 mt-2">
                        <p class="text-primary font-black font-headline text-sm">${esc(item.price)}</p>
                        <p class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Total ${esc(fmt(item.lineTotal))}</p>
                    </div>
                    <div class="flex items-center gap-3 mt-3">
                        <button class="qty-dec w-6 h-6 bg-surface-container-high font-headline font-black text-sm flex items-center justify-center hover:bg-primary hover:text-on-primary-fixed transition-colors" data-id="${esc(item.id)}">-</button>
                        <span class="font-label text-xs w-4 text-center">${esc(item.qty)}</span>
                        <button class="qty-inc w-6 h-6 bg-surface-container-high font-headline font-black text-sm flex items-center justify-center hover:bg-primary hover:text-on-primary-fixed transition-colors" data-id="${esc(item.id)}">+</button>
                    </div>
                </div>
                <button class="remove-item p-1 text-on-surface-variant hover:text-error transition-colors" data-id="${esc(item.id)}">
                    <span class="material-symbols-outlined text-sm">delete</span>
                </button>
            `;
            itemsEl.appendChild(row);
        });
    };

    const bindGlobalInteractions = () => {
        document.addEventListener('click', (event) => {
            const target = event.target;

            if (target.closest('#cartBtn') || target.closest('#cartBtnMobile')) {
                window.openCart();
                return;
            }

            if (target.closest('#cartClose') || target.closest('#cartContinue')) {
                window.closeCart();
                return;
            }

            if (target.id === 'cartOverlay') {
                window.closeCart();
                return;
            }

            if (target.closest('#couponBtn')) {
                const input = document.getElementById('couponInput');
                const msg = document.getElementById('couponMsg');
                const result = setCoupon(input?.value);
                if (!msg || !input) return;

                msg.textContent = result.message;
                msg.className = `font-label text-[10px] mt-2 ${result.ok ? 'text-secondary' : 'text-error block border border-[#ff716c] p-2 bg-[#ff716c]/10'}`;
                msg.classList.remove('hidden');
                
                if (!result.ok) {
                    input.animate([
                        { transform: 'translateX(0)' },
                        { transform: 'translateX(-6px)' },
                        { transform: 'translateX(6px)' },
                        { transform: 'translateX(-6px)' },
                        { transform: 'translateX(6px)' },
                        { transform: 'translateX(0)' }
                    ], { duration: 400, easing: 'ease-in-out' });
                    return;
                }

                input.value = result.coupon;
                input.disabled = true;
                window.showToast?.(`Cupon "${result.coupon}" aplicado`);
                return;
            }

            if (target.closest('#cartClear')) {
                if (!storage.cart.length) return;
                clear();
                window.showToast?.('Carrito vaciado');
                return;
            }

            const cartProductButton = target.closest('[data-cart-product]');
            if (cartProductButton) {
                event.stopPropagation();
                const product = addItem(cartProductButton.dataset.cartProduct);
                if (!product) return;

                const badge = document.getElementById('cartCount');
                if (badge) {
                    badge.style.transform = 'scale(1.6)';
                    setTimeout(() => { badge.style.transform = ''; }, 250);
                }

                window.showToast?.(`"${product.name}" agregado al carrito`);
                
                // Fly-to-Cart Animation
                const card = cartProductButton.closest('.catalog-card') || document.getElementById('quickViewModal');
                const img = card ? card.querySelector('img') : null;
                const cartIcon = document.getElementById('cartBtn');
                
                if (img && cartIcon && window.innerWidth > 768) {
                    const imgRect = img.getBoundingClientRect();
                    const cartRect = cartIcon.getBoundingClientRect();
                    
                    const clone = img.cloneNode(true);
                    clone.style.position = 'fixed';
                    clone.style.top = `${imgRect.top}px`;
                    clone.style.left = `${imgRect.left}px`;
                    clone.style.width = `${imgRect.width}px`;
                    clone.style.height = `${imgRect.height}px`;
                    clone.style.zIndex = '9999';
                    clone.style.transition = 'all 0.6s cubic-bezier(0.25, 1, 0.5, 1)';
                    clone.style.borderRadius = '8px';
                    clone.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
                    clone.style.objectFit = 'cover';
                    document.body.appendChild(clone);
                    
                    requestAnimationFrame(() => {
                        clone.style.top = `${cartRect.top + 10}px`;
                        clone.style.left = `${cartRect.left + 10}px`;
                        clone.style.width = '20px';
                        clone.style.height = '20px';
                        clone.style.opacity = '0.5';
                        clone.style.transform = 'scale(0.5) rotate(15deg)';
                    });
                    
                    setTimeout(() => {
                        if(clone.parentNode) clone.parentNode.removeChild(clone);
                        window.openCart();
                    }, 500);
                } else {
                    window.openCart();
                }
                return;
            }

            const moveToCartButton = target.closest('[data-move-to-cart]');
            if (moveToCartButton) {
                event.stopPropagation();
                const productId = moveToCartButton.dataset.moveToCart;
                const product = addItem(productId);
                if (!product) return;

                // Si está en wishlist, lo quitamos
                if (storage.wishlist.includes(productId)) {
                    toggleWishlist(productId);
                    updateWishlistButtons();
                }

                const badge = document.getElementById('cartCount');
                if (badge) {
                    badge.style.transform = 'scale(1.6)';
                    setTimeout(() => { badge.style.transform = ''; }, 250);
                }

                window.showToast?.(`"${product.name}" movido al carrito`);
                
                // Animación simple (sin imagen ya que se mueve desde lista)
                window.openCart();
                return;
            }

            const wishlistButton = target.closest('[data-wishlist-product]');
            if (wishlistButton) {
                event.stopPropagation();
                toggleWishlist(wishlistButton.dataset.wishlistProduct);
                updateWishlistButtons();
                return;
            }

            if (target.closest('.qty-dec')) {
                const id = target.closest('.qty-dec').dataset.id;
                const item = storage.cart.find((entry) => entry.id === id);
                if (item) {
                    if (item.qty === 1) {
                        if (window.confirm(`¿Seguro que deseas eliminar "${item.name}" de tu cesta?`)) {
                            updateItemQty(id, 0);
                            window.showToast?.(`"${item.name}" se eliminó del carrito.`);
                        }
                    } else {
                        updateItemQty(id, item.qty - 1);
                    }
                }
                return;
            }

            if (target.closest('.qty-inc')) {
                const id = target.closest('.qty-inc').dataset.id;
                const item = storage.cart.find((entry) => entry.id === id);
                if (item) updateItemQty(id, item.qty + 1);
                return;
            }

            if (target.closest('.remove-item')) {
                removeItem(target.closest('.remove-item').dataset.id);
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.id === 'couponInput') {
                event.preventDefault();
                document.getElementById('couponBtn')?.click();
            }
        });
    };

    window.openCart = () => {
        const overlay = document.getElementById('cartOverlay');
        const drawer = document.getElementById('cartDrawer');
        overlay?.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay?.classList.add('opacity-100');
            drawer?.classList.remove('translate-x-full');
        });
        document.body.style.overflow = 'hidden';
    };

    window.closeCart = () => {
        const overlay = document.getElementById('cartOverlay');
        const drawer = document.getElementById('cartDrawer');
        overlay?.classList.remove('opacity-100');
        drawer?.classList.add('translate-x-full');
        setTimeout(() => {
            overlay?.classList.add('hidden');
            document.body.style.overflow = '';
        }, 300);
    };

    window.addToCart = (data) => addItem(data);
    window.applyCoupon = () => setCoupon(document.getElementById('couponInput')?.value);
    window.removeCoupon = clearCoupon;
    window.getCartSummary = (extraShipping = 0) => getSummary(extraShipping);

    window.KAIOCart = {
        coupons: COUPONS,
        shippingThreshold: SHIPPING_THRESHOLD,
        shippingCost: SHIPPING_COST,
        getDetailedItems,
        getWishlistItems,
        getWishlistIds: () => [...storage.wishlist],
        getSummary,
        addItem,
        updateItemQty,
        removeItem,
        setCoupon,
        clearCoupon,
        togglePoints,
        toggleWishlist,
        isInWishlist: (id) => storage.wishlist.includes(id),
        clear
    };

    document.addEventListener('kaio:components-loaded', () => {
        syncProductButtons();
        updateCartUI();
        hydrateRemoteState();
    });

    document.addEventListener('kaio:catalog-hydrated', () => {
        updateWishlistButtons();
        updateCartUI();
    });

    document.addEventListener('kaio:wishlist-updated', updateWishlistButtons);
    document.addEventListener('kaio:cart-updated', updateCartUI);

    document.addEventListener('DOMContentLoaded', () => {
        bindGlobalInteractions();
        syncProductButtons();
        updateCartUI();
        hydrateRemoteState();
        window.KAIOCatalog?.ensureLoaded?.().then(() => {
            syncProductButtons();
            updateCartUI();
        });
    });

    document.addEventListener('kaio:auth-changed', (e) => {
        if (!e.detail?.isLoggedIn) {
            storage.cart = [];
            storage.wishlist = [];
            storage.pointsUsed = false;
            saveCart();
            saveWishlist();
            updateCartUI();
            updateWishlistButtons();
        } else {
            hydrateRemoteState();
        }
    });
})();
