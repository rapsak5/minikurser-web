"""Pixelbibliotek til Deloitte-julespillets moodboards.
Baggrunde tegnes i 320x180 (L), skaleres 2x til 640x360 (F), hvor tekst, HUD og sne tegnes fint.
Figurer tegnes i L, faar sort omrids og skaleres 2x. Til sidst 2x til 1280x720 til slides."""
import math, random
from PIL import Image, ImageDraw

K = '#161222'
WHITE = '#f4f1ea'
RED = '#d8343f'
RED2 = '#a8202e'
GREEN = '#86bc25'      # Deloitte-groen (bud, tjekkes mod designmanual)
GREEN2 = '#5c8a1a'
SKIN = '#f0b48c'
SKIN2 = '#d08a64'
GOLD = '#f6c945'


def hx(h, a=255):
    if isinstance(h, tuple):
        return h
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


def shade(h, f=0.78):
    t = hx(h)
    return '#%02x%02x%02x' % tuple(int(v * f) for v in t[:3])


def light(h, f=1.18, add=12):
    t = hx(h)
    return '#%02x%02x%02x' % tuple(min(255, int(v * f + add)) for v in t[:3])


def new(w, h):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    return im, ImageDraw.Draw(im)


def R(d, x, y, w, h, c):
    if w <= 0 or h <= 0:
        return
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=hx(c))


def P(d, x, y, c):
    d.point((x, y), fill=hx(c))


def outline(im, col=K):
    w, h = im.size
    big = Image.new('RGBA', (w + 2, h + 2), (0, 0, 0, 0))
    big.paste(im, (1, 1))
    src = big.load()
    out = big.copy()
    o = out.load()
    c = hx(col)
    for y in range(h + 2):
        for x in range(w + 2):
            if src[x, y][3]:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w + 2 and 0 <= ny < h + 2 and src[nx, ny][3]:
                    o[x, y] = c
                    break
    return out


def flip(im):
    return im.transpose(Image.FLIP_LEFT_RIGHT)


def scale(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)


# ---------------------------------------------------------------- font 5x7
_F = {
    'A': '01110 10001 10001 11111 10001 10001 10001', 'B': '11110 10001 10001 11110 10001 10001 11110',
    'C': '01110 10001 10000 10000 10000 10001 01110', 'D': '11110 10001 10001 10001 10001 10001 11110',
    'E': '11111 10000 10000 11110 10000 10000 11111', 'F': '11111 10000 10000 11110 10000 10000 10000',
    'G': '01110 10001 10000 10111 10001 10001 01111', 'H': '10001 10001 10001 11111 10001 10001 10001',
    'I': '111 010 010 010 010 010 111', 'J': '00111 00010 00010 00010 00010 10010 01100',
    'K': '10001 10010 10100 11000 10100 10010 10001', 'L': '10000 10000 10000 10000 10000 10000 11111',
    'M': '10001 11011 10101 10101 10001 10001 10001', 'N': '10001 11001 10101 10011 10001 10001 10001',
    'O': '01110 10001 10001 10001 10001 10001 01110', 'P': '11110 10001 10001 11110 10000 10000 10000',
    'Q': '01110 10001 10001 10001 10101 10010 01101', 'R': '11110 10001 10001 11110 10100 10010 10001',
    'S': '01111 10000 10000 01110 00001 00001 11110', 'T': '11111 00100 00100 00100 00100 00100 00100',
    'U': '10001 10001 10001 10001 10001 10001 01110', 'V': '10001 10001 10001 10001 10001 01010 00100',
    'W': '10001 10001 10001 10101 10101 11011 10001', 'X': '10001 10001 01010 00100 01010 10001 10001',
    'Y': '10001 10001 01010 00100 00100 00100 00100', 'Z': '11111 00001 00010 00100 01000 10000 11111',
    '0': '01110 10001 10011 10101 11001 10001 01110', '1': '00100 01100 00100 00100 00100 00100 01110',
    '2': '01110 10001 00001 00010 00100 01000 11111', '3': '11110 00001 00001 01110 00001 00001 11110',
    '4': '00010 00110 01010 10010 11111 00010 00010', '5': '11111 10000 11110 00001 00001 10001 01110',
    '6': '00110 01000 10000 11110 10001 10001 01110', '7': '11111 00001 00010 00100 01000 01000 01000',
    '8': '01110 10001 10001 01110 10001 10001 01110', '9': '01110 10001 10001 01111 00001 00010 01100',
    ':': '0 1 1 0 1 1 0', '.': '0 0 0 0 0 0 1', '!': '1 1 1 1 1 0 1', ' ': '000 000 000 000 000 000 000',
    '?': '01110 10001 00001 00010 00100 00000 00100', '-': '000 000 000 111 000 000 000',
    '/': '00001 00001 00010 00100 01000 10000 10000', '+': '000 000 010 111 010 000 000',
    '>': '000 100 010 001 010 100 000', '<': '000 001 010 100 010 001 000', ',': '00 00 00 00 00 01 10',
    'x': '000 000 101 010 101 000 000', "'": '1 1 0 0 0 0 0', '=': '000 000 111 000 111 000 000',
    'Æ': '01111 10100 10100 11111 10100 10100 10111', 'Ø': '01111 10011 10011 10101 11001 11001 11110',
    'Å': '00100 00000 01110 10001 11111 10001 10001',
}
FONT = {k: v.split() for k, v in _F.items()}


def text_w(t, s=1):
    return sum((len(FONT.get(ch, FONT[' '])[0]) + 1) * s for ch in t) - s


def text(d, t, x, y, c, s=1):
    cx = x
    col = hx(c)
    for ch in t:
        g = FONT.get(ch, FONT[' '])
        for j, row in enumerate(g):
            for i, b in enumerate(row):
                if b == '1':
                    d.rectangle((cx + i * s, y + j * s, cx + i * s + s - 1, y + j * s + s - 1), fill=col)
        cx += (len(g[0]) + 1) * s


def otext(d, t, x, y, c, oc=K, s=1, sh=None):
    """Tekst med omrids. sh = skyggefarve nedad."""
    if sh:
        for dx in (-s, 0, s):
            text(d, t, x + dx, y + 2 * s, sh, s)
    o = max(1, s // 2) if s > 1 else 1
    for dx in (-o, 0, o):
        for dy in (-o, 0, o):
            if dx or dy:
                text(d, t, x + dx, y + dy, oc, s)
    text(d, t, x, y, c, s)


# ---------------------------------------------------------------- scene
class Scene:
    def __init__(s, bg='#101830'):
        s.L = Image.new('RGBA', (320, 180), hx(bg))
        s.d = ImageDraw.Draw(s.L)
        s.F = None
        s.fd = None

    def grad(s, y0, y1, cols, x0=0, x1=320):
        n = len(cols) - 1
        for y in range(y0, y1):
            t = (y - y0) / max(1, (y1 - y0 - 1)) * n
            i = min(int(t), n - 1)
            f = t - i
            for x in range(x0, x1):
                th = (((x % 2) * 2 + (y % 2)) / 4.0 + 0.125)
                s.d.point((x, y), fill=hx(cols[i + 1] if f > th else cols[i]))

    def up(s):
        s.F = s.L.resize((640, 360), Image.NEAREST)
        s.fd = ImageDraw.Draw(s.F)

    def put(s, spr, x, y, fl=False, k=2, bottom=True):
        """x,y i L-koordinater. bottom=True: y er foddernes linje, x er venstre kant."""
        im = scale(flip(spr) if fl else spr, k)
        px, py = x * 2, y * 2 - (im.height if bottom else 0)
        s.F.alpha_composite(im, (max(0, px), max(0, py)), (max(0, -px), max(0, -py)))

    def shadow(s, x, y, w):
        """Blød skygge under en figur (L-koordinater)."""
        ov = Image.new('RGBA', s.F.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        od.ellipse((x * 2, y * 2 - 3, (x + w) * 2, y * 2 + 5), fill=(10, 10, 30, 90))
        s.F.alpha_composite(ov)

    def glow(s, x, y, r, col, a=60):
        """Lysskær i F-koordinater."""
        ov = Image.new('RGBA', s.F.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(ov)
        c = hx(col)[:3]
        for k in range(3):
            rr = r - k * r // 4
            od.ellipse((x - rr, y - rr, x + rr, y + rr), fill=c + (a // 3 * (k + 1),))
        s.F.alpha_composite(ov)

    def snow(s, n, seed=3, ymax=360):
        r = random.Random(seed)
        for _ in range(n):
            x, y = r.randrange(640), r.randrange(ymax)
            z = r.choice((1, 1, 2, 2, 3))
            s.fd.rectangle((x, y, x + z - 1, y + z - 1), fill=hx('#ffffff') if z > 1 else hx('#c8d8f0'))

    def save(s, path):
        s.F.resize((1280, 720), Image.NEAREST).convert('RGB').save(path, optimize=True)


# ---------------------------------------------------------------- figurer
OUTFITS = {
    'office': dict(j='#2f4170', js='#223056', p='#2a3654', shirt=WHITE, tie=GREEN, shoe='#15131c', dots=False),
    'xmas': dict(j='#cc2f3d', js='#9c1f2e', p='#cc2f3d', shirt=WHITE, tie='#2f9a4a', shoe='#15131c', dots=True),
}


def hero(pose='run1', outfit='office', bag=True, hair='#6b3f22', long=False):
    o = OUTFITS[outfit]
    im, d = new(28, 37)
    x0 = 8
    # nissehue
    d.polygon([(x0 + 1, 9), (x0 + 10, 9), (x0 + 8, 3), (x0 + 4, 1)], fill=hx(RED))
    R(d, x0 - 2, 1, 7, 3, RED)
    R(d, x0 - 3, 3, 3, 3, RED2)
    R(d, x0 - 5, 4, 3, 3, WHITE)
    P(d, x0 + 6, 4, light(RED))
    P(d, x0 + 5, 6, light(RED))
    R(d, x0, 9, 12, 2, WHITE)
    R(d, x0, 10, 12, 1, '#d0d4e0')
    # hoved
    R(d, x0 + 2, 11, 8, 7, SKIN)
    R(d, x0 + 2, 11, 2, 4, hair)
    R(d, x0 + 4, 11, 2, 1, hair)
    if long:
        R(d, x0, 11, 3, 10, hair); R(d, x0 + 1, 21, 2, 2, hair)
    P(d, x0 + 8, 13, K)
    P(d, x0 + 10, 14, SKIN)
    R(d, x0 + 7, 16, 2, 1, '#8a2a2a')
    P(d, x0 + 3, 16, SKIN2)
    P(d, x0 + 6, 14, '#f4a08c')
    # hals og krop
    R(d, x0 + 5, 18, 3, 1, SKIN2)
    R(d, x0 + 1, 19, 9, 9, o['j'])
    R(d, x0 + 1, 19, 2, 9, o['js'])
    R(d, x0 + 7, 19, 3, 5, o['shirt'])
    R(d, x0 + 8, 20, 1, 4, o['tie'])
    if outfit == 'xmas':
        R(d, x0 + 7, 19, 3, 2, o['tie'])            # butterfly
        P(d, x0 + 8, 19, '#f6c945')
    if o['dots']:
        for (ax, ay) in ((2, 21), (5, 20), (4, 23), (2, 25), (6, 26), (5, 25)):
            P(d, x0 + ax, ay, WHITE)
        for (ax, ay) in ((3, 22), (6, 22), (3, 26), (5, 27)):
            P(d, x0 + ax, ay, '#2f9a4a')
    # arme
    if pose == 'point':
        R(d, x0 - 3, 21, 5, 2, o['js']); R(d, x0 - 4, 21, 1, 2, SKIN2)
        R(d, x0 + 8, 19, 7, 2, o['j']); R(d, x0 + 15, 18, 2, 3, SKIN)
        R(d, x0 + 7, 15, 3, 2, '#8a2a2a')
    elif pose in ('run1', 'run2'):
        if bag:
            R(d, x0 - 6, 22, 6, 5, '#8a5a2a'); R(d, x0 - 6, 22, 6, 1, '#b07a3a'); R(d, x0 - 4, 21, 2, 1, '#5a3a1a')
            P(d, x0 - 3, 24, GOLD)
        R(d, x0 - 3, 21, 5, 2, o['js']); R(d, x0 - 4, 21, 1, 2, SKIN2)
        R(d, x0 + 8, 21, 5, 2, o['j']); R(d, x0 + 13, 20, 2, 2, SKIN)
    elif pose == 'jump':
        if bag:
            R(d, x0 - 6, 18, 6, 5, '#8a5a2a'); R(d, x0 - 6, 18, 6, 1, '#b07a3a'); P(d, x0 - 3, 20, GOLD)
        R(d, x0 - 3, 19, 5, 2, o['js']); R(d, x0 - 4, 19, 1, 2, SKIN2)
        R(d, x0 + 9, 15, 2, 6, o['j']); R(d, x0 + 9, 13, 2, 2, SKIN)
    elif pose == 'stand':
        R(d, x0, 20, 2, 7, o['js']); R(d, x0, 27, 2, 1, SKIN2)
        R(d, x0 + 9, 20, 2, 7, o['j']); R(d, x0 + 9, 27, 2, 1, SKIN)
    elif pose == 'cheer':
        R(d, x0, 20, 2, 7, o['js']); R(d, x0, 27, 2, 1, SKIN2)
        R(d, x0 + 10, 15, 2, 6, o['j']); R(d, x0 + 10, 13, 3, 2, SKIN)
        # fadoel
        R(d, x0 + 12, 6, 6, 8, '#f0a020'); R(d, x0 + 12, 6, 1, 8, '#ffc860'); R(d, x0 + 11, 4, 8, 3, WHITE)
        R(d, x0 + 18, 8, 2, 1, '#cfe6f4'); R(d, x0 + 19, 8, 1, 4, '#cfe6f4'); R(d, x0 + 18, 11, 2, 1, '#cfe6f4')
    elif pose == 'shock':
        R(d, x0 - 3, 17, 4, 2, o['js']); R(d, x0 - 4, 15, 2, 2, SKIN2)
        R(d, x0 + 9, 17, 4, 2, o['j']); R(d, x0 + 13, 15, 2, 2, SKIN)
    # ben
    if pose == 'run1':
        R(d, x0 + 1, 28, 4, 2, o['p']); R(d, x0 - 3, 29, 5, 2, o['p']); R(d, x0 - 5, 28, 2, 4, o['shoe'])
        R(d, x0 + 5, 28, 4, 3, o['p']); R(d, x0 + 8, 30, 3, 3, o['p']); R(d, x0 + 8, 33, 5, 2, o['shoe'])
    elif pose in ('run2', 'point'):
        R(d, x0 + 5, 28, 3, 4, shade(o['p'])); R(d, x0 + 6, 32, 4, 2, o['shoe'])
        R(d, x0 + 2, 28, 4, 5, o['p']); R(d, x0 + 2, 33, 5, 2, o['shoe'])
    elif pose == 'jump':
        R(d, x0 + 1, 28, 4, 3, o['p']); R(d, x0 - 2, 30, 4, 2, o['p']); R(d, x0 - 4, 30, 2, 3, o['shoe'])
        R(d, x0 + 5, 28, 5, 3, o['p']); R(d, x0 + 9, 30, 2, 2, o['p']); R(d, x0 + 9, 32, 4, 2, o['shoe'])
    else:
        R(d, x0 + 2, 28, 3, 6, o['p']); R(d, x0 + 6, 28, 3, 6, o['p'])
        R(d, x0 + 2, 34, 4, 2, o['shoe']); R(d, x0 + 6, 34, 4, 2, o['shoe'])
        if o['dots']:
            for (ax, ay) in ((3, 30), (7, 29), (2, 32), (8, 32)):
                P(d, x0 + ax, ay, WHITE)
    if o['dots'] and (pose.startswith('run') or pose == 'point'):
        for (ax, ay) in ((6, 29), (9, 31), (2, 29), (-1, 30)):
            P(d, x0 + ax, ay, WHITE)
    return outline(im)


WHEEL_ALT = False


def wheel(d, cx, cy, r, tyre='#20202a', rim='#8a92a4'):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=hx(tyre), width=1)
    d.ellipse((cx - r + 1, cy - r + 1, cx + r - 1, cy + r - 1), outline=hx(rim))
    if WHEEL_ALT:
        k = r - 3
        d.line((cx - k, cy - k, cx + k, cy + k), fill=hx(rim)); d.line((cx - k, cy + k, cx + k, cy - k), fill=hx(rim))
    else:
        d.line((cx - r + 2, cy, cx + r - 2, cy), fill=hx(rim))
        d.line((cx, cy - r + 2, cx, cy + r - 2), fill=hx(rim))
    P(d, cx, cy, '#d8dce4')


def cyclist(coat='#3a8ad8', helmet='#f6c945'):
    """Cyklist, der kommer imod os (vender mod venstre efter flip). Tegnet mod hoejre."""
    im, d = new(36, 34)
    wheel(d, 7, 26, 6)
    wheel(d, 27, 26, 6)
    fr = hx('#d8343f')
    for (a, b) in (((7, 26), (14, 17)), ((14, 17), (24, 17)), ((14, 17), (17, 26)), ((17, 26), (24, 17)), ((17, 26), (7, 26)), ((24, 17), (27, 26)), ((24, 17), (25, 13))):
        d.line(a + b, fill=fr)
    R(d, 24, 12, 4, 1, K)           # styr
    R(d, 11, 15, 5, 2, K)           # sadel
    R(d, 29, 14, 2, 2, '#fff2a0')   # lygte
    # rytter
    R(d, 12, 19, 3, 6, '#2a3654'); R(d, 14, 24, 4, 2, '#2a3654'); R(d, 17, 25, 3, 2, K)   # ben
    d.polygon([(11, 15), (15, 15), (21, 7), (16, 5)], fill=hx(coat))      # overkrop foroverboejet
    d.line((19, 9, 25, 12), fill=hx(shade(coat)), width=2)              # arm
    R(d, 25, 11, 2, 2, SKIN)
    R(d, 18, 0, 6, 6, SKIN); P(d, 22, 2, K); R(d, 21, 4, 2, 1, '#8a2a2a')
    R(d, 17, -1, 8, 3, helmet); R(d, 17, 1, 8, 1, shade(helmet))
    R(d, 15, 5, 7, 2, RED); R(d, 12, 6, 4, 2, RED); R(d, 10, 7, 3, 1, RED2)   # halstoerklaede flagrer
    return outline(im)


def cargo_bike():
    """Ladcykel med kasse foran: juletrae og et barn med nissehue i ladet. Tegnet mod hoejre."""
    im, d = new(54, 38)
    wheel(d, 8, 30, 6)
    wheel(d, 40, 31, 5)
    fr = hx('#2a2a34')
    d.line((8, 30, 16, 20), fill=fr); d.line((16, 20, 28, 22), fill=fr); d.line((16, 20, 19, 30), fill=fr)
    d.line((19, 30, 8, 30), fill=fr); d.line((19, 30, 28, 28), fill=fr); d.line((28, 16, 28, 26), fill=fr)
    R(d, 25, 15, 6, 1, K)
    R(d, 13, 18, 5, 2, K)
    # kassen
    d.polygon([(29, 18), (52, 18), (49, 31), (31, 31)], fill=hx('#a8783c'))
    R(d, 29, 18, 24, 2, '#c8945a')
    for xx in (35, 41, 47):
        d.line((xx, 20, xx - 1, 30), fill=hx('#7a5428'))
    R(d, 34, 23, 12, 4, WHITE); text(d, 'GOD', 35, 23, RED) if False else None
    # juletrae i ladet
    for i, (w_, yy) in enumerate(((3, 3), (5, 6), (7, 9), (9, 12), (11, 15))):
        R(d, 45 - w_ // 2, yy, w_, 3, '#2f8a3a' if i % 2 else '#3aa04a')
    R(d, 44, 0, 3, 3, GOLD)
    for (ax, ay, c) in ((44, 8, RED), (47, 12, GOLD), (42, 13, '#6ec1ff'), (46, 16, RED), (41, 16, GOLD)):
        P(d, ax, ay, c)
    # barn i ladet
    R(d, 33, 12, 6, 6, SKIN); P(d, 37, 14, K); P(d, 34, 14, K); R(d, 35, 16, 2, 1, '#8a2a2a')
    d.polygon([(32, 12), (39, 12), (36, 7)], fill=hx(RED)); R(d, 32, 11, 8, 2, WHITE); R(d, 35, 5, 2, 2, WHITE)
    # rytter
    R(d, 14, 21, 3, 6, '#3a3f4c'); R(d, 16, 26, 4, 2, '#3a3f4c'); R(d, 19, 27, 3, 2, K)
    d.polygon([(13, 18), (18, 18), (23, 9), (18, 7)], fill=hx('#e8862a'))
    d.line((21, 11, 27, 15), fill=hx('#b8621a'), width=2)
    R(d, 27, 14, 2, 2, SKIN)
    R(d, 19, 1, 6, 6, SKIN); P(d, 23, 3, K); R(d, 22, 5, 2, 1, '#8a2a2a')
    R(d, 18, 0, 8, 3, '#5a6a8a'); R(d, 18, -1, 8, 2, '#5a6a8a'); R(d, 21, -2, 2, 2, WHITE)
    R(d, 17, 6, 7, 2, '#f6c945')
    return outline(im)


def dog_walker():
    """Hundelufter med gravhund i roed frakke. Vender mod hoejre, snoren foran."""
    im, d = new(44, 36)
    # person
    R(d, 5, 2, 7, 7, SKIN); P(d, 10, 4, K); R(d, 9, 7, 2, 1, '#8a2a2a')
    R(d, 4, 0, 9, 3, '#7a4ab0'); R(d, 7, -2, 3, 2, WHITE); R(d, 4, 2, 9, 1, '#5a3a8a')   # hue
    R(d, 4, 9, 9, 2, GOLD); R(d, 3, 10, 3, 5, GOLD)                                     # halstoerklaede
    R(d, 3, 11, 11, 14, '#3a7a5a'); R(d, 3, 11, 3, 14, '#2a5a44'); R(d, 8, 12, 1, 12, '#2a5a44')
    for yy in (14, 18, 22):
        P(d, 9, yy, GOLD)
    R(d, 13, 14, 5, 2, '#3a7a5a'); R(d, 18, 14, 2, 2, SKIN)                             # arm frem
    R(d, 5, 25, 3, 8, '#2a3654'); R(d, 9, 25, 3, 8, '#2a3654')
    R(d, 4, 33, 5, 2, '#5a3a1a'); R(d, 9, 33, 5, 2, '#5a3a1a')
    # snor
    d.line((20, 15, 32, 26), fill=hx('#d8343f'))
    # gravhund
    R(d, 27, 27, 13, 5, '#8a5a2a'); R(d, 28, 26, 9, 5, RED); R(d, 28, 26, 9, 1, WHITE)
    R(d, 38, 23, 5, 5, '#8a5a2a'); R(d, 42, 25, 2, 2, '#8a5a2a'); P(d, 43, 25, K); P(d, 40, 24, K)
    R(d, 37, 23, 2, 5, '#5a3a1a')
    R(d, 28, 32, 2, 3, '#6a421c'); R(d, 37, 32, 2, 3, '#6a421c'); R(d, 31, 32, 2, 2, '#6a421c'); R(d, 34, 32, 2, 2, '#6a421c')
    R(d, 25, 25, 2, 3, '#8a5a2a')
    return outline(im)


def memo():
    im, d = new(9, 11)
    R(d, 0, 0, 9, 11, '#fbfaf2'); d.polygon([(6, 0), (9, 0), (9, 3)], fill=(0, 0, 0, 0)); d.polygon([(6, 0), (6, 3), (9, 3)], fill=hx('#c8ccd8'))
    for yy in (3, 5, 7):
        R(d, 1, yy, 6, 1, '#7a86a8')
    R(d, 1, 1, 3, 1, GREEN)
    return outline(im, '#2a3654')


def julehjerte(big=False):
    rows = ['.RR...WW.', 'RRRR.WWWW', 'RRWRWRWWW', 'RWRWRWRWW', 'RRWRWRWWW', '.RWRWRWW.', '..RRWWW..', '...RWW...', '....W....']
    im, d = new(9, 9)
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == 'R': P(d, i, j, RED)
            elif ch == 'W': P(d, i, j, WHITE)
    # flettet moenster: skakternet midte
    for (i, j) in ((3, 2), (5, 2), (2, 3), (4, 3), (6, 3), (3, 4), (5, 4), (4, 5)):
        P(d, i, j, WHITE)
    for (i, j) in ((4, 2), (3, 3), (5, 3), (4, 4), (3, 5), (5, 5), (4, 6)):
        P(d, i, j, RED)
    return outline(im, '#5a1420')


def bauble(col=RED):
    im, d = new(7, 9)
    R(d, 2, 0, 3, 2, GOLD)
    d.ellipse((0, 2, 6, 8), fill=hx(col))
    P(d, 2, 4, WHITE); P(d, 1, 5, light(col))
    return outline(im)


def bowtie():
    im, d = new(11, 7)
    d.polygon([(0, 0), (4, 3), (0, 6)], fill=hx('#2f9a4a')); d.polygon([(10, 0), (6, 3), (10, 6)], fill=hx('#2f9a4a'))
    R(d, 4, 2, 3, 3, GOLD)
    P(d, 1, 2, WHITE); P(d, 9, 4, WHITE)
    return outline(im)


def beer():
    im, d = new(11, 13)
    R(d, 1, 3, 7, 10, '#f0a020'); R(d, 1, 3, 2, 10, '#ffc860'); R(d, 0, 0, 9, 4, WHITE); R(d, 1, 0, 3, 1, '#ffffff')
    R(d, 8, 5, 2, 1, '#cfe6f4'); R(d, 9, 5, 2, 6, '#cfe6f4'); R(d, 8, 10, 2, 1, '#cfe6f4')
    P(d, 5, 7, '#ffe08a'); P(d, 4, 10, '#ffe08a')
    return outline(im)


def taxi():
    im, d = new(60, 26)
    body, dark = '#f2d21b', '#c8a60e'
    R(d, 14, 3, 12, 4, '#1b1b22'); text(d, 'TAXI', 15, 3, GOLD) if False else None
    R(d, 15, 4, 10, 2, GOLD)
    d.polygon([(12, 8), (40, 8), (46, 15), (8, 15)], fill=hx(body))
    R(d, 2, 14, 56, 8, body); R(d, 2, 20, 56, 2, dark)
    d.polygon([(14, 9), (25, 9), (25, 14), (11, 14)], fill=hx('#9ad0f0')); d.polygon([(27, 9), (39, 9), (43, 14), (27, 14)], fill=hx('#9ad0f0'))
    R(d, 14, 9, 4, 1, '#d8f0ff'); R(d, 28, 9, 4, 1, '#d8f0ff')
    R(d, 2, 17, 56, 2, '#1b1b22')
    for xx in range(4, 56, 4):
        R(d, xx, 17, 2, 2, body)
    R(d, 55, 14, 3, 3, '#fff6c0'); R(d, 2, 14, 2, 3, RED)
    R(d, 26, 15, 1, 6, dark); R(d, 30, 16, 3, 1, dark)
    for cx in (14, 45):
        d.ellipse((cx - 5, 17, cx + 5, 27), fill=hx('#1b1b22')); d.ellipse((cx - 2, 20, cx + 2, 24), fill=hx('#9aa4b4'))
    R(d, 6, 11, 5, 3, WHITE)   # sne paa bagklap
    R(d, 13, 7, 26, 1, WHITE)  # sne paa taget
    return outline(im)


def cubicle(worker='#c88a5a', shirt='#6a8ad8'):
    """Kontorbaas med skaerm, medarbejder med headset og lidt julepynt."""
    im, d = new(46, 34)
    wall, w2 = '#8a9ab8', '#6a7a9a'
    R(d, 0, 6, 46, 28, wall); R(d, 0, 6, 46, 2, '#b8c4dc'); R(d, 0, 30, 46, 4, w2)
    for xx in (15, 30):
        R(d, xx, 8, 1, 22, w2)
    R(d, 0, 6, 2, 28, w2); R(d, 44, 6, 2, 28, w2)
    # opslagssedler
    R(d, 4, 11, 4, 4, GOLD); R(d, 9, 13, 4, 4, '#ff9ab0'); R(d, 34, 11, 5, 6, WHITE); R(d, 35, 13, 3, 1, '#7a86a8'); R(d, 35, 15, 3, 1, '#7a86a8')
    # medarbejder bag vaeggen
    R(d, 19, 0, 8, 8, worker); R(d, 19, -1, 8, 3, '#3a2a1a'); P(d, 21, 4, K); P(d, 25, 4, K)
    R(d, 18, 2, 1, 4, K); R(d, 27, 2, 1, 4, K); R(d, 18, 0, 10, 1, K); R(d, 16, 5, 3, 1, K)
    R(d, 17, 8, 12, 4, shirt)
    # skaerm
    R(d, 18, 13, 11, 8, '#1b1b22'); R(d, 19, 14, 9, 6, '#3ab4a0'); R(d, 20, 15, 4, 1, WHITE); R(d, 20, 17, 6, 1, '#b8f0e0')
    R(d, 22, 21, 3, 2, '#3a3f4c')
    # lyskaede
    for i, xx in enumerate(range(2, 44, 4)):
        P(d, xx, 9 + (i % 2), [RED, GOLD, '#3ad46a', '#6ec1ff'][i % 4])
    return outline(im)


def printer(angry=True):
    im, d = new(34, 30)
    R(d, 3, 8, 26, 14, '#e8e8ee'); R(d, 3, 8, 26, 2, '#ffffff'); R(d, 3, 19, 26, 3, '#b8bcc8')
    R(d, 6, 2, 20, 7, '#c8ccd8'); R(d, 8, 0, 16, 3, '#fbfaf2')         # papir i bakken
    R(d, 5, 22, 22, 5, '#8a92a4'); R(d, 5, 22, 22, 1, '#b8bcc8')
    # display med vrede oejne
    R(d, 16, 11, 11, 7, '#1b1b22')
    R(d, 18, 14, 2, 2, '#ff4a4a'); R(d, 23, 14, 2, 2, '#ff4a4a')
    d.line((17, 12, 20, 13), fill=hx('#ff4a4a')); d.line((25, 12, 22, 13), fill=hx('#ff4a4a'))
    R(d, 6, 12, 2, 2, '#3ad46a'); R(d, 9, 12, 2, 2, RED); R(d, 6, 15, 6, 1, '#8a92a4')
    # udkast af papir
    R(d, 26, 16, 7, 2, '#1b1b22'); R(d, 28, 14, 6, 5, '#fbfaf2'); R(d, 29, 15, 4, 1, '#7a86a8'); R(d, 29, 17, 3, 1, '#7a86a8')
    # hjul
    for cx in (9, 23):
        d.ellipse((cx - 2, 26, cx + 2, 30), fill=hx('#20202a'))
    return outline(im)


def chair():
    im, d = new(20, 30)
    R(d, 2, 0, 12, 13, '#3a3f58'); R(d, 3, 1, 10, 3, '#55608a'); R(d, 2, 0, 2, 13, '#2a2e42')
    R(d, 7, 13, 3, 3, '#20202a')
    R(d, 3, 15, 15, 4, '#3a3f58'); R(d, 3, 15, 15, 1, '#55608a')
    R(d, 14, 10, 4, 2, '#20202a'); R(d, 16, 12, 2, 3, '#20202a')
    R(d, 9, 19, 2, 6, '#8a92a4')
    R(d, 2, 25, 16, 2, '#8a92a4'); R(d, 9, 24, 2, 2, '#8a92a4')
    for cx in (3, 10, 17):
        d.ellipse((cx - 2, 26, cx + 1, 29), fill=hx('#20202a'))
    return outline(im)


def plant():
    im, d = new(16, 26)
    R(d, 4, 17, 8, 9, '#c0563a'); R(d, 3, 16, 10, 2, '#d87a5a')
    for (ax, ay, w_, h_) in ((6, 2, 3, 14), (2, 6, 4, 4), (10, 4, 4, 5), (1, 10, 4, 4), (11, 10, 4, 4), (4, 0, 2, 5), (9, 8, 3, 8)):
        R(d, ax, ay, w_, h_, '#2f8a3a')
    for (ax, ay) in ((7, 3), (3, 7), (11, 5), (12, 11), (2, 11)):
        P(d, ax, ay, '#5ac06a')
    P(d, 5, 5, RED); P(d, 11, 9, GOLD); P(d, 3, 12, RED)
    return outline(im)


def guest(col='#3a6ad8', skin=SKIN, hat='paper', arms='up', hair='#3a2a1a', dress=False):
    """Festdeltager. arms: up, down, drink. hat: paper (papirkrone), nisse, none."""
    im, d = new(22, 36)
    x0 = 5
    R(d, x0 + 1, 6, 8, 8, skin); P(d, x0 + 3, 9, K); P(d, x0 + 7, 9, K); R(d, x0 + 4, 12, 3, 1, '#8a2a2a')
    R(d, x0 + 1, 5, 8, 2, hair)
    if dress:
        R(d, x0, 6, 2, 8, hair); R(d, x0 + 8, 6, 2, 8, hair)
    if hat == 'paper':
        R(d, x0 + 1, 3, 8, 3, GOLD)
        for xx in (x0 + 1, x0 + 4, x0 + 7):
            R(d, xx, 1, 2, 2, GOLD)
    elif hat == 'nisse':
        d.polygon([(x0, 5), (x0 + 9, 5), (x0 + 6, 0)], fill=hx(RED)); R(d, x0, 4, 10, 2, WHITE); R(d, x0 + 6, -1, 2, 2, WHITE)
    R(d, x0 + 4, 14, 2, 1, shade(skin))
    if dress:
        R(d, x0, 15, 10, 7, col); d.polygon([(x0, 22), (x0 + 9, 22), (x0 + 11, 30), (x0 - 2, 30)], fill=hx(col))
        R(d, x0, 15, 2, 15, shade(col)); R(d, x0 + 2, 30, 2, 4, skin); R(d, x0 + 6, 30, 2, 4, skin)
        R(d, x0 + 1, 34, 3, 2, RED2); R(d, x0 + 6, 34, 3, 2, RED2)
        for (ax, ay) in ((3, 18), (6, 20), (2, 25), (7, 26), (4, 28)):
            P(d, x0 + ax, ay, GOLD)
    else:
        R(d, x0, 15, 10, 10, col); R(d, x0, 15, 2, 10, shade(col)); R(d, x0 + 4, 15, 2, 5, WHITE); P(d, x0 + 4, 16, RED); P(d, x0 + 5, 18, RED)
        R(d, x0 + 1, 25, 3, 9, '#2a2a3a'); R(d, x0 + 6, 25, 3, 9, '#2a2a3a')
        R(d, x0, 34, 4, 2, K); R(d, x0 + 6, 34, 4, 2, K)
    if arms == 'up':
        R(d, x0 - 2, 9, 2, 8, col); R(d, x0 - 2, 7, 2, 2, skin); R(d, x0 + 10, 9, 2, 8, col); R(d, x0 + 10, 7, 2, 2, skin)
    elif arms == 'down':
        R(d, x0 - 2, 16, 2, 8, shade(col)); R(d, x0 - 2, 24, 2, 1, skin); R(d, x0 + 10, 16, 2, 8, col); R(d, x0 + 10, 24, 2, 1, skin)
    elif arms == 'drink':
        R(d, x0 - 2, 16, 2, 8, shade(col)); R(d, x0 - 2, 24, 2, 1, skin)
        R(d, x0 + 10, 16, 5, 2, col); R(d, x0 + 14, 14, 2, 2, skin); R(d, x0 + 13, 8, 4, 6, '#f0a020'); R(d, x0 + 13, 7, 4, 2, WHITE)
    elif arms == 'conga':
        R(d, x0 + 10, 16, 7, 2, col); R(d, x0 + 16, 16, 1, 2, skin); R(d, x0 - 2, 16, 2, 6, shade(col))
    return outline(im)


def waiter():
    im, d = new(26, 38)
    x0 = 6
    R(d, x0 + 1, 8, 8, 8, SKIN2); P(d, x0 + 3, 11, K); P(d, x0 + 7, 11, K); R(d, x0 + 4, 14, 3, 1, '#8a2a2a'); R(d, x0 + 1, 7, 8, 2, K)
    R(d, x0, 17, 10, 10, K); R(d, x0 + 3, 17, 4, 8, WHITE); R(d, x0 + 4, 17, 2, 2, RED)
    R(d, x0 + 1, 27, 3, 9, K); R(d, x0 + 6, 27, 3, 9, K); R(d, x0, 36, 4, 2, K); R(d, x0 + 6, 36, 4, 2, K)
    R(d, x0 - 2, 18, 2, 8, '#2a2a3a')
    # arm op med bakke
    R(d, x0 + 10, 10, 2, 9, K); R(d, x0 + 10, 8, 2, 2, SKIN2)
    R(d, x0 + 4, 6, 16, 2, '#c8ccd8'); R(d, x0 + 4, 6, 16, 1, '#ffffff')
    for xx in (x0 + 6, x0 + 10, x0 + 14):
        R(d, xx, 2, 3, 4, '#cfe6f4'); R(d, xx, 3, 3, 3, '#f6e9a0')
    return outline(im)


def tree(h=60, lights=True, seed=1):
    w = int(h * 0.62)
    im, d = new(w, h)
    cx = w // 2
    R(d, cx - 2, h - 8, 5, 8, '#6a421c')
    tiers = 6
    th = (h - 12) // tiers
    for i in range(tiers):
        yy = 6 + i * th
        ww = int((i + 1.4) / (tiers + 0.4) * w)
        d.polygon([(cx, yy - 3), (cx + ww // 2, yy + th + 2), (cx - ww // 2, yy + th + 2)], fill=hx('#2a7a3a' if i % 2 else '#34924a'))
        R(d, cx - ww // 2 + 1, yy + th + 1, ww - 2, 1, '#1f5a2c')
    # stjerne
    R(d, cx - 1, 0, 3, 5, GOLD); R(d, cx - 3, 2, 7, 1, GOLD); P(d, cx, 2, '#fff6c0')
    if lights:
        r = random.Random(seed)
        px = im.load()
        cols = [RED, GOLD, '#6ec1ff', WHITE, '#ff9ab0']
        n = 0
        tries = 0
        while n < h // 2 and tries < 2000:
            tries += 1
            x, y = r.randrange(w), r.randrange(8, h - 9)
            if px[x, y][3] and px[x, y][:3] in (hx('#2a7a3a')[:3], hx('#34924a')[:3]):
                P(d, x, y, cols[n % len(cols)])
                n += 1
    return outline(im)


def lamp_post(h=58):
    im, d = new(14, h)
    R(d, 6, 8, 2, h - 8, '#2a3048'); R(d, 4, h - 4, 6, 4, '#2a3048')
    R(d, 3, 2, 8, 7, '#2a3048'); R(d, 4, 3, 6, 5, '#fff2a0'); R(d, 2, 0, 10, 2, '#2a3048'); R(d, 3, -1, 8, 1, WHITE)
    R(d, 2, 0, 10, 1, WHITE)
    return im


def disco_ball(r=9):
    im, d = new(r * 2 + 1, r * 2 + 6)
    R(d, r, 0, 1, 5, '#8a92a4')
    cols = ['#d8e4f4', '#9ab0d0', '#ffffff', '#b8c8e4', '#7a90b8']
    for y in range(-r, r + 1):
        for x in range(-r, r + 1):
            if x * x + y * y <= r * r:
                c = cols[((x + r) // 2 + (y + r) // 2 * 3) % len(cols)]
                if (x + y) < -r // 2:
                    c = light(c, 1.1, 20)
                P(d, x + r, y + r + 5, c)
    return outline(im)


def speech(txt, col=WHITE, tc=K):
    w = text_w(txt) + 8
    im, d = new(w, 17)
    R(d, 0, 0, w, 11, col); R(d, 1, 11, 4, 2, col); R(d, 2, 13, 2, 2, col)
    text(d, txt, 4, 2, tc)
    return outline(im)


# ---------------------------------------------------------------- HUD (F-koordinater)
def panel(fd, x, y, w, h, fill='#1d2a44', edge='#4a6aa8', top='#6e8ed0'):
    fd.rectangle((x, y, x + w - 1, y + h - 1), fill=hx(K))
    fd.rectangle((x + 2, y + 2, x + w - 3, y + h - 3), fill=hx(edge))
    fd.rectangle((x + 4, y + 4, x + w - 5, y + h - 5), fill=hx(fill))
    fd.rectangle((x + 4, y + 4, x + w - 5, y + 5), fill=hx(top))


def button(sc, x, y, w, h, label, fill=GREEN, tc=K, s=2):
    fd = sc.fd
    fd.rectangle((x, y + 4, x + w - 1, y + h + 3), fill=hx(K))
    fd.rectangle((x, y, x + w - 1, y + h - 1), fill=hx(K))
    fd.rectangle((x + 2, y + 2, x + w - 3, y + h - 3), fill=hx(fill))
    fd.rectangle((x + 2, y + 2, x + w - 3, y + 5), fill=hx(light(fill)))
    fd.rectangle((x + 2, y + h - 7, x + w - 3, y + h - 3), fill=hx(shade(fill)))
    tw = text_w(label, s)
    text(fd, label, x + (w - tw) // 2, y + (h - 7 * s) // 2, tc, s)


def clock_icon(fd, x, y):
    fd.ellipse((x, y, x + 17, y + 17), fill=hx(K))
    fd.ellipse((x + 2, y + 2, x + 15, y + 15), fill=hx(WHITE))
    fd.rectangle((x + 8, y + 4, x + 9, y + 9), fill=hx(K))
    fd.rectangle((x + 8, y + 8, x + 12, y + 9), fill=hx(RED))


def hud(sc, label, clock, hearts=3, count=0, icon=None, world_col='#6ec1ff'):
    fd = sc.fd
    # hjerter
    panel(fd, 12, 10, 96, 34)
    hj = scale(julehjerte(), 2)
    for i in range(3):
        im = hj
        if i >= hearts:
            im = Image.eval(hj, lambda v: v)   # samme form
            im = im.convert('LA').convert('RGBA')
            im.putalpha(Image.eval(hj.split()[3], lambda a: a // 3))
        sc.F.alpha_composite(im, (20 + i * 28, 16))
    # banenavn
    tw = text_w(label, 2)
    bx = 320 - (tw + 28) // 2
    panel(fd, bx, 10, tw + 28, 30, fill='#1d2a44', edge=world_col, top=light(world_col))
    text(fd, label, bx + 14, 18, WHITE, 2)
    # ur
    panel(fd, 486, 10, 142, 34)
    clock_icon(fd, 494, 18)
    text(fd, clock, 518, 20, GOLD, 2)
    text(fd, '/18:00', 582, 24, '#9ab0d8', 1)
    # taeller
    if icon is not None:
        panel(fd, 12, 48, 96, 30)
        ic = scale(icon, 2)
        sc.F.alpha_composite(ic, (18, 63 - ic.height // 2))
        text(fd, 'x%02d' % count, 48, 56, WHITE, 2)


def progress(sc, t, world_col='#6ec1ff', goal='PARTY'):
    """Smal fremdriftslinje nederst: hvor langt er der til festen."""
    fd = sc.fd
    x0, x1, y = 200, 440, 340
    fd.rectangle((x0 - 2, y - 2, x1 + 2, y + 7), fill=hx(K))
    fd.rectangle((x0, y, x1, y + 5), fill=hx('#2a3654'))
    fd.rectangle((x0, y, int(x0 + (x1 - x0) * t), y + 5), fill=hx(world_col))
    for k in (1 / 3, 2 / 3):
        fd.rectangle((int(x0 + (x1 - x0) * k), y - 2, int(x0 + (x1 - x0) * k) + 1, y + 7), fill=hx(K))
    hx_ = int(x0 + (x1 - x0) * t)
    fd.rectangle((hx_ - 4, y - 5, hx_ + 4, y + 10), fill=hx(K)); fd.rectangle((hx_ - 2, y - 3, hx_ + 2, y + 8), fill=hx(RED))
    b = scale(beer(), 1)
    sc.F.alpha_composite(b, (x1 + 8, y - 6))


