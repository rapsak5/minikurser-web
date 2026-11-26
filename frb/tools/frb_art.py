"""Grafik, der kun findes i FRB+ udgaven: Kasper, afdelingsikoner, hovedbygningen, kaffekop, mandel,
døren med kortlæser og din plads ved bordet. Bruges af build_assets.py. Tegnes i halv opløsning."""
import math
import random
from PIL import Image, ImageDraw
from px import K, WHITE, GOLD, hx, shade, light, new, R, P, outline, text, text_w

KU_RED = '#901a1e'
KU_RED3 = '#c73028'
CLEAR = (0, 0, 0, 0)


def grid(rows, pal):
    """Tegner en figur ud fra rækker af tegn. '.' er gennemsigtigt."""
    w = max(len(r) for r in rows)
    im = Image.new('RGBA', (w, len(rows)), CLEAR)
    px_ = im.load()
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch != '.' and pal.get(ch):
                px_[x, y] = hx(pal[ch])
    return im


# ---------------------------------------------------------------- Kasper
# Krøllet brunt hår, mørke briller, overskæg, hvid T-shirt og mørk blazer.
# På barsel, så han har en baby i bæresele på maven.
KASPER_PAL = dict(H='#5a3a22', h='#9a7048', S='#f2c0a0', s='#d89c7c', G='#22222a', g='#cfe0ea', E='#3a5a6a',
                  M='#6a4428', W='#f6f4ee', J='#3a3a42', j='#2a2a30', P='#2a2e3a', B='#15131c',
                  C='#4a6a8a', c='#3a5470', b='#f6d0b0', Y=KU_RED3, y='#f6f4ee', N='#7a2a2a')
KASPER_HEAD = [
    "..h.hHh.h...",
    ".hHhHhHhHh..",
    "hHhHHhHhHhH.",
    "HhHhHHhHHhHh",
    ".HSSSSSSSSH.",
    ".SGGGSSGGGs.",
    ".SGEGGGGEGs.",
    ".SGGGSSGGGs.",
    "..SSMMMMSs..",
    "..SSSNNSSs..",
    "...SSSSSS...",
    "....SSSS....",
]
KASPER_BODY = [
    "..JJJWWWWJJJ..",
    ".JJJJWWWWJJJJ.",
    ".JJJCYYYYCJJJ.",
    "JJJCYyYYyYCJJJ",
    "JJJCbbbbbbCJJJ",
    "JjJCbEbbEbCJjJ",
    "JjJCbbbbbbCJjJ",
    "JjJCCbbbbCCJjJ",
    "SjJJCCCCCCJJjS",
    "S.JJWWWWWWJJ.S",
    "..JJWWWWWWJJ..",
    "..jjjjjjjjjj..",
    "..PPPPPPPPPP..",
    "..PPPPP.PPPP..",
    "..PPPP...PPP..",
    "..PPPP...PPP..",
    "..PPPP...PPP..",
    "..PPP....PPP..",
    ".BBBB...BBBB..",
]


def kasper(pose='stand'):
    """Kasper i fuld figur, cirka samme størrelse som løberne. pose: stand | wave."""
    head = grid(KASPER_HEAD, KASPER_PAL)
    body = grid(KASPER_BODY, KASPER_PAL)
    im = Image.new('RGBA', (22, head.height + body.height + 3), CLEAR)
    im.alpha_composite(body, (3, head.height + 2))
    im.alpha_composite(head, (4, 3))
    d = ImageDraw.Draw(im)
    if pose == 'wave':
        # højre arm op: ærme og hånd over skulderen
        top = head.height + 2
        R(d, 16, top - 7, 3, 9, KASPER_PAL['J'])
        R(d, 16, top - 10, 3, 3, KASPER_PAL['S'])
        P(d, 19, top - 10, KASPER_PAL['S'])
        # fjern den hængende højre hånd
        for yy in range(top + 8, top + 10):
            d.point((16, yy), fill=CLEAR)
    return outline(im)


def kasper_portrait():
    """Kaspers hoved og skuldre i en ramme. Bruges på forsiden og som favicon."""
    spr = kasper('stand')
    crop = spr.crop((2, 0, 21, 22))
    im = Image.new('RGBA', (44, 48), hx('#2a3654'))
    big = crop.resize((crop.width * 2, crop.height * 2), Image.NEAREST)
    im.alpha_composite(big, ((44 - big.width) // 2, 48 - big.height))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 43, 47), outline=hx(K), width=2)
    return im


# ---------------------------------------------------------------- afdelingerne
DEPTS = {
    'BYG': '#b8503a', 'FIN': '#3a8a4a', 'HR': '#b0508a', 'IT': '#2c6694',
    'KOM': '#c8861a', 'UDD': '#2a7481', 'OKO': '#6a5ab8', 'KU': KU_RED,
}
ICONS = {
    'BYG': ["....W....", "...WWW...", "..WWWWW..", ".WWWWWWW.", "WWWWWWWWW", ".WWWWWWW.", ".WW.W.WW.", ".WW.W.WW.", ".WWWWWWW."],
    'FIN': ["...WWW...", "....W....", "....W....", "...W.W...", "..W...W..", ".W.LLL.W.", "W.LLLLL.W", "WLLLLLLLW", "WWWWWWWWW"],
    'HR': [".WW...WW.", "WWWW.WWWW", ".WW...WW.", ".........", "WWWW.WWWW", "WWWW.WWWW", "WWWW.WWWW", "WWWW.WWWW"],
    'IT': ["WWWWWWWWWW", "W........W", "W.LL.....W", "W...LL...W", "W........W", "WWWWWWWWWW", "....WW....", "..WWWWWW.."],
    'KOM': [".......W", ".....WWW", "WW.WWWWW", "WWWWWWWW", "WWWWWWWW", "WW.WWWWW", ".....WWW", ".......W"],
    'UDD': ["..WWWWW..", ".WWWWWWW.", "WWWWWWWWW", "WWWWWWWWW", "LLLLLLLLL", "DDDDDDDDD", ".DDDDDD.."],
    'OKO': [".......W", ".......W", "....W..W", "....W..W", ".W..W..W", ".W..W..W", ".W..W..W", "WWWWWWWW"],
}


def dept_icon(code):
    """Afdelingens ikon i samme størrelse som flagene i Deloitte-spillet (24x18)."""
    col = DEPTS[code]
    im = Image.new('RGBA', (24, 18), hx(K))
    d = ImageDraw.Draw(im)
    d.rectangle((1, 1, 22, 16), fill=hx(col))
    d.rectangle((1, 1, 22, 2), fill=hx(light(col)))
    if code == 'KU':
        text(d, 'KU', (24 - text_w('KU')) // 2, 5, WHITE)
        return im
    rows = ICONS[code]
    g = grid(rows, dict(W='#f6f4ee', L=light(col, 1.6, 40) if code != 'FIN' else '#a8f0a0', D='#2a2a30'))
    im.alpha_composite(g, ((24 - g.width) // 2, (18 - g.height) // 2 + 1))
    return im


# ---------------------------------------------------------------- ting at samle
def cup():
    return outline(grid([
        ".s.s....",
        "..s.s...",
        "WWWWWW..",
        "WRRRRWWW",
        "WRRRRW.W",
        "WRRRRWWW",
        "WWWWWW..",
        ".WWWW...",
    ], dict(s='#d8e4f0', W='#f6f4ee', R=KU_RED3)))


def mandel():
    return outline(grid([
        "...MM...",
        "..MmMM..",
        ".MmMMMM.",
        "MMMMMMMM",
        "MMMMMMMd",
        ".MMMMMd.",
        "..MMdd..",
    ], dict(M='#e8c48a', m='#fff2d0', d='#b8864a')))


# ---------------------------------------------------------------- mål
def door():
    """Døren til administrationen med kortlæser. Mål på campus."""
    im, d = new(46, 60)
    R(d, 2, 6, 40, 54, '#efe6d8'); R(d, 5, 9, 34, 51, '#3a2a1e'); R(d, 21, 9, 2, 51, '#2a1a12')
    R(d, 8, 13, 10, 20, '#b8cce0'); R(d, 26, 13, 10, 20, '#b8cce0')
    R(d, 9, 14, 3, 8, '#e0f0fa'); R(d, 27, 14, 3, 8, '#e0f0fa')
    R(d, 17, 38, 2, 5, GOLD); R(d, 25, 38, 2, 5, GOLD)
    R(d, 0, 0, 44, 8, KU_RED); R(d, 0, 0, 44, 1, KU_RED3)
    text(d, 'FRB+', (44 - text_w('FRB+')) // 2, 1, WHITE) if False else None
    # kortlæser med grøn lampe
    R(d, 40, 28, 6, 10, '#2a2e3a'); R(d, 41, 29, 4, 2, '#3ad46a'); R(d, 41, 33, 4, 3, '#4a5060')
    # krans
    for a in range(0, 360, 30):
        P(d, 22 + round(4 * math.cos(math.radians(a))), 18 + round(4 * math.sin(math.radians(a))), '#2f7a3a')
    P(d, 22, 22, '#d8283a')
    return outline(im)


def door_sign(im):
    """Skriver FRB+ på skiltet over døren (efter x2)."""
    d = ImageDraw.Draw(im)
    t = 'FRB+'
    text(d, t, (im.width - 4 - text_w(t, 2)) // 2 + 2, 3, WHITE, 2)
    return im


def table():
    """Din plads ved langbordet: bord med dug, tallerken, risalamande og en stol med navneskilt."""
    im, d = new(70, 50)
    R(d, 0, 24, 58, 3, WHITE); R(d, 1, 27, 56, 12, '#e8e2d6')
    for x in range(1, 57, 5):
        R(d, x, 27, 1, 12, '#d8d0c0')
    R(d, 3, 39, 3, 11, '#5a3a26'); R(d, 52, 39, 3, 11, '#5a3a26')
    R(d, 8, 21, 12, 3, WHITE); R(d, 10, 20, 8, 1, '#c8d4e0')
    # risalamande med kirsebærsovs
    R(d, 26, 18, 12, 6, '#f6f4ee'); R(d, 27, 16, 10, 3, '#fff8ec'); R(d, 29, 15, 5, 2, '#c8283a'); R(d, 26, 23, 12, 1, '#c8d4e0')
    R(d, 44, 16, 2, 8, '#f6f4ee'); P(d, 44, 14, GOLD); P(d, 45, 15, '#ff8a3a')
    # stol
    R(d, 60, 10, 3, 40, '#6a4226'); R(d, 58, 30, 12, 3, '#8a5a32'); R(d, 67, 30, 3, 20, '#6a4226')
    R(d, 54, 2, 16, 8, WHITE); R(d, 54, 2, 16, 1, KU_RED)
    return outline(im)


# ---------------------------------------------------------------- hovedbygningen
def main_building(w=170, h=118):
    """KU's hovedbygning på Bülowsvej 17, tegnet frit: røde mursten, hvide gesimser,
    buede vinduer og en midtrisalit med ur og grønt kobbertag. Lys vintereftermiddag."""
    im, d = new(w, h)
    brick, dark, white = '#a8442e', '#7e3222', '#efe6d8'
    top, base = 46, h
    x0, x1 = 2, w - 2
    R(d, x0, top, x1 - x0, base - top, brick)
    for y in range(top + 2, base, 3):
        for x in range(x0 + ((y // 3) % 2) * 3, x1, 6):
            P(d, x, y, dark)
    for j in range(12):
        R(d, x0 - 2 + j // 2 + 2, top - 12 + j, x1 - x0 - j, 1, '#4a5a66' if j % 3 else '#3a4a56')
    R(d, x0, top - 13, x1 - x0, 2, '#f4f7fb')
    R(d, x0, top - 1, x1 - x0, 2, white)
    R(d, x0, top + 24, x1 - x0, 2, white)
    R(d, x0, base - 3, x1 - x0, 3, '#8a8478')
    mid = w // 2
    rx0, rx1 = mid - 22, mid + 22
    R(d, rx0, top - 14, rx1 - rx0, base - top + 14, '#b44c34')
    for y in range(top - 12, base, 3):
        for x in range(rx0 + ((y // 3) % 2) * 3, rx1, 6):
            P(d, x, y, dark)
    for j in range(18):
        hw = int(j * 1.25)
        R(d, mid - hw, top - 32 + j, hw * 2 + 1, 1, '#5a9a8a' if j % 4 else '#4a8478')
        P(d, mid - hw, top - 32 + j, '#f4f7fb'); P(d, mid + hw, top - 32 + j, '#f4f7fb')
    R(d, mid - 24, top - 15, 49, 2, '#f4f7fb')
    d.ellipse((mid - 5, top - 25, mid + 5, top - 15), fill=hx(white), outline=hx(K))
    R(d, mid, top - 23, 1, 4, K); R(d, mid, top - 20, 3, 1, K)
    r = random.Random(9)

    def win(x, y, lit):
        R(d, x - 1, y - 2, 9, 15, white)
        R(d, x, y, 7, 12, '#ffcf6a' if lit else '#3a4a66')
        R(d, x + 1, y - 1, 5, 1, '#ffcf6a' if lit else '#3a4a66')
        R(d, x + 3, y, 1, 12, white); R(d, x, y + 5, 7, 1, white)
        if not lit:
            P(d, x + 1, y + 1, '#a8c0d8')
    for y in (top + 6, top + 31):
        for x in range(x0 + 6, x1 - 8, 13):
            if rx0 - 6 < x < rx1 - 2:
                continue
            win(x, y, r.random() < 0.45)
    for y in (top - 6, top + 6, top + 31):
        for x in (mid - 15, mid + 8):
            if y == top + 31:
                continue
            win(x, y, True)
    R(d, mid - 6, base - 24, 13, 21, white); R(d, mid - 5, base - 22, 11, 19, '#3a2a1e'); R(d, mid, base - 22, 1, 19, '#2a1a12')
    for a in range(0, 360, 30):
        P(d, mid + round(3 * math.cos(math.radians(a))), base - 29 + round(3 * math.sin(math.radians(a))), '#2f7a3a')
    P(d, mid, base - 26, '#d8283a')
    # lyskæde under gesimsen
    cols = ['#d8343f', GOLD, '#3ad46a', '#6ec1ff']
    for x in range(x0, x1):
        y = top + 1 + int(3 * abs(math.sin(x / 12 * math.pi)))
        P(d, x, y, '#2a3a2a')
        if x % 4 == 1:
            P(d, x, y + 1, cols[(x // 4) % 4])
    # KU-rødt flag
    fx = x1 - 12
    R(d, fx, top - 44, 1, 32, '#d8dce4'); R(d, fx + 1, top - 44, 12, 8, KU_RED); R(d, fx + 1, top - 44, 12, 1, KU_RED3)
    return im


def hedge(w, h=12, seed=1):
    """En klippet hæk med sne på toppen."""
    im, d = new(w, h + 3)
    r = random.Random(seed)
    for x in range(w):
        hh = h - 2 + int(2 * math.sin(x * 0.35 + seed)) + r.randrange(0, 2)
        R(d, x, h + 3 - hh, 1, hh, '#2a5a3a' if x % 5 else '#24503a')
        P(d, x, h + 3 - hh, '#f4f7fb')
        if x % 3 == 0:
            P(d, x, h + 4 - hh, '#e4ecf6')
    return im


def bench():
    im, d = new(30, 14)
    R(d, 0, 4, 30, 2, '#8a5a32'); R(d, 0, 7, 30, 2, '#8a5a32'); R(d, 0, 3, 30, 1, '#f4f7fb')
    R(d, 3, 9, 2, 5, '#2a2e3a'); R(d, 25, 9, 2, 5, '#2a2e3a'); R(d, 2, 0, 2, 4, '#2a2e3a'); R(d, 26, 0, 2, 4, '#2a2e3a')
    return outline(im)
