/* Kaio-Store smoke checks (no dependencies) */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FILES = [
  'full.html',
  'manga.html',
  'comics.html',
  'figuras.html',
  'indumentaria.html',
  'nuevos-ingresos.html',
  'ofertas.html',
  'tcg.html',
  'videojuegos.html',
  'wishlist.html',
  'code.html',
  'components/header.html',
  'components/footer.html',
  'js/catalog.js',
  'js/cart.js',
  'js/ui.js',
  'js/checkout.js',
  'js/products-data.js'
];

const BROKEN_TOKENS = ['Ã', 'Â', 'â€”', 'â€¢', 'â€œ', 'â€', '�'];
const REQUIRED_ASSETS = [
  'category-images/tcg-pokemon-card.webp',
  'category-images/tcg-digimon-card.webp',
  'category-images/tcg-yugioh-card.webp',
  'category-images/tcg-onepiece-card.webp',
  'category-images/tcg-magic-card.webp',
  'category-images/tcg-accesorios.svg'
];

let failed = false;

const fail = (msg) => {
  failed = true;
  console.error(`FAIL: ${msg}`);
};

const ok = (msg) => console.log(`OK: ${msg}`);

FILES.forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`Missing file ${rel}`);
    return;
  }

  const content = fs.readFileSync(abs, 'utf8');
  const found = BROKEN_TOKENS.find((token) => content.includes(token));
  if (found) {
    fail(`Encoding token "${found}" found in ${rel}`);
  } else {
    ok(`Encoding clean ${rel}`);
  }
});

REQUIRED_ASSETS.forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(`Missing asset ${rel}`);
  } else {
    ok(`Asset present ${rel}`);
  }
});

const tcg = fs.readFileSync(path.join(ROOT, 'tcg.html'), 'utf8');
if (!tcg.includes('id="tcgFilterChips"') || !tcg.includes('data-tcg-card')) {
  fail('TCG filter wiring incomplete in tcg.html');
} else {
  ok('TCG filter wiring looks complete');
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('Smoke check passed');
}
