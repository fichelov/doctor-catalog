# -*- coding: utf-8 -*-
"""Генерация обложек продуктов (SVG) и иконок PWA (PNG) для приложения «Приложение для врачей»."""

import os
from PIL import Image, ImageDraw, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COVERS = os.path.join(BASE, 'assets', 'covers')
ICONS = os.path.join(BASE, 'icons')
os.makedirs(COVERS, exist_ok=True)
os.makedirs(ICONS, exist_ok=True)

CAT = {
    'standard':       ('#14958C', '#0A6059', 'СТАНДАРТ'),
    'antireflux':     ('#D08A46', '#8F5524', 'АНТИРЕФЛЮКС'),
    'hypoallergenic': ('#5A8DB4', '#2F5B7E', 'ГИПОАЛЛЕРГЕННЫЙ'),
    'therapeutic':    ('#9668B4', '#5E3D77', 'ЛЕЧЕБНЫЙ'),
    'lactosefree':    ('#6F7C86', '#3F4A52', 'БЕЗ ЛАКТОЗЫ'),
    'preterm':        ('#4A9C8B', '#22665A', 'ДЛЯ НЕДОНОШЕННЫХ'),
    'fermented':      ('#BC6E59', '#7C4232', 'КИСЛОМОЛОЧНЫЙ'),
    'special':        ('#B8933B', '#7A5E1C', 'СПЕЦИАЛЬНЫЙ'),
}

PRODUCTS = [
    ('ntl-1', 'standard', '0–6 МЕС'), ('ntl-2', 'standard', '6–12 МЕС'),
    ('ntl-3', 'standard', '12–36 МЕС'),
    ('ntl-ar-1', 'antireflux', '0–6 МЕС'), ('ntl-ar-2', 'antireflux', '6–12 МЕС'),
    ('ntl-ar-komfort', 'antireflux', '0–12 МЕС'),
    ('ntl-ga-1', 'hypoallergenic', '0–6 МЕС'), ('ntl-ga-2', 'hypoallergenic', '6–12 МЕС'),
    ('ntl-ga-pepti-1', 'hypoallergenic', '0–6 МЕС'), ('ntl-ga-pepti-2', 'hypoallergenic', '6–12 МЕС'),
    ('ntl-pepti-elemental', 'therapeutic', '0–12 МЕС'), ('ntl-amino', 'therapeutic', '0–12 МЕС'),
    ('ntl-pepti-3', 'therapeutic', '12–24 МЕС'),
    ('ntl-bl', 'lactosefree', '0–12 МЕС'), ('ntl-nl', 'lactosefree', '0–24 МЕС'),
    ('ntl-neo-pre', 'preterm', '0–6 МЕС'), ('ntl-neo-70', 'preterm', '0–12 МЕС'),
    ('ntl-neo-post', 'preterm', '0–12 МЕС'),
    ('ntl-km-1', 'fermented', '0–6 МЕС'), ('ntl-km-2', 'fermented', '6–12 МЕС'),
    ('ntl-soy-1', 'special', '0–6 МЕС'), ('ntl-soy-2', 'special', '6–12 МЕС'),
    ('ntl-antikolik', 'special', '0–6 МЕС'), ('ntl-lactation', 'special', 'ДЛЯ МАМ'),
]

MOTIF = {
    'standard': '<circle cx="742" cy="360" r="118" fill="none" stroke="#ffffff" stroke-opacity=".16" stroke-width="14"/>'
                '<circle cx="742" cy="360" r="64" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="12"/>',
    'antireflux': '<path d="M560 470c40 0 40-34 80-34s40 34 80 34 40-34 80-34" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="14" stroke-linecap="round"/>'
                  '<path d="M560 520c40 0 40-34 80-34s40 34 80 34 40-34 80-34" fill="none" stroke="#ffffff" stroke-opacity=".13" stroke-width="14" stroke-linecap="round"/>',
    'hypoallergenic': '<path d="M742 236l92 38v74c0 58-40 96-92 114-52-18-92-56-92-114v-74z" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="13" stroke-linejoin="round"/>'
                      '<path d="M700 348l30 30 56-56" fill="none" stroke="#ffffff" stroke-opacity=".23" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>',
    'therapeutic': '<path d="M742 254v132M676 320h132" stroke="#ffffff" stroke-opacity=".20" stroke-width="26" stroke-linecap="round"/>',
    'lactosefree': '<path d="M742 240c46 52 74 90 74 122a74 74 0 01-148 0c0-32 28-70 74-122z" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="13"/>',
    'preterm': '<path d="M742 470s-86-52-86-112a50 50 0 0186-30 50 50 0 0186 30c0 60-86 112-86 112z" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="13" stroke-linejoin="round"/>',
    'fermented': '<path d="M640 470c0-96 62-160 160-166 0 104-70 166-160 166z" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="13" stroke-linejoin="round"/>'
                 '<path d="M646 466c44-64 84-96 132-118" fill="none" stroke="#ffffff" stroke-opacity=".15" stroke-width="10" stroke-linecap="round"/>',
    'special': '<path d="M742 242l30 66 72 8-54 50 15 72-63-37-63 37 15-72-54-50 72-8z" fill="none" stroke="#ffffff" stroke-opacity=".20" stroke-width="13" stroke-linejoin="round"/>',
}

SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 675" width="900" height="675" role="img" aria-label="{label}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0" stop-color="{c1}"/>
      <stop offset="1" stop-color="{c2}"/>
    </linearGradient>
    <linearGradient id="can" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.55" stop-color="#F7F8F7"/>
      <stop offset="1" stop-color="#E9EDEC"/>
    </linearGradient>
    <linearGradient id="label" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity=".28"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="20" stdDeviation="20" flood-color="#08201F" flood-opacity="0.22"/>
    </filter>
  </defs>

  <rect width="900" height="675" fill="url(#bg)"/>
  <circle cx="790" cy="96" r="210" fill="#ffffff" opacity="0.10"/>
  <circle cx="96" cy="604" r="240" fill="#ffffff" opacity="0.08"/>
  {motif}

  <text x="62" y="84" font-family="Arial, Helvetica, sans-serif" font-size="15" letter-spacing="5" fill="#ffffff" opacity="0.86">{cat}</text>

  <ellipse cx="450" cy="556" rx="152" ry="24" fill="#08201F" opacity="0.16"/>

  <g filter="url(#soft)">
    <rect x="352" y="152" width="196" height="352" rx="34" fill="url(#can)"/>
    <rect x="352" y="152" width="196" height="352" rx="34" fill="url(#label)"/>
    <rect x="372" y="168" width="156" height="14" rx="7" fill="#DFE4E2"/>
    <rect x="352" y="248" width="196" height="118" fill="{c1}"/>
    <rect x="352" y="248" width="196" height="118" fill="#ffffff" opacity="0.12"/>
    <g fill="#ffffff">
      <rect x="436" y="252" width="28" height="110" rx="7"/>
      <rect x="402" y="293" width="96" height="28" rx="7"/>
    </g>
    <text x="450" y="404" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#6B7C7B">ДЛЯ ВРАЧЕЙ</text>
    <text x="450" y="432" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12" letter-spacing="2" fill="#9AA8A6">{age}</text>
  </g>

  <text x="62" y="628" font-family="Arial, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#ffffff" opacity="0.72">{idx} · {age}</text>
</svg>
'''

for i, (pid, cat, age) in enumerate(PRODUCTS, start=1):
    c1, c2, label = CAT[cat]
    svg = SVG.format(c1=c1, c2=c2, cat=label, motif=MOTIF[cat], age=age,
                     idx=f'{i:02d}', label=f'{pid}')
    with open(os.path.join(COVERS, pid + '.svg'), 'w', encoding='utf-8') as f:
        f.write(svg)

print('covers:', len(PRODUCTS))


# ---------- иконки ----------
def gradient(size, top, bottom):
    img = Image.new('RGB', (size, size), top)
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / max(1, size - 1)
        r = int(top[0] + (bottom[0] - top[0]) * t)
        g = int(top[1] + (bottom[1] - top[1]) * t)
        b = int(top[2] + (bottom[2] - top[2]) * t)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    return img


def rounded_mask(size, radius):
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def font_path(bold=True):
    names = ['georgiab.ttf', 'georgia.ttf'] if not bold else ['georgiab.ttf', 'arialbd.ttf']
    for n in names:
        p = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', n)
        if os.path.exists(p):
            return p
    return os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', 'arial.ttf')


def make_icon(path, size, pad_ratio=0.0, radius_ratio=0.22):
    pad = int(size * pad_ratio)
    inner = size - 2 * pad
    img = gradient(inner, (26, 150, 141), (10, 84, 80))
    # декоративное свечение
    glow = Image.new('RGBA', (inner, inner), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([-inner * 0.3, -inner * 0.45, inner * 0.75, inner * 0.55], fill=(255, 255, 255, 26))
    img = img.convert('RGBA')
    img.alpha_composite(glow)

    # кольцо + медицинский крест
    d = ImageDraw.Draw(img)
    ring_w = max(2, int(inner * 0.022))
    margin = int(inner * 0.20)
    d.ellipse([margin, margin, inner - margin, inner - margin],
              outline=(255, 255, 255, 90), width=ring_w)
    bar = int(inner * 0.15)
    length = int(inner * 0.50)
    cx = inner // 2
    r = max(3, bar // 2)
    d.rounded_rectangle([cx - bar // 2, cx - length // 2, cx + bar // 2, cx + length // 2],
                        radius=r, fill=(255, 255, 255, 255))
    d.rounded_rectangle([cx - length // 2, cx - bar // 2, cx + length // 2, cx + bar // 2],
                        radius=r, fill=(255, 255, 255, 255))

    if pad:
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        canvas.alpha_composite(img, (pad, pad))
        img = canvas

    if radius_ratio and not pad:
        mask = rounded_mask(size, int(size * radius_ratio))
        out = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), mask)
        out.save(path)
    else:
        img.save(path)


make_icon(os.path.join(ICONS, 'icon-192.png'), 192, 0, 0.22)
make_icon(os.path.join(ICONS, 'icon-512.png'), 512, 0, 0.22)
make_icon(os.path.join(ICONS, 'maskable-512.png'), 512, 0.10, 0.0)
make_icon(os.path.join(ICONS, 'apple-touch-icon.png'), 180, 0, 0.22)
print('icons: 4')
