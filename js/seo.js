/* Kaio-Store — SEO module
   Inyecta meta tags, Open Graph, Twitter Card y JSON-LD estructurado
   según la página, y agrega schema Product cuando hay catálogo cargado. */
(() => {
    const SITE_NAME = 'KAIO-STORE';
    const SITE_DESCRIPTION = 'Tienda de manga, comics, figuras coleccionables, TCG y videojuegos. Despacho a todo el país.';
    const SITE_URL = window.location.origin;
    const DEFAULT_IMAGE = `${SITE_URL}/Gemini_Generated_Image_jusd0qjusd0qjusd.png`;

    // Descripciones por página. La key es el filename (location.pathname.split('/').pop()).
    const PAGE_META = {
        'full.html':           { title: 'KAIO-STORE | Manga, Comics, Figuras y Coleccionables', description: 'Catálogo curado de manga, comics, figuras coleccionables, TCG (Pokémon, Magic, Yu-Gi-Oh!, One Piece) y videojuegos. Envío a todo el país.', section: 'home' },
        'manga.html':          { title: 'Manga | KAIO-STORE', description: 'Manga shōnen, seinen, shōjo y josei. Las últimas novedades y clásicos en stock con envío inmediato.', section: 'manga' },
        'comics.html':         { title: 'Cómics | KAIO-STORE', description: 'Cómics DC, Marvel, novelas gráficas y ediciones especiales. Tapa dura, tapa blanda y omnibus.', section: 'comics' },
        'figuras.html':        { title: 'Figuras Coleccionables | KAIO-STORE', description: 'Figuras y estatuas de anime, manga y videojuegos. Originales con caja, escala 1/6 y 1/7, prepainted.', section: 'figuras' },
        'tcg.html':            { title: 'Centro TCG | KAIO-STORE', description: 'Cartas TCG: Pokémon, Magic, Yu-Gi-Oh!, One Piece, Digimon y Riftbound. Booster boxes, sobres sueltos y singles.', section: 'tcg' },
        'videojuegos.html':    { title: 'Videojuegos y Consolas | KAIO-STORE', description: 'Juegos físicos, consolas y accesorios para PlayStation, Nintendo, Xbox y PC.', section: 'videojuegos' },
        'indumentaria.html':   { title: 'Indumentaria Anime y Streetwear | KAIO-STORE', description: 'Hoodies, remeras, techwear y accesorios inspirados en manga, anime y cultura otaku.', section: 'indumentaria' },
        'nuevos-ingresos.html': { title: 'Nuevos Ingresos | KAIO-STORE', description: 'Lo último en llegar a la bóveda: lanzamientos recientes de manga, comics, figuras y TCG.', section: 'nuevos' },
        'ofertas.html':        { title: 'Ofertas y Descuentos | KAIO-STORE', description: 'Productos seleccionados con descuentos especiales. Stock limitado.', section: 'ofertas' },
        'wishlist.html':       { title: 'Mis Favoritos | KAIO-STORE', description: 'Tus productos favoritos guardados para comprar después.', section: 'wishlist' },
        'legales.html':        { title: 'Términos y Condiciones | KAIO-STORE', description: 'Términos de servicio y política de privacidad.', section: 'legales' },
        'code.html':           { title: 'Checkout | KAIO-STORE', description: 'Finalizá tu compra de forma segura.', section: 'checkout' }
    };

    const currentPageKey = () => {
        const filename = window.location.pathname.split('/').pop() || 'full.html';
        return filename === '' || filename === 'index.html' ? 'full.html' : filename;
    };

    const upsertMeta = (selector, attrs) => {
        let el = document.head.querySelector(selector);
        if (!el) {
            el = document.createElement('meta');
            document.head.appendChild(el);
        }
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
    };

    const upsertLink = (rel, href) => {
        let el = document.head.querySelector(`link[rel="${rel}"]`);
        if (!el) {
            el = document.createElement('link');
            el.setAttribute('rel', rel);
            document.head.appendChild(el);
        }
        el.setAttribute('href', href);
    };

    const injectJsonLd = (id, data) => {
        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('script');
            el.type = 'application/ld+json';
            el.id = id;
            document.head.appendChild(el);
        }
        el.textContent = JSON.stringify(data);
    };

    const injectBaseSeo = () => {
        const meta = PAGE_META[currentPageKey()] || PAGE_META['full.html'];
        const url = window.location.origin + window.location.pathname;

        // Solo seteamos title si la página no tiene uno custom (todas tienen, pero por las dudas).
        if (!document.title || document.title === 'Kaio-Store') {
            document.title = meta.title;
        }

        upsertMeta('meta[name="description"]', { name: 'description', content: meta.description });
        upsertMeta('meta[name="keywords"]', { name: 'keywords', content: 'manga, comics, anime, figuras, tcg, pokemon, yu-gi-oh, magic, videojuegos, kaio store' });
        upsertMeta('meta[name="theme-color"]', { name: 'theme-color', content: '#ff906a' });
        upsertMeta('meta[name="robots"]', { name: 'robots', content: meta.section === 'wishlist' || meta.section === 'checkout' ? 'noindex, follow' : 'index, follow' });

        // Open Graph
        upsertMeta('meta[property="og:type"]', { property: 'og:type', content: meta.section === 'home' ? 'website' : 'website' });
        upsertMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
        upsertMeta('meta[property="og:title"]', { property: 'og:title', content: meta.title });
        upsertMeta('meta[property="og:description"]', { property: 'og:description', content: meta.description });
        upsertMeta('meta[property="og:url"]', { property: 'og:url', content: url });
        upsertMeta('meta[property="og:image"]', { property: 'og:image', content: DEFAULT_IMAGE });
        upsertMeta('meta[property="og:locale"]', { property: 'og:locale', content: 'es_AR' });

        // Twitter Card
        upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
        upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: meta.title });
        upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: meta.description });
        upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: DEFAULT_IMAGE });

        // Canonical (evita contenido duplicado entre / y /index.html)
        upsertLink('canonical', url);

        // JSON-LD del sitio
        injectJsonLd('ld-website', {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: SITE_NAME,
            url: SITE_URL,
            potentialAction: {
                '@type': 'SearchAction',
                target: `${SITE_URL}/full.html?q={search_term_string}`,
                'query-input': 'required name=search_term_string'
            }
        });

        injectJsonLd('ld-org', {
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            url: SITE_URL,
            image: DEFAULT_IMAGE
        });
    };

    // Inyecta JSON-LD ItemList con todos los productos visibles en la página actual.
    // Se invoca cuando catalog.js dispara `kaio:catalog-hydrated`.
    const injectProductList = () => {
        const products = window.KAIOCatalog ? Array.from(document.querySelectorAll('.catalog-card[data-product-id]')) : [];
        if (!products.length) return;

        const items = products.slice(0, 30).map((card, index) => {
            const id = card.dataset.productId;
            const product = window.KAIOCatalog?.getProductById?.(id);
            if (!product) return null;
            return {
                '@type': 'ListItem',
                position: index + 1,
                item: {
                    '@type': 'Product',
                    '@id': `${SITE_URL}/${product.url}?product=${encodeURIComponent(id)}`,
                    name: product.name,
                    image: product.img?.startsWith('http') ? product.img : `${SITE_URL}/${product.img}`,
                    category: product.category || undefined,
                    offers: {
                        '@type': 'Offer',
                        price: Number(product.priceNum || 0).toFixed(2),
                        priceCurrency: 'ARS',
                        availability: (product.stock != null && product.stock <= 0)
                            ? 'https://schema.org/OutOfStock'
                            : 'https://schema.org/InStock',
                        url: `${SITE_URL}/${product.url}?product=${encodeURIComponent(id)}`
                    }
                }
            };
        }).filter(Boolean);

        if (!items.length) return;

        injectJsonLd('ld-itemlist', {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            itemListElement: items
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectBaseSeo);
    } else {
        injectBaseSeo();
    }
    document.addEventListener('kaio:catalog-hydrated', injectProductList);
})();
