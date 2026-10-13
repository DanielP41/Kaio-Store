/* Kaio-Store Shared Catalog Layer */
(() => {
    const CATALOG_VERSION = '20260503-2';
    const CACHE_KEY = `kaioCatalogCache:${CATALOG_VERSION}`;
    const PRODUCT_PAGE_URLS = [
        'full.html',
        'manga.html',
        'comics.html',
        'figuras.html',
        'indumentaria.html',
        'nuevos-ingresos.html',
        'ofertas.html',
        'tcg.html',
        'videojuegos.html'
    ];

    const sections = [
        { id: 'home', label: 'Inicio', url: 'full.html', keywords: ['portada', 'home', 'inicio', 'destacados'] },
        { id: 'manga', label: 'Manga', url: 'manga.html', keywords: ['shonen', 'seinen', 'tomo'] },
        { id: 'comics', label: 'Comics', url: 'comics.html', keywords: ['comic', 'dc', 'marvel', 'novela grafica'] },
        { id: 'figuras', label: 'Figuras', url: 'figuras.html', keywords: ['estatutas', 'coleccionables', 'figure'] },
        { id: 'nuevos-ingresos', label: 'Nuevos Ingresos', url: 'nuevos-ingresos.html', keywords: ['nuevo', 'lanzamiento', 'reciente'] },
        { id: 'indumentaria', label: 'Indumentaria', url: 'indumentaria.html', keywords: ['ropa', 'techwear', 'hoodie', 'tee'] },
        { id: 'tcg', label: 'Centro TCG', url: 'tcg.html', keywords: ['cards', 'trading card game', 'pokemon', 'magic', 'yugioh'] },
        { id: 'videojuegos', label: 'Videojuegos', url: 'videojuegos.html', keywords: ['gaming', 'consola', 'juego', 'nintendo', 'playstation'] },
        { id: 'ofertas', label: 'Ofertas', url: 'ofertas.html', keywords: ['sale', 'descuento', 'promo'] },
        { id: 'wishlist', label: 'Favoritos', url: 'wishlist.html', keywords: ['wishlist', 'guardados', 'deseos', 'favoritos'] }
    ];

    const state = {
        products: new Map(),
        loadPromise: null
    };

    const cleanText = (value) => (value || '').replace(/\s+/g, ' ').trim();

    const normalizeText = (value) => cleanText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s-]/g, ' ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const slugify = (value) => normalizeText(value).replace(/\s+/g, '-');

    const formatMoney = (value) => `$${Number(value || 0).toFixed(2)}`;
    const parseMoney = (value) => Number(String(value || '').replace(/[^0-9.]/g, '')) || 0;

    const currentPath = () => window.location.pathname.split('/').pop() || 'full.html';
    const getSectionByUrl = (url) => sections.find((section) => section.url === url) || sections[0];

    const getProductCard = (heading) =>
        heading.closest('.catalog-card')
        || heading.closest('.bg-surface-container.group.relative')
        || heading.closest('.bg-surface-container.group')
        || heading.closest('.group');

    const getProductButtons = (card) => {
        const buttons = Array.from(card.querySelectorAll('button'));
        const getByIcon = (iconName) => buttons.find((button) =>
            button.querySelector('.material-symbols-outlined')?.textContent.trim() === iconName
        );

        return {
            cartButton: getByIcon('add_shopping_cart'),
            wishlistButton: getByIcon('favorite')
        };
    };

    const getPriceNode = (card) =>
        card.querySelector('.catalog-card-price')
        || Array.from(card.querySelectorAll('span')).find((span) => /^\$/.test(cleanText(span.textContent)));

    const mergeProduct = (nextProduct) => {
        const existing = state.products.get(nextProduct.id);
        if (!existing) {
            state.products.set(nextProduct.id, { ...nextProduct, sources: [nextProduct.url] });
            return state.products.get(nextProduct.id);
        }

        const shouldPromote = existing.section === 'full' && nextProduct.section !== 'full';
        const merged = {
            ...existing,
            ...(shouldPromote ? nextProduct : {}),
            sources: Array.from(new Set([...(existing.sources || []), nextProduct.url]))
        };

        if (!merged.priceNum && nextProduct.priceNum) {
            merged.priceNum = nextProduct.priceNum;
            merged.price = nextProduct.price;
        }
        if (!merged.img && nextProduct.img) merged.img = nextProduct.img;
        if (!merged.category && nextProduct.category) merged.category = nextProduct.category;

        state.products.set(nextProduct.id, merged);
        return merged;
    };

    const extractProductsFromRoot = (root, pageUrl, annotate = false) => {
        const found = [];
        const section = getSectionByUrl(pageUrl);
        const headings = root.querySelectorAll('main h4, main h5');

        headings.forEach((heading, index) => {
            const card = getProductCard(heading);
            if (!card) return;

            const name = cleanText(heading.textContent);
            if (!name) return;

            const priceNode = getPriceNode(card);
            const priceNum = parseMoney(priceNode?.textContent);
            if (!priceNum) return;

            const image = card.querySelector('img');
            const label = cleanText(card.querySelector('.catalog-card-label')?.textContent) || section.label;
            const product = mergeProduct({
                id: slugify(name),
                name,
                priceNum,
                price: formatMoney(priceNum),
                img: image?.getAttribute('src') || image?.src || '',
                category: label,
                section: section.id,
                url: pageUrl
            });

            found.push(product);

            if (!annotate || !(card instanceof Element)) return;

            card.dataset.productId = product.id;
            card.dataset.productUrl = product.url;
            card.dataset.price = product.priceNum;
            if (!card.dataset.originalOrder) card.dataset.originalOrder = index;

            if (!card.id) card.id = `product-${product.id}`;

            const media = card.querySelector('.catalog-card-media');
            if (media && !media.querySelector('.quickview-btn')) {
                const qvBtn = document.createElement('button');
                qvBtn.className = 'quickview-btn absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0c0c1f]/80 backdrop-blur-lg rounded-full w-12 h-12 flex items-center justify-center text-[#fff] opacity-0 group-hover:opacity-100 transition-opacity hover:text-secondary shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10';
                qvBtn.innerHTML = '<span class="material-symbols-outlined">visibility</span>';
                qvBtn.onclick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (window.openQuickView) window.openQuickView(product.id);
                };
                media.appendChild(qvBtn);
            }

            const { cartButton, wishlistButton } = getProductButtons(card);
            if (cartButton) cartButton.dataset.cartProduct = product.id;
            if (wishlistButton) wishlistButton.dataset.wishlistProduct = product.id;
        });

        return found;
    };

    const injectSorting = () => {
        document.querySelectorAll('.catalog-grid').forEach((grid) => {
            if (grid.id === 'recentCatalogGrid' || grid.closest('#wishlistGrid')) return; // No sort in special grids
            if (grid.previousElementSibling && grid.previousElementSibling.classList.contains('kaio-sort-bar')) return;
            
            const bar = document.createElement('div');
            bar.className = 'kaio-sort-bar flex justify-end mb-6';
            bar.innerHTML = `
                <select class="bg-surface-container border border-outline-variant/30 text-on-surface font-label text-xs uppercase tracking-widest px-4 py-2 focus:ring-1 focus:ring-secondary focus:outline-none">
                    <option value="default">Orden por defecto</option>
                    <option value="price-asc">Precio: Menor a Mayor</option>
                    <option value="price-desc">Precio: Mayor a Menor</option>
                    <option value="name-asc">Nombre: A-Z</option>
                </select>
            `;
            const select = bar.querySelector('select');
            select.addEventListener('change', (e) => {
                const val = e.target.value;
                const cards = Array.from(grid.querySelectorAll('.catalog-card'));
                cards.sort((a, b) => {
                    if (val === 'default') return parseInt(a.dataset.originalOrder || '0') - parseInt(b.dataset.originalOrder || '0');
                    
                    const priceA = parseFloat(a.dataset.price || '0');
                    const priceB = parseFloat(b.dataset.price || '0');
                    const nameA = a.querySelector('.catalog-card-title')?.textContent || '';
                    const nameB = b.querySelector('.catalog-card-title')?.textContent || '';
                    
                    if (val === 'price-asc') return priceA - priceB;
                    if (val === 'price-desc') return priceB - priceA;
                    if (val === 'name-asc') return nameA.localeCompare(nameB);
                    return 0;
                });
                cards.forEach(c => grid.appendChild(c));
            });
            grid.parentNode.insertBefore(bar, grid);
        });
    };

    const cacheCatalog = () => {
        const data = Array.from(state.products.values());
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return data;
    };

    const loadCatalogFromCache = () => {
        const cached = sessionStorage.getItem(CACHE_KEY);
        if (!cached) return null;

        try {
            const products = JSON.parse(cached);
            products.forEach((product) => state.products.set(product.id, product));
            return products;
        } catch (error) {
            console.warn('No se pudo leer el cache del catalogo', error);
            sessionStorage.removeItem(CACHE_KEY);
            return null;
        }
    };

    const importStaticProducts = () => {
        const staticProducts = Array.isArray(window.KAIO_PRODUCTS) ? window.KAIO_PRODUCTS : [];
        staticProducts.forEach((product) => {
            if (!product?.name || !product?.url) return;
            const id = slugify(product.id || product.name);
            if (!id) return;

            mergeProduct({
                id,
                name: cleanText(product.name),
                priceNum: Number(product.priceNum || parseMoney(product.price || 0)) || 0,
                price: product.price || formatMoney(product.priceNum || parseMoney(product.price || 0)),
                img: product.img || '',
                category: cleanText(product.category || ''),
                section: cleanText(product.section || getSectionByUrl(product.url).id),
                url: cleanText(product.url)
            });
        });
    };

    const importSupabaseProducts = async () => {
        const rows = await window.KAIOSupabaseStore?.fetchProducts?.();
        if (!rows?.length) return 0;

        rows.forEach((product) => {
            if (!product?.name || !product?.url) return;
            mergeProduct({
                id: slugify(product.id || product.name),
                name: cleanText(product.name),
                priceNum: Number(product.priceNum || 0),
                price: product.price || formatMoney(product.priceNum || 0),
                img: product.img || '',
                category: cleanText(product.category || ''),
                section: cleanText(product.section || getSectionByUrl(product.url).id),
                url: cleanText(product.url),
                stock: product.stock == null ? Infinity : Number(product.stock)
            });
        });

        return rows.length;
    };

    const buildCatalog = async () => {
        const remoteCount = await importSupabaseProducts();
        importStaticProducts();
        if (remoteCount > 0 || state.products.size) return cacheCatalog();

        const cached = loadCatalogFromCache();
        if (cached?.length) return cached;

        await Promise.all(PRODUCT_PAGE_URLS.map(async (pageUrl) => {
            try {
                const response = await fetch(`${pageUrl}?v=${CATALOG_VERSION}`, { cache: 'no-store' });
                if (!response.ok) throw new Error(`No se pudo cargar ${pageUrl}`);
                const html = await response.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                extractProductsFromRoot(doc, pageUrl, false);
            } catch (error) {
                console.warn(error);
            }
        }));

        return cacheCatalog();
    };

    const ensureLoaded = async () => {
        if (state.products.size) return Array.from(state.products.values());
        if (!state.loadPromise) {
            state.loadPromise = buildCatalog()
                .then((result) => {
                    decorateOutOfStock(document);
                    return result;
                })
                .finally(() => {
                    state.loadPromise = null;
                });
        }
        return state.loadPromise;
    };

    const resolveProductSync = (value) => {
        if (!value) return null;
        const key = typeof value === 'string'
            ? slugify(value)
            : slugify(value.id || value.name || '');
        return state.products.get(key) || null;
    };

    const resolveProduct = async (value) => {
        const sync = resolveProductSync(value);
        if (sync) return sync;
        await ensureLoaded();
        return resolveProductSync(value);
    };

    const getSearchResults = async (query) => {
        const normalizedQuery = normalizeText(query);
        if (!normalizedQuery) return { sections: [], products: [] };

        await ensureLoaded();
        const words = normalizedQuery.split(' ').filter(Boolean);

        const scoreText = (haystack) => {
            if (!haystack) return 0;
            if (haystack.startsWith(normalizedQuery)) return 3;
            if (haystack.includes(normalizedQuery)) return 2;
            if (words.every((word) => haystack.includes(word))) return 1;
            return 0;
        };

        const sectionHits = sections
            .map((section) => {
                const haystack = normalizeText(`${section.label} ${section.keywords.join(' ')}`);
                return { section, score: scoreText(haystack) };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score || a.section.label.localeCompare(b.section.label))
            .slice(0, 3)
            .map(({ section }) => section);

        const productHits = Array.from(state.products.values())
            .map((product) => {
                const haystack = normalizeText(`${product.name} ${product.category} ${product.section}`);
                return { product, score: scoreText(haystack) };
            })
            .filter(({ score }) => score > 0)
            .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
            .slice(0, 8)
            .map(({ product }) => product);

        return { sections: sectionHits, products: productHits };
    };

    const highlightProductCard = (card) => {
        if (!card) return;
        card.style.outline = '2px solid #00d2fd';
        card.style.outlineOffset = '4px';
        setTimeout(() => {
            card.style.outline = '';
            card.style.outlineOffset = '';
        }, 1800);
    };

    const trackRecentProduct = (productId) => {
        if (!productId) return;
        let recent = JSON.parse(localStorage.getItem('kaioRecent') || '[]');
        recent = recent.filter((id) => id !== productId);
        recent.unshift(productId);
        if (recent.length > 4) recent.pop();
        localStorage.setItem('kaioRecent', JSON.stringify(recent));
    };

    const getRecentProducts = () => {
        const recent = JSON.parse(localStorage.getItem('kaioRecent') || '[]');
        return recent.map(resolveProductSync).filter(Boolean);
    };

    const navigateToProduct = (productId) => {
        const product = resolveProductSync(productId);
        if (!product) return;

        trackRecentProduct(product.id);

        if (product.url === currentPath()) {
            const card = document.getElementById(`product-${product.id}`) || document.querySelector(`[data-product-id="${product.id}"]`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightProductCard(card);
            }
            return;
        }

        window.location.href = `${product.url}?product=${encodeURIComponent(product.id)}`;
    };

    const revealProductFromUrl = () => {
        const productId = new URLSearchParams(window.location.search).get('product');
        if (!productId) return;

        trackRecentProduct(productId);

        const reveal = () => {
            const card = document.getElementById(`product-${productId}`) || document.querySelector(`[data-product-id="${productId}"]`);
            if (!card) return;
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            highlightProductCard(card);
        };

        setTimeout(reveal, 180);
    };

    const decorateOutOfStock = (root = document) => {
        root.querySelectorAll('[data-cart-product]').forEach((button) => {
            const id = button.dataset.cartProduct;
            const product = state.products.get(id);
            if (!product) return;
            const isOut = product.stock != null && Number(product.stock) <= 0;

            button.disabled = isOut;
            button.classList.toggle('opacity-40', isOut);
            button.classList.toggle('cursor-not-allowed', isOut);
            button.setAttribute('aria-disabled', isOut ? 'true' : 'false');

            const card = button.closest('.catalog-card');
            if (!card) return;
            let badge = card.querySelector('.kaio-stock-badge');
            if (isOut) {
                if (!badge) {
                    badge = document.createElement('div');
                    badge.className = 'kaio-stock-badge absolute top-2 left-2 z-10 px-2 py-1 bg-error text-on-error font-headline font-black text-[9px] uppercase tracking-widest';
                    badge.textContent = 'Agotado';
                    const media = card.querySelector('.catalog-card-media') || card;
                    if (getComputedStyle(media).position === 'static') media.style.position = 'relative';
                    media.appendChild(badge);
                }
            } else if (badge) {
                badge.remove();
            }
        });
    };

    const hydratePage = (root = document) => {
        const products = extractProductsFromRoot(root, currentPath(), true);
        injectSorting();
        decorateOutOfStock(root);
        document.dispatchEvent(new CustomEvent('kaio:catalog-hydrated', { detail: { products } }));
        return products;
    };

    window.KAIOCatalog = {
        version: CATALOG_VERSION,
        sections,
        currentPath,
        formatMoney,
        parseMoney,
        normalizeText,
        slugify,
        hydratePage,
        ensureLoaded,
        resolveProduct,
        resolveProductSync,
        getProductById: resolveProductSync,
        getSectionByUrl,
        getSearchResults,
        navigateToProduct,
        highlightProductCard,
        getRecentProducts
    };

    document.addEventListener('DOMContentLoaded', () => {
        hydratePage();
        revealProductFromUrl();
        ensureLoaded();
    });
})();
