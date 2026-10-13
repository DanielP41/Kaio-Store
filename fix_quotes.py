import glob, re

files_to_fix = ['videojuegos.html', 'manga.html', 'indumentaria.html', 'tcg.html', 'comics.html', 'figuras.html']

for fn in files_to_fix:
    try:
        with open(fn, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        # Replace curly/typographic quotes with straight quotes
        content = content.replace('\u201c', '"').replace('\u201d', '"')
        content = content.replace('\u2018', "'").replace('\u2019', "'")
        
        if content != original:
            with open(fn, 'w', encoding='utf-8') as f:
                f.write(content)
            # Count replacements
            count = original.count('\u201c') + original.count('\u201d') + original.count('\u2018') + original.count('\u2019')
            print(f'FIXED {fn}: replaced {count} curly quotes')
        else:
            print(f'OK: {fn} (no curly quotes)')
    except Exception as e:
        print(f'ERROR in {fn}: {e}')
