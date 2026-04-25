import os

html_dir = os.path.join('Frontend', 'HTML')
for f in os.listdir(html_dir):
    if f.endswith('.html'):
        p = os.path.join(html_dir, f)
        with open(p, 'r') as file:
            content = file.read()
        
        content = content.replace('href="/HTML/home.html"', 'href="/home"')
        content = content.replace('href="/HTML/account.html"', 'href="/account"')
        content = content.replace('href="/HTML/policy.html"', 'href="/policy"')
        content = content.replace('href="/HTML/fraudness.html"', 'href="/fraud-fairness"')
        content = content.replace('href="/HTML/company.html"', 'href="/company"')
        content = content.replace('href="/HTML/login.html"', 'href="/login"')
        content = content.replace('href="/HTML/register.html"', 'href="/register"')
        
        with open(p, 'w') as file:
            file.write(content)

print("HTML links patched!")
