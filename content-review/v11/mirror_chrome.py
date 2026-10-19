"""Bilingual chrome for the EN/HE mirror (v11), applied to a full site tree.

Usage: python3 mirror_chrome.py <site dir>
- Header nav and footer in the page's own language (Hebrew pages get Hebrew menus pointing to /he/ pages).
- Language switch in the header nav, linking to the same page in the other language.
- hreflang en/he/x-default on every page that has a pair.
- Sitemap entries for every page in both languages.
"""
import os, re, sys

root = sys.argv[1]
def path(p): return os.path.join(root, p.strip('/'), 'index.html') if p != '/' else os.path.join(root, 'index.html')
def exists(p): return os.path.exists(path(p))
def rd(p): return open(path(p), encoding='utf-8').read()
def wr(p, s): open(path(p), 'w', encoding='utf-8').write(s)

# English path -> Hebrew path
PAIRS = {
    '/': '/he/',
    '/clinics/': '/he/clinics/',
    '/clinics/thanks/': '/he/clinics/thanks/',
    '/patients/': '/he/patients/',
    '/faqs/': '/he/faqs/',
    '/blog/': '/he/blog/',
    '/3d-printed-cast/': '/he/3d-printed-cast/',
    '/3d-printed-afo/': '/he/3d-printed-afo/',
    '/3d-printed-splint/': '/he/3d-printed-splint/',
    '/revolutionizing-orthopedic-care-the-future-of-3d-printed-casts/': '/he/revolutionizing-orthopedic-care-the-future-of-3d-printed-casts/',
    '/top-5-benefits-of-using-3d-printed-casts-for-faster-recovery/': '/he/top-5-benefits-of-using-3d-printed-casts-for-faster-recovery/',
    '/privacy/': '/he/privacy/',
    '/terms-of-use/': '/he/terms/',
}
PAIRS = {en: he for en, he in PAIRS.items() if exists(en) and exists(he)}
OTHER = {**PAIRS, **{he: en for en, he in PAIRS.items()}}

NAV = {
    'en': [('/clinics/', 'For clinics'), ('/#platform', 'Platform'), ('/#casts', 'Products'), ('/#standards', 'Standards'),
           ('/patients/', 'Patients'), ('/faqs/', 'FAQs'), ('/blog/', 'Blog')],
    'he': [('/he/clinics/', 'לקליניקות'), ('/he/#platform', 'הפלטפורמה'), ('/he/#casts', 'מוצרים'), ('/he/#standards', 'תקנים'),
           ('/he/patients/', 'מטופלים'), ('/he/faqs/', 'שאלות נפוצות'), ('/he/blog/', 'בלוג')],
}
CTA = {'en': ('/clinics/#demo', 'Book a demo'), 'he': ('/he/clinics/#demo', 'לתיאום הדגמה')}
FOOT = {
    'en': [('/clinics/', 'For clinics'), ('/3d-printed-cast/', '3D-printed cast'), ('/3d-printed-afo/', '3D-printed AFO'),
           ('/3d-printed-splint/', '3D-printed splint'), ('/patients/', 'Patients'), ('/faqs/', 'FAQs'), ('/blog/', 'Blog'),
           ('https://www.linkedin.com/company/gero3d', 'LinkedIn'), ('/privacy/', 'Privacy'), ('/terms-of-use/', 'Terms')],
    'he': [('/he/clinics/', 'לקליניקות'), ('/he/3d-printed-cast/', 'גבס מודפס בתלת מימד'), ('/he/3d-printed-afo/', 'AFO מודפס בתלת מימד'),
           ('/he/3d-printed-splint/', 'סד מודפס בתלת מימד'), ('/he/patients/', 'מטופלים'), ('/he/faqs/', 'שאלות נפוצות'), ('/he/blog/', 'בלוג'),
           ('https://www.linkedin.com/company/gero3d', 'LinkedIn'), ('/he/privacy/', 'פרטיות'), ('/he/terms/', 'תנאי שימוש')],
}

def link(href, text, here, extra=''):
    cur = ' aria-current="page"' if href == here else ''
    rel = ' rel="noopener"' if href.startswith('http') else ''
    return f'<a href="{href}"{cur}{rel}{extra}>{text}</a>'

def header_nav(lang, here):
    items = ''.join(link(h, t, here) for h, t in NAV[lang])
    other = OTHER.get(here)
    if other:
        if lang == 'en':
            items += f'<a class="lang-switch" href="{other}" hreflang="he" lang="he" aria-label="עברית">עב</a>'
        else:
            items += f'<a class="lang-switch" href="{other}" hreflang="en" lang="en" aria-label="English">EN</a>'
    h, t = CTA[lang]
    d = ' dir="rtl"' if lang == 'he' else ''
    return f'<nav class="nav" id="nav" aria-label="{"ראשי" if lang == "he" else "Main"}"{d}>{items}<a class="btn btn-primary" href="{h}">{t}</a></nav>'

def footer_nav(lang, here):
    items = ''.join(link(h, t, here) for h, t in FOOT[lang] if h.startswith('http') or exists(h.split('#')[0]))
    d = ' dir="rtl"' if lang == 'he' else ''
    return f'<nav aria-label="{"ניווט תחתון" if lang == "he" else "Footer"}"{d}>\n      {items}\n    </nav>'

def hreflang(en, he):
    return (f'<link rel="alternate" hreflang="en" href="https://gero3d.com{en}">\n'
            f'<link rel="alternate" hreflang="he" href="https://gero3d.com{he}">\n'
            f'<link rel="alternate" hreflang="x-default" href="https://gero3d.com{en}">\n')

# Google Analytics 4. Consent Mode: analytics cookies are off by default in the EEA, UK and Switzerland
# (Google then receives only cookieless pings); ads storage is off everywhere.
EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','LI','NO','GB','CH']
GA = ("<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-2FGEH6HE0B\"></script>\n"
      "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}\n"
      "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',region:" + str(EU).replace(' ', '') + "});\n"
      "gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});\n"
      "gtag('js',new Date());gtag('config','G-2FGEH6HE0B');</script>\n")

# Privacy policy: describe the analytics now in use.
PRIV = {
    '/privacy/': ('<p>The site itself sets no cookies. We don\'t use analytics or advertising tracking today. If we decide to add analytics, we will update this policy before we do.</p>',
                  '<p>We use Google Analytics to understand how the site is used: which pages are visited, roughly from which country, and on what kind of device. Google Analytics sets cookies for this and the data is processed by Google; see <a href="https://policies.google.com/privacy" rel="noopener">Google\'s privacy policy</a>. Visitors from the European Economic Area, the UK and Switzerland are measured without analytics cookies. We don\'t use advertising tracking, and we don\'t use analytics data to identify you.</p>'),
    '/he/privacy/': ('<p>האתר עצמו לא שומר עוגיות (cookies). כרגע אין באתר כלי אנליטיקה ואין מעקב פרסומי. אם נחליט להוסיף כלי אנליטיקה, נעדכן את המדיניות הזו לפני כן.</p>',
                     '<p>אנחנו משתמשים ב-Google Analytics כדי להבין איך משתמשים באתר: באילו עמודים מבקרים, בערך מאיזו מדינה ומאיזה סוג מכשיר. לשם כך Google Analytics שומר עוגיות (cookies), והמידע מעובד אצל Google; פרטים ב<a href="https://policies.google.com/privacy?hl=iw" rel="noopener">מדיניות הפרטיות של Google</a>. מבקרים מהאזור הכלכלי האירופי, מבריטניה ומשווייץ נמדדים בלי עוגיות אנליטיקה. אין באתר מעקב פרסומי, ואנחנו לא משתמשים בנתוני האנליטיקה כדי לזהות אתכם.</p>'),
}
for p_, (old, new) in PRIV.items():
    t = rd(p_)
    if old in t:
        wr(p_, t.replace(old, new))
    else:
        assert new in t, p_

pages = []
for dp, _, fs in os.walk(root):
    if 'index.html' in fs:
        rel = '/' + os.path.relpath(dp, root).replace(os.sep, '/') + '/'
        pages.append('/' if rel == '/./' else rel)

done = []
for p in sorted(pages):
    s = rd(p)
    if 'http-equiv="refresh"' in s:  # redirect stubs
        continue
    lang = 'he' if re.search(r'<html lang="he"', s) else 'en'
    s, n1 = re.subn(r'<nav class="nav" id="nav".*?</nav>', lambda m: header_nav(lang, p), s, count=1, flags=re.S)
    s, n2 = re.subn(r'<nav aria-label="(?:Footer|ניווט תחתון)"[^>]*>.*?</nav>', lambda m: footer_nav(lang, p), s, count=1, flags=re.S)
    assert n1 == 1 and n2 == 1, p
    # The header language switch replaces the per-page "English / עברית" links in the page labels.
    s = re.sub(r' · <a href="[^"]+" lang="(?:en|he)">(?:English|עברית|בעברית)</a>(</p>)', r'\1', s)
    if lang == 'he':
        s = s.replace('href="/#video"', 'href="/he/#video"')
        if p == '/he/clinics/thanks/':
            s = s.replace('<a class="btn btn-primary" href="/">', '<a class="btn btn-primary" href="/he/">')
        s = s.replace('<a class="skip" href="#main">Skip to content</a>', '<a class="skip" href="#main">דלג לתוכן</a>')
        s = s.replace('class="brand" href="/" aria-label="Gero3D home"', 'class="brand" href="/he/" aria-label="Gero3D, דף הבית"')
        s = s.replace('<a href="/" aria-label="Gero3D home"><img src="/assets/img/logo-on-dark.svg"', '<a href="/he/" aria-label="Gero3D, דף הבית"><img src="/assets/img/logo-on-dark.svg"')
        s = s.replace('aria-label="Menu"', 'aria-label="תפריט"')
    if p in OTHER:
        en, he = (p, OTHER[p]) if lang == 'en' else (OTHER[p], p)
        s = re.sub(r'<link rel="alternate" hreflang="[^"]+" href="[^"]+">\n?', '', s)
        s = s.replace('</head>', hreflang(en, he) + '</head>', 1)
    if 'googletagmanager.com/gtag' not in s:
        s = s.replace('</head>', GA + '</head>', 1)
    s = s.replace('<meta name="gero-site-version" content="v10">', '<meta name="gero-site-version" content="v11">')
    wr(p, s)
    done.append((p, lang))

# CSS for the language switch
css = os.path.join(root, 'assets/css/site.css')
c = open(css, encoding='utf-8').read()
if '.lang-switch' not in c:
    c += '''
/* Language switch (EN / עב) */
.nav .lang-switch { font-size: 13px; font-weight: 500; letter-spacing: .04em; padding: 4px 10px; border: 1px solid rgba(26,26,26,.18); border-radius: 999px; }
.nav .lang-switch:hover { border-color: var(--gero-blue); }
[dir="rtl"] .label { letter-spacing: .02em; }
@media (max-width: 860px) { .nav .lang-switch { border: 0; border-bottom: 1px solid rgba(26,26,26,.07); border-radius: 0; padding: 12px 0; font-size: 17px; } }
'''
    open(css, 'w', encoding='utf-8').write(c)

# Sitemap: every indexable page, both languages, with hreflang alternates
sm_urls = []
for p, lang in done:
    s = rd(p)
    if re.search(r'<meta name="robots" content="[^"]*noindex', s):
        continue
    sm_urls.append(p)
def entry(p):
    alt = ''
    if p in OTHER:
        en, he = (p, OTHER[p]) if not p.startswith('/he/') else (OTHER[p], p)
        alt = (f'<xhtml:link rel="alternate" hreflang="en" href="https://gero3d.com{en}"/>'
               f'<xhtml:link rel="alternate" hreflang="he" href="https://gero3d.com{he}"/>')
    return f'<url><loc>https://gero3d.com{p}</loc><lastmod>2026-10-19</lastmod>{alt}</url>'
sm = ('<?xml version="1.0" encoding="UTF-8"?>\n'
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
      + '\n'.join(entry(p) for p in sm_urls) + '\n</urlset>\n')
open(os.path.join(root, 'sitemap.xml'), 'w', encoding='utf-8').write(sm)
print(len(done), 'pages;', len(PAIRS), 'pairs;', len(sm_urls), 'sitemap urls')
for p, lang in done: print(lang, p, '<->', OTHER.get(p, '-'))
