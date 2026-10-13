/* Kaio-Store Shared UI Logic */
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

    let toastTimer;
    let searchRequest = 0;

    window.showToast = (message) => {
        const toast = document.getElementById('toastNotif');
        const toastMsg = document.getElementById('toastMsg');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.classList.remove('translate-y-20', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.add('translate-y-20', 'opacity-0');
            toast.classList.remove('translate-y-0', 'opacity-100');
        }, 2600);
    };

    const markActiveNavigation = () => {
        const current = window.location.pathname.split('/').pop() || 'full.html';
        document.querySelectorAll('header nav a, footer a').forEach((link) => {
            const href = link.getAttribute('href');
            if (!href) return;

            const active = href === current;
            link.classList.toggle('text-primary', active);
            if (active) {
                link.classList.remove('text-[#e5e3ff]', 'text-[#aaa8c3]');
            }
        });
    };

    const renderSearchResults = async (query, searchInput, searchDropdown) => {
        const requestId = ++searchRequest;
        const normalizedQuery = query.trim();

        if (!normalizedQuery) {
            searchDropdown.classList.add('hidden');
            searchDropdown.innerHTML = '';
            return;
        }

        searchDropdown.innerHTML = `
            <div class="px-4 py-4 text-on-surface-variant font-label text-xs uppercase tracking-wider">
                Buscando en el catalogo...
            </div>
        `;
        searchDropdown.classList.remove('hidden');

        const results = await window.KAIOCatalog?.getSearchResults?.(normalizedQuery);
        if (requestId !== searchRequest || !results) return;

        const rows = [];

        results.sections.forEach((section) => {
            rows.push(`
                <button type="button" class="search-hit flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-container cursor-pointer transition-colors border-b border-outline-variant/10 text-left" data-type="section" data-url="${esc(section.url)}">
                    <span class="material-symbols-outlined text-secondary text-base">apps</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-headline font-bold text-xs uppercase truncate">${esc(section.label)}</p>
                        <p class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Ir a seccion</p>
                    </div>
                </button>
            `);
        });

        results.products.forEach((product) => {
            rows.push(`
                <button type="button" class="search-hit flex w-full items-center gap-3 px-4 py-3 hover:bg-surface-container cursor-pointer transition-colors border-b border-outline-variant/10 last:border-0 text-left" data-type="product" data-product-id="${esc(product.id)}">
                    <div class="w-9 h-11 flex-shrink-0 overflow-hidden bg-surface-container-high">
                        <img src="${esc(product.img)}" alt="${esc(product.name)}" class="w-full h-full object-cover" />
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="font-headline font-bold text-xs uppercase truncate">${esc(product.name)}</p>
                        <p class="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">${esc(product.category)} · ${esc(product.price)}</p>
                    </div>
                    <span class="material-symbols-outlined text-outline text-base">arrow_outward</span>
                </button>
            `);
        });

        if (!rows.length) {
            searchDropdown.innerHTML = `
                <div class="px-4 py-4 text-on-surface-variant font-label text-xs uppercase tracking-wider">
                    Sin resultados
                </div>
            `;
            return;
        }

        searchDropdown.innerHTML = rows.join('');
        searchDropdown.querySelectorAll('.search-hit').forEach((row) => {
            row.addEventListener('click', () => {
                const type = row.dataset.type;
                if (type === 'section') {
                    window.location.href = row.dataset.url;
                    return;
                }

                if (type === 'product') {
                    window.KAIOCatalog?.navigateToProduct?.(row.dataset.productId);
                    searchDropdown.classList.add('hidden');
                    searchInput.value = '';
                }
            });
        });
    };

    const initSearch = () => {
        const searchInput = document.getElementById('searchInput');
        const searchDropdown = document.getElementById('searchDropdown');
        if (!searchInput || !searchDropdown || searchInput.dataset.searchReady === 'true') return;

        searchInput.dataset.searchReady = 'true';

        searchInput.addEventListener('input', (event) => {
            renderSearchResults(event.target.value, searchInput, searchDropdown);
        });

        document.addEventListener('click', (event) => {
            if (!searchInput.contains(event.target) && !searchDropdown.contains(event.target)) {
                searchDropdown.classList.add('hidden');
            }
        });
    };

    const initFilterChips = () => {
        const filterContainers = document.querySelectorAll('.filter-container, #filterChips, .tcg-filter-bar');
        
        filterContainers.forEach(container => {
            const buttons = container.querySelectorAll('button');
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    // Update active class
                    buttons.forEach(chip => {
                        chip.classList.remove('filter-chip-active');
                        if (!chip.classList.contains('filter-chip')) chip.classList.add('filter-chip');
                    });
                    button.classList.add('filter-chip-active');
                    button.classList.remove('filter-chip');

                    // Filtering logic
                    const filterValue = (button.dataset.filter || button.dataset.tcgFilter || 'all').toLowerCase().trim();
                    const grid = container.nextElementSibling?.classList.contains('catalog-grid') 
                        ? container.nextElementSibling 
                        : document.querySelector('.catalog-grid:not(#recentCatalogGrid)');
                        
                    if (grid) {
                        const cards = grid.querySelectorAll('.catalog-card');
                        cards.forEach(card => {
                            if (filterValue === 'all') {
                                card.style.display = '';
                                return;
                            }
                            
                            const labelNode = card.querySelector('.catalog-card-label');
                            const label = (labelNode ? labelNode.textContent : '').toLowerCase().trim();
                            // slugify label to compare properly
                            const slugLabel = label.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            const slugFilter = filterValue.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                            
                            if (slugLabel.includes(slugFilter) || slugFilter.includes(slugLabel)) {
                                card.style.display = '';
                            } else {
                                card.style.display = 'none';
                            }
                        });
                    }
                });
            });
        });
    };

    const optimizeImages = () => {
        document.querySelectorAll('img').forEach((image, index) => {
            if (image.dataset.mediaOptimized === 'true') return;

            const eager = !!image.closest('#heroCarousel, .section-hero, .hero-kinetic')
                || image.classList.contains('hero-slide')
                || index < 2;

            image.decoding = 'async';
            image.loading = eager ? 'eager' : 'lazy';
            image.fetchPriority = eager ? 'high' : 'low';
            image.dataset.mediaOptimized = 'true';
        });
    };

    const renderRecentProducts = () => {
        const wrapper = document.getElementById('recentCatalogWrapper');
        const grid = document.getElementById('recentCatalogGrid');
        if (!wrapper || !grid || !window.KAIOCatalog?.getRecentProducts) return;

        const recent = window.KAIOCatalog.getRecentProducts();
        if (!recent.length) {
            wrapper.classList.add('hidden');
            return;
        }

        wrapper.classList.remove('hidden');
        grid.innerHTML = recent.map(item => `
            <div class="catalog-card group" data-product-id="${esc(item.id)}" data-category="${esc(item.category || '')}" data-price="${esc(item.priceValue || 0)}" data-product-url="${esc(item.url)}" data-recent-card="true">
                <div class="catalog-card-media font-headline">
                    <img src="${esc(item.img)}" alt="${esc(item.name)}" class="catalog-card-image" loading="lazy" />
                    <button class="catalog-card-favorite" data-wishlist-product="${esc(item.id)}" onclick="event.stopPropagation()">
                        <span class="material-symbols-outlined text-sm text-surface-container font-medium hover:text-tertiary transition-colors" style="font-variation-settings:'FILL' 0,'wght' 400,'GRAD' 0,'opsz' 24">favorite</span>
                    </button>
                    <!-- Quick view injected by catalog.js -->
                    <div class="catalog-badge">Reciente</div>
                </div>
                <div class="catalog-card-content">
                    <span class="catalog-card-label">${esc(item.category || '')}</span>
                    <h4 class="catalog-card-title">${esc(item.name)}</h4>
                    <div class="catalog-card-price-row">
                        <span class="catalog-card-price">${esc(item.price)}</span>
                        <button class="catalog-card-cart" data-cart-product="${esc(item.id)}" onclick="event.stopPropagation()">
                            <span class="material-symbols-outlined text-sm">add_shopping_cart</span>
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Reemplaza el onclick inline con event delegation (evita XSS via JS-context en atributos).
        grid.querySelectorAll('[data-recent-card="true"]').forEach((card) => {
            card.addEventListener('click', (event) => {
                if (event.target.closest('button')) return;
                window.KAIOCatalog?.navigateToProduct?.(card.dataset.productId);
            });
        });
    };

    window.openQuickView = (productId) => {
        const product = window.KAIOCatalog?.resolveProductSync?.(productId);
        if (!product) return;
        
        let qv = document.getElementById('quickViewModal');
        if (!qv) {
            qv = document.createElement('div');
            qv.id = 'quickViewModal';
            qv.className = 'fixed inset-0 z-[100] bg-[#0c0c1f]/80 backdrop-blur-sm hidden items-center justify-center p-4 transition-opacity duration-300 opacity-0';
            qv.innerHTML = `
                <div class="bg-surface-container relative w-full max-w-4xl flex flex-col md:flex-row shadow-[0_10px_50px_rgba(0,0,0,0.5)] border border-outline-variant/20 max-h-[90vh] overflow-hidden" onclick="event.stopPropagation()">
                    <button id="qvCloseBtn" class="absolute top-4 right-4 z-10 w-10 h-10 bg-[#0c0c1f]/50 backdrop-blur-md rounded-full flex items-center justify-center text-on-surface hover:text-error transition-colors"><span class="material-symbols-outlined">close</span></button>
                    <div class="w-full md:w-1/2 bg-surface-container-high relative">
                        <img id="qvImage" src="" alt="" class="w-full h-full object-cover max-h-[50vh] md:max-h-[90vh]" />
                    </div>
                    <div class="w-full md:w-1/2 p-8 md:p-12 flex flex-col overflow-y-auto">
                        <p id="qvCategory" class="font-label text-xs uppercase tracking-[0.2em] text-secondary mb-2"></p>
                        <h2 id="qvTitle" class="font-headline font-black text-3xl uppercase tracking-tighter text-on-surface mb-2 leading-tight"></h2>
                        <p id="qvPrice" class="font-headline font-bold text-primary text-2xl mb-6"></p>
                        <p class="font-body text-on-surface-variant text-sm leading-relaxed mb-8 hidden md:block">
                            Producto premium importado con acabados top-tier. Exclusivo de la boveda digital de Kaio-Store. Todas las ordenes cuentan con garantia y seguimiento en tiempo real.
                        </p>
                        <div class="mt-auto flex flex-col gap-3">
                            <button id="qvAddBtn" class="w-full bg-gradient-to-r from-primary to-primary-fixed text-on-primary-fixed font-headline font-black text-lg uppercase tracking-tighter py-4 hover:shadow-[0_0_20px_rgba(255,144,106,0.4)] transition-all">
                                AÑADIR AL CARRITO
                            </button>
                            <a id="qvLinkBtn" href="#" class="w-full flex items-center justify-center gap-2 border border-outline-variant/30 text-on-surface hover:text-secondary hover:border-secondary py-4 font-headline uppercase tracking-widest font-bold transition-all">
                                <span class="material-symbols-outlined text-sm">open_in_new</span>
                                VER DETALLES DE PÁGINA
                            </a>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(qv);
            
            qv.addEventListener('click', () => { window.closeQuickView(); });
            document.getElementById('qvCloseBtn').addEventListener('click', () => { window.closeQuickView(); });
        }
        
        document.getElementById('qvImage').src = product.img;
        document.getElementById('qvImage').alt = product.name;
        document.getElementById('qvCategory').textContent = product.category;
        document.getElementById('qvTitle').textContent = product.name;
        document.getElementById('qvPrice').textContent = product.price;
        
        const cartBtn = document.getElementById('qvAddBtn');
        cartBtn.dataset.cartProduct = product.id; // Cart.js will automatically pick this up!
        cartBtn.onclick = () => window.closeQuickView(); // optionally close after adding

        document.getElementById('qvLinkBtn').href = `${product.url}?product=${encodeURIComponent(product.id)}`;
        
        qv.classList.remove('hidden');
        qv.classList.add('flex');
        requestAnimationFrame(() => {
            qv.style.opacity = '1';
        });
    };

    window.closeQuickView = () => {
        const qv = document.getElementById('quickViewModal');
        if (!qv) return;
        qv.style.opacity = '0';
        setTimeout(() => {
            qv.classList.add('hidden');
            qv.classList.remove('flex');
        }, 300);
    };

    const initTiltEffect = () => {
        // Prevent on mobile devices where hover isn't natural
        if (window.matchMedia("(pointer: coarse)").matches) return;
        
        const cards = document.querySelectorAll('.catalog-card');
        cards.forEach(card => {
            if (card.dataset.tiltInitialized === 'true') return;
            card.dataset.tiltInitialized = 'true';
            
            // Set transitions for smooth enter/exit
            card.style.transition = 'transform 0.4s cubic-bezier(0.25, 1, 0.5, 1), box-shadow 0.4s cubic-bezier(0.25, 1, 0.5, 1)';
            card.style.transformStyle = 'preserve-3d';

            card.addEventListener('mousemove', (e) => {
                // Remove transition during movement for zero-lag tracking
                card.style.transition = 'none';
                
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left; 
                const y = e.clientY - rect.top;  
                
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                
                // Calculate rotation (max 8 degrees)
                const rotateX = ((y - centerY) / centerY) * -8;
                const rotateY = ((x - centerX) / centerX) * 8;
                
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                
                // Calculate dynamic shadow
                const shadowX = (x - centerX) / 8;
                const shadowY = (y - centerY) / 8;
                card.style.boxShadow = `${-shadowX}px ${-shadowY}px 25px rgba(0, 210, 253, 0.15)`;
            });

            card.addEventListener('mouseleave', () => {
                // Restore transition for smooth snap back
                card.style.transition = 'transform 0.5s ease-out, box-shadow 0.5s ease-out';
                card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
                card.style.boxShadow = '';
            });
        });
    };

    document.addEventListener('kaio:components-loaded', () => {
        markActiveNavigation();
        initSearch();
        optimizeImages();
        renderRecentProducts();
        initTiltEffect();
    });

    // Detecta el retorno de MercadoPago via query params (?mp=ok|fail|pending&order=...)
    // y muestra un toast. El estado real del pago ya viene actualizado por el webhook server-side.
    const handleMpReturn = () => {
        const params = new URLSearchParams(window.location.search);
        const mpStatus = params.get('mp');
        const orderId = params.get('order');
        if (!mpStatus) return;

        const messages = {
            ok: orderId ? `¡Pago confirmado! Tu pedido KAO-${String(orderId).slice(0, 8).toUpperCase()} está en preparación.` : '¡Pago confirmado!',
            pending: 'Tu pago quedó pendiente. Te avisaremos cuando se acredite.',
            fail: 'El pago no se completó. Podés reintentarlo desde tu carrito.'
        };
        const msg = messages[mpStatus] || null;
        if (msg) setTimeout(() => window.showToast?.(msg), 600);

        // Si volvió OK, el server ya descontó stock y registró la orden.
        // Limpiamos el carrito local por si el usuario abandonó la pestaña original.
        if (mpStatus === 'ok') {
            try { window.KAIOCart?.clear?.(); } catch {}
        }

        // Limpiamos los query params para evitar mostrar el toast en cada refresh.
        params.delete('mp');
        params.delete('order');
        const cleaned = params.toString();
        const newUrl = window.location.pathname + (cleaned ? `?${cleaned}` : '') + window.location.hash;
        window.history.replaceState({}, '', newUrl);
    };

    document.addEventListener('DOMContentLoaded', () => {
        markActiveNavigation();
        initSearch();
        initFilterChips();
        optimizeImages();
        initTiltEffect();
        handleMpReturn();
    });
})();
