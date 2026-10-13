import re

# Fix the videojuegos hero banner visibility
with open('videojuegos.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Increase opacity and brightness of hero image
content = content.replace(
    'opacity: .78;\n            filter: saturate(1.15) brightness(0.74) contrast(1.06);',
    'opacity: .92;\n            filter: saturate(1.2) brightness(0.88) contrast(1.08);'
)

# Fix God of War title (remove any remaining corrupted chars)
content = content.replace('God of War Ragnar\xf6k', 'God of War Ragnar\xf6k')  # ö = \xf6
# Fix PS5 DualSense dash
content = content.replace('PS5 DualSense \xe2\x80\x93 Midnight Black', 'PS5 DualSense \u2014 Midnight Black')
content = content.replace('Steam Deck OLED \xe2\x80\x93 512GB', 'Steam Deck OLED \u2014 512GB')

# Also fix the catalog-card-label "Accessories" to Spanish
content = content.replace('>Accessories<', '>Accesorios<')
content = content.replace('>Multiplatform<', '>Multiplataforma<')
content = content.replace('>Handheld<', '>Portátil<')

with open('videojuegos.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")

# Verify brightness fix
if 'brightness(0.88)' in content:
    print("Brightness fixed to 0.88")
elif 'brightness(0.74)' in content:
    print("WARNING: brightness still 0.74")
else:
    print("Brightness value:", re.search(r'brightness\([^)]+\)', content))

# Verify Spanish accessories
print("Accesorios found:", '>Accesorios<' in content)
print("Multiplataforma found:", '>Multiplataforma<' in content)
