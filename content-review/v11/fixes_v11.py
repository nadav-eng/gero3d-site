"""Bug-pass fixes on top of the v11 tree, run after mirror_chrome.py.

Usage: python3 fixes_v11.py <site dir>
- ONE Splint AMAR/FDA statements removed everywhere (EN and HE match; no regulatory claims until confirmed).
- Testimonials: clinical-outcome phrases cut from the quotes as marked excerpts ([…]), same in EN and HE.
- 3D viewer: camera pulls back and up on narrow screens so the color picker doesn't cover the cast.
- width/height on every <img> that lacks them; og:url on every page.
"""
import os, re, sys
from PIL import Image

root = sys.argv[1]
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
def wr(p, s): open(os.path.join(root, p), 'w', encoding='utf-8').write(s)
def sub1(s, old, new, what):
    assert old in s, what
    return s.replace(old, new)

# 1. Regulatory claims
s = rd('index.html')
s, n = re.subn(r'<div class="cert">(?:(?!<div class="cert">).)*?<h3>(?:Israel Ministry of Health|U\.S\. FDA)</h3><p>[^<]*</p></div>', '', s, flags=re.S)
assert n == 2, n
wr('index.html', s)

s = rd('faqs/index.html')
s = s.replace(' The ONE Splint is registered with the Israel Ministry of Health Medical Devices Division (AMAR) and listed with the U.S. FDA.', '')
assert 'AMAR' not in s
wr('faqs/index.html', s)

s = rd('he/3d-printed-cast/index.html')
s = sub1(s, ' ה־<bdi>ONE Splint</bdi> רשום באגף לאביזרים ומכשור רפואי (אמ״ר) של משרד הבריאות ורשום ב־FDA האמריקאי.', '', 'he cast cert')
wr('he/3d-printed-cast/index.html', s)

# 2. Testimonials: excerpts that leave out outcome claims, marked with […]
EN = [
    ("Gero3D technology has delivered exceptional results in our fracture and post-surgery treatments, offering custom-fit comfort that surpasses traditional options. The positive recovery outcomes reflect the patient-centric design and effectiveness of Gero3D's products.",
     "In our fracture and post-surgery treatments, Gero3D technology [offers] custom-fit comfort that surpasses traditional options. […] the patient-centric design […] of Gero3D's products."),
    ("significantly enhanced our patients' recovery experience", "significantly enhanced our patients' […] experience"),
    ("has improved comfort and healing consistency,", "has improved comfort […],"),
    ("which provided convenience and effective healing with minimal restrictions.", "which provided convenience […] with minimal restrictions."),
    ("It was very comfortable, and the pain stopped. I rate my recovery experience 5/5 and highly recommend it to anyone who wants to heal with maximum comfort.",
     "It was very comfortable […]. I rate my […] experience 5/5 and highly recommend it […]."),
]
s = rd('index.html')
for old, new in EN:
    s = sub1(s, old, new, old[:40])
wr('index.html', s)

HE = [
    ('<blockquote>הטכנולוגיה של Gero3D משתלבת היטב בטיפול שלנו בשברים ולאחר ניתוחים, ומציעה התאמה אישית ונוחות שעולות על האפשרויות המסורתיות. רואים כאן עיצוב שבאמת שם את המטופל במרכז.</blockquote>',
     '<blockquote>בטיפול שלנו בשברים ולאחר ניתוחים, הטכנולוגיה של Gero3D [מציעה] התאמה אישית ונוחות שעולות על האפשרויות המסורתיות. […] העיצוב שם את המטופל במרכז […].</blockquote>'),
    ('<blockquote>הגבסים המותאמים אישית של Gero3D שיפרו משמעותית את החוויה של המטופלים שלנו בתקופת הגבס, במיוחד אצל ילדים, שמתמודדים עם האתגרים המוכרים. היכולת להתאים כל גבס למטופל מוסיפה הרבה נוחות, וממחישה את היתרון של טיפול מותאם אישית.</blockquote>',
     '<blockquote>הגבסים המותאמים אישית של Gero3D שיפרו משמעותית את החוויה […] של המטופלים שלנו, במיוחד אצל ילדים שמתמודדים עם האתגרים המוכרים. היכולת להתאים כל גבס שיפרה את הנוחות […], וממחישה את היתרונות של טיפול מותאם אישית.</blockquote>'),
    ('<blockquote>בעבודה עם הטכנולוגיה של Gero3D אני רואה קיבוע טוב ונוחות גבוהה למטופלים בטיפול שלאחר ניתוח. כששברתי את היד בעצמי, חוויתי מקרוב את העיצוב הקל והמאוורר, שהיה נוח מאוד והגביל אותי מעט מאוד ביום־יום.</blockquote>',
     '<blockquote>בעבודה עם הטכנולוגיה של Gero3D ראיתי קיבוע מצוין ונוחות למטופלים בטיפול שלאחר ניתוח. כששברתי את היד בעצמי, חוויתי מקרוב את העיצוב הקל והמאוורר, שהיה נוח […] והגביל אותי מעט מאוד.</blockquote>'),
    ('<blockquote>היה לי מאוד נוח. אני נותנת לחוויה 5 מתוך 5 וממליצה בחום לכל מי שרוצה לעבור את תקופת הגבס בנוחות מקסימלית.</blockquote>',
     '<blockquote>היה לי מאוד נוח […]. אני נותנת לחוויה […] 5 מתוך 5 וממליצה בחום […].</blockquote>'),
]
s = rd('he/index.html')
for old, new in HE:
    s = sub1(s, old, new, old[:40])
wr('he/index.html', s)

# 3. 3D viewer: on narrow canvases pull the camera back and up so the cast clears the color picker
js = rd('assets/js/cast3d.js')
js = sub1(js, '''    camera.aspect = w / h;
    camera.updateProjectionMatrix();''', '''    camera.aspect = w / h;
    // Narrow (phone) viewers: pull back and shift the view down so the cast clears the color picker.
    const narrow = w < 560;
    camera.position.set(0, narrow ? -1.1 : 0, narrow ? 18.5 : 15.5);
    camera.updateProjectionMatrix();''', 'cast3d size')
wr('assets/js/cast3d.js', js)

# 4. Image dimensions and og:url
dims = {}
def size_of(src):
    if src not in dims:
        with Image.open(os.path.join(root, src.lstrip('/'))) as im:
            dims[src] = im.size
    return dims[src]
for dp, _, fs in os.walk(root):
    for f in fs:
        if f != 'index.html' and f != '404.html':
            continue
        p = os.path.relpath(os.path.join(dp, f), root)
        s = rd(p)
        if 'http-equiv="refresh"' in s:
            continue
        def addwh(m):
            tag = m.group(0)
            if 'width=' in tag or 'height=' in tag:
                return tag
            src = re.search(r'src="([^"]+)"', tag).group(1)
            if not src.startswith('/assets/') or src.endswith('.svg'):
                return tag
            w, h = size_of(src)
            return tag.replace('<img ', f'<img width="{w}" height="{h}" ', 1)
        s = re.sub(r'<img [^>]*>', addwh, s)
        can = re.search(r'<link rel="canonical" href="([^"]+)">', s)
        if can and 'property="og:url"' not in s:
            s = s.replace(can.group(0), can.group(0) + f'\n<meta property="og:url" content="{can.group(1)}">', 1)
        wr(p, s)
print('ok', len(dims), 'images sized')
