import os

html_dir = os.path.join('Frontend', 'HTML')
for f in os.listdir(html_dir):
    if f.endswith('.html'):
        p = os.path.join(html_dir, f)
        with open(p, 'r') as file:
            content = file.read()
        if 'api.js' not in content and 'routes.js' in content:
            content = content.replace('<script src="../JS/routes.js"></script>', '<script src="../JS/api.js"></script>\n    <script src="../JS/routes.js"></script>')
            with open(p, 'w') as file:
                file.write(content)
print("Done patching HTML")
