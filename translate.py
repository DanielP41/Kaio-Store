import re

with open('full.html', 'r', encoding='utf-8') as f:
    html = f.read()

replacements = {
    # Nav
    "Manga &amp; Anime Collectibles": "Figuras Coleccionables de Manga y Anime",
    "Free shipping on orders over $75 / Global express delivery": "Envío gratis en pedidos superiores a $75 / Envío exprés global",
    "SEARCH ARCHIVES...": "BUSCAR EN EL ARCHIVO...",
    '">Manga</a>': '">Manga</a>',
    '">Comics</a>': '">Cómics</a>',
    '">Figures</a>': '">Figuras</a>',
    '">New Arrivals</a>': '">Nuevos Ingresos</a>',
    '">Clothing</a>': '">Indumentaria</a>',
    '">Trading Cards</a>': '">Cartas de Colección</a>',
    '">Sale</a>': '">Ofertas</a>',
    
    # Hero
    "Summer Collection '24": "Colección de Verano '24",
    "BEYOND THE <br />\n          <span class=\"text-primary italic\">STORE</span>": "MÁS ALLÁ DE LA <br />\n          <span class=\"text-primary italic\">TIENDA</span>",
    "Exclusive limited edition releases from the Tokyo Vault. Pre-order the Cyberpunk: Edge series now.": "Lanzamientos exclusivos de edición limitada desde la Bóveda de Tokio. Pre-ordena la serie Cyberpunk: Edge ahora.",
    "Shop Collection": "Ver Colección",
    "View Lookbook": "Ver Lookbook",

    # Categories
    "Core Archive": "Archivo Central",
    "MANGA</h3>": "MANGA</h3>",
    "From classic shonen to underground seinen.": "Desde shonen clásico hasta seinen underground.",
    "EXPLORE ARCHIVE": "EXPLORAR ARCHIVO",
    "FIGURES</h3>": "FIGURAS</h3>",
    "TRADING CARDS</h3>": "CARTAS COLECCIONABLES</h3>",
    "APPAREL</h3>": "INDUMENTARIA</h3>",
    "Techwear &amp; Graphic Tees": "Techwear y Camisetas Gráficas",
    "GAMES</h3>": "JUEGOS</h3>",
    "Strategy &amp; Social": "Estrategia y Social",
    "COLLECTIBLES</h3>": "COLECCIONABLES</h3>",
    "Rare &amp; Exclusive": "Raros y Exclusivos",

    # Featured
    "FEATURED DROPS": "LANZAMIENTOS DESTACADOS",
    "Hand-picked by the curation team": "Seleccionado a mano por el equipo de curación",

    # Arrivals
    "JUST LANDED": "RECIÉN LLEGADOS",
    '">NEW</span>': '">NUEVO</span>',
    "View All Arrivals": "Ver Todos los Ingresos",

    # Promo
    "SUMMER CLEARANCE": "LIQUIDACIÓN DE VERANO",
    "UP TO 60% OFF SELECT ARCHIVES": "HASTA 60% DE DESCUENTO EN ARCHIVOS SELECCIONADOS",
    "ACCESS CLEARANCE": "ACCEDER A LA LIQUIDACIÓN",

    # Newsletter
    "Join the inner circle for early drop access, restock alerts, and exclusive editorial content.": "Únete al círculo íntimo para acceso anticipado, alertas de reposición y contenido editorial exclusivo.",
    "ENTER YOUR EMAIL ARCHIVE...": "INGRESA TU CORREO ELECTRÓNICO...",
    "INITIALIZE PROTOCOL": "INICIAR PROTOCOLO",

    # Footer
    "The ultimate digital vault for\n          high-performance manga, comics, and premium collectibles. Curating the future of aesthetic media.": "La bóveda digital definitiva para\n          manga de alto rendimiento, cómics y figuras de colección premium. Curamos el futuro de la estética visual.",
    "COLLECTIONS</h6>": "COLECCIONES</h6>",
    "Manga Archive": "Archivo de Manga",
    "Figures &amp; Statues": "Figuras y Estatuas",
    "Apparel &amp; Techwear": "Indumentaria y Techwear",
    "TCG Hub": "Centro TCG",
    "INTEL</h6>": "INFORMACIÓN</h6>",
    "Shipping Protocol": "Protocolo de Envío",
    "Returns &amp; Defects": "Devoluciones y Arrepentimiento",
    "Privacy Matrix": "Política de Privacidad",
    "Terms of Service": "Términos de Servicio",
    "LOCATION / HQ": "UBICACIÓN",
    "ALL RIGHTS RESERVED": "TODOS LOS DERECHOS RESERVADOS",
    "The Vault (Discord)": "La Bóveda (Discord)",
    "Twitter/X": "Twitter/X",
    "Instagram Feed": "Feed de Instagram",
    "Contact HQ": "Contacto HQ",

    # Mobile Nav
    "<span>Home</span>": "<span>Inicio</span>",
    "<span>Shop</span>": "<span>Tienda</span>",
    "<span>Wishlist</span>": "<span>Deseos</span>",
    "<span>Cart</span>": "<span>Carrito</span>"
}

for k, v in replacements.items():
    html = html.replace(k, v)

# Regex replacements for multi-line formatting
html = re.sub(
    r"STAY IN THE\s*<br />\s*<span class=\"text-secondary italic\">LOOP\.</span>",
    r"MANTENTE AL <br />\n              <span class=\"text-secondary italic\">DÍA.</span>",
    html
)
html = re.sub(
    r"The ultimate digital vault for\s*high-performance manga, comics, and premium collectibles. Curating the future of aesthetic media.",
    r"La bóveda digital definitiva para manga de alto rendimiento, cómics y figuras de colección premium. Curamos el futuro de la estética visual.",
    html
)

with open('full.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("Translation applied successfully!")
