#!/usr/bin/env python3
"""Tegner al grafik til Late for the Party og pakker den til assets/.

Koer:  python3 tools/build_assets.py   (kraever Pillow)
Laver: assets/atlas.png + atlas.json, assets/bg/<tema>_<lag>.png, title.png, map.png, cut_*.png, hq.png, banner.png, preview.png
Alt tegnes i halv oploesning (320x180) og skaleres 2x til spillets 640x360, som i de andre spil.
"""
import json, math, random, sys
from pathlib import Path
from PIL import Image, ImageDraw
import px
from px import *

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'assets'
BG = ASSETS / 'bg'
GY = 150          # jordlinjen i L (300 i spillet)
CLEAR = (0, 0, 0, 0)

LOOKS = [
    dict(id='r1', hair='#6b3f22', skin='#f0b48c', long=False),
    dict(id='r2', hair='#1b1b22', skin='#8a5a3a', long=True),
    dict(id='r3', hair='#f2c418', skin='#f6c8a8', long=True),
    dict(id='r4', hair='#c84a2a', skin='#f6c8a8', long=False),
    dict(id='r5', hair='#3a2a1a', skin='#c88a5a', long=True),
]


def x2(im):
    return im.resize((im.width * 2, im.height * 2), Image.NEAREST)


def with_look(look, fn):
    old = (px.SKIN, px.SKIN2)
    px.SKIN, px.SKIN2 = look['skin'], shade(look['skin'], 0.84)
    try:
        return fn()
    finally:
        px.SKIN, px.SKIN2 = old


def runner(pose, outfit, look, bag=None):
    if bag is None:
        bag = outfit == 'office'
    return with_look(look, lambda: px.hero(pose, outfit, bag, look['hair'], look['long']))


def runner_slide(outfit, look):
    o = OUTFITS[outfit]
    skin, sk2, hair = look['skin'], shade(look['skin'], 0.84), look['hair']
    im, d = new(40, 20)
    R(d, 20, 13, 12, 4, o['p']); R(d, 18, 10, 8, 4, shade(o['p'])); R(d, 25, 9, 4, 3, o['p']); R(d, 31, 11, 4, 6, o['shoe'])
    R(d, 9, 9, 12, 8, o['j']); R(d, 9, 15, 12, 2, o['js'])
    R(d, 17, 9, 4, 4, o['shirt']); R(d, 18, 10, 1, 3, o['tie'])
    if o['dots']:
        for (ax, ay) in ((11, 11), (14, 13), (12, 15), (22, 14), (27, 15), (20, 11)):
            P(d, ax, ay, WHITE)
        for (ax, ay) in ((13, 10), (15, 15), (24, 16)):
            P(d, ax, ay, '#2f9a4a')
    R(d, 5, 15, 6, 2, o['js']); R(d, 3, 15, 2, 2, sk2)
    R(d, 6, 3, 8, 7, skin); R(d, 6, 3, 2, 4, hair); R(d, 8, 3, 2, 1, hair); P(d, 12, 5, K); R(d, 11, 8, 2, 1, '#8a2a2a')
    if look['long']:
        R(d, 4, 4, 3, 8, hair)
    d.polygon([(5, 3), (14, 3), (11, 0), (7, 0)], fill=hx(RED)); R(d, 0, 0, 8, 2, RED); R(d, 0, 1, 3, 3, WHITE)
    R(d, 5, 2, 10, 2, WHITE)
    return outline(im)


def cell(spr, ax, extra=None):
    """Laegger en figur ind i motorens celle paa 128x96: kroppens midte 48 px inde, foedderne i bunden."""
    c = Image.new('RGBA', (128, 96), CLEAR)
    im = x2(spr)
    c.alpha_composite(im, (max(0, 48 - ax * 2), 96 - im.height))
    if extra is not None:
        c.alpha_composite(extra[0], extra[1])
    return c


def excuse_bubble():
    t = 'EXCUSE ME!'
    w = text_w(t) + 8
    im, d = new(w, 17)
    R(d, 0, 0, w, 11, WHITE); R(d, 1, 11, 4, 2, WHITE); R(d, 1, 13, 2, 2, WHITE)
    text(d, t, 4, 2, '#c8102e')
    return outline(im)


def portrait(look, outfit='office'):
    spr = runner('stand', outfit, look, bag=False)
    crop = spr.crop((2, 0, 25, 24))                     # hue, hoved og skuldre
    im = Image.new('RGBA', (52, 56), hx('#2a3654'))
    d = ImageDraw.Draw(im)
    d.rectangle((2, 2, 49, 3), fill=hx('#4a5a8a'))
    big = crop.resize((crop.width * 2, crop.height * 2), Image.NEAREST)
    im.alpha_composite(big, ((52 - big.width) // 2 + 2, 56 - big.height))
    d.rectangle((0, 0, 51, 55), outline=hx(K), width=2)
    return im


# ---------------------------------------------------------------- nye figurer
def bob(im, n=1):
    """Andet billede i en gangart: figuren et pixel laengere nede."""
    out = Image.new('RGBA', im.size, CLEAR)
    out.alpha_composite(im.crop((0, 0, im.width, im.height - n)), (0, n))
    return out


def cyclist2():
    a = flip(px.cyclist())
    px.WHEEL_ALT = True
    b = flip(px.cyclist())
    px.WHEEL_ALT = False
    return a, b


def cargo2():
    a = flip(px.cargo_bike())
    px.WHEEL_ALT = True
    b = flip(px.cargo_bike())
    px.WHEEL_ALT = False
    return a, b


def snowman():
    im, d = new(18, 26)
    d.ellipse((1, 12, 16, 25), fill=hx('#f4f7fb')); d.ellipse((3, 5, 14, 15), fill=hx('#f4f7fb'))
    d.ellipse((1, 18, 16, 25), fill=hx('#f4f7fb'))
    R(d, 3, 22, 12, 3, '#c8d4e4')
    R(d, 5, 1, 8, 5, K); R(d, 3, 5, 12, 1, K); R(d, 5, 4, 8, 1, RED)
    P(d, 6, 8, K); P(d, 10, 8, K); R(d, 3, 10, 5, 1, '#f08a2a'); P(d, 8, 10, '#f08a2a')
    R(d, 4, 14, 10, 2, GREEN); R(d, 11, 15, 2, 4, GREEN)
    P(d, 8, 18, K); P(d, 8, 21, K)
    return outline(im)


def snowball():
    im, d = new(8, 8)
    d.ellipse((0, 0, 7, 7), fill=hx('#f4f7fb')); P(d, 2, 2, '#ffffff'); R(d, 3, 5, 3, 2, '#c8d4e4')
    return outline(im)


def desk():
    im, d = new(32, 24)
    R(d, 0, 10, 32, 3, '#c8a060'); R(d, 0, 10, 32, 1, '#e8c888')
    R(d, 2, 13, 2, 11, '#8a92a4'); R(d, 28, 13, 2, 11, '#8a92a4')
    R(d, 18, 13, 9, 10, '#e8e8ee'); R(d, 19, 15, 7, 1, '#8a92a4'); R(d, 19, 19, 7, 1, '#8a92a4')
    R(d, 9, 0, 13, 8, '#1b1b22'); R(d, 10, 1, 11, 6, '#3ab4a0'); R(d, 11, 2, 5, 1, WHITE); R(d, 11, 4, 8, 1, '#b8f0e0')
    R(d, 14, 8, 3, 2, '#3a3f4c')
    R(d, 2, 7, 6, 3, '#fbfaf2'); R(d, 2, 8, 6, 1, '#c8ccd8')
    R(d, 24, 6, 4, 4, RED); R(d, 28, 7, 1, 2, RED)
    for i, xx in enumerate(range(1, 31, 4)):
        P(d, xx, 13, [RED, GOLD, '#3ad46a', '#6ec1ff'][i % 4])
    return outline(im)


def colleague(frame=0):
    im = px.guest('#5a6a9a', hat='none', arms='down', hair='#3a2a1a')
    d = ImageDraw.Draw(im)
    R(d, 15, 20, 7, 6, '#fbfaf2'); R(d, 16, 21, 5, 1, '#7a86a8'); R(d, 16, 23, 5, 1, '#7a86a8')   # papirer i haanden
    return bob(im) if frame else im


def binders():
    im, d = new(18, 16)
    for i, c in enumerate(('#c8102e', '#2f6ad8', '#2f9a4a')):
        R(d, 1 + i * 5, 2 + i % 2, 5, 14 - i % 2, c); R(d, 2 + i * 5, 5, 3, 4, WHITE)
        P(d, 3 + i * 5, 12, '#d0d4e0')
    R(d, 0, 14, 18, 2, '#c8a060')
    return outline(im)


def plane():
    im, d = new(14, 8)
    d.polygon([(0, 3), (13, 0), (6, 7)], fill=hx('#fbfaf2')); d.polygon([(0, 3), (6, 4), (6, 7)], fill=hx('#c8ccd8'))
    d.line((0, 3, 13, 0), fill=hx('#ffffff'))
    return flip(outline(im))


def copier(frame=0):
    im, d = new(40, 30)
    R(d, 2, 6, 36, 20, '#dfe2ea'); R(d, 2, 6, 36, 2, '#ffffff'); R(d, 2, 22, 36, 4, '#a8aebc')
    R(d, 4, 1, 26, 6, '#b8bcc8'); R(d, 4, 1, 26, 1, '#d8dce8')
    R(d, 5, 10, 14, 9, '#1b1b22')
    R(d, 7, 14, 3, 2, '#ff4a4a'); R(d, 14, 14, 3, 2, '#ff4a4a')
    d.line((6, 12, 10, 13), fill=hx('#ff4a4a')); d.line((17, 12, 13, 13), fill=hx('#ff4a4a'))
    R(d, 9, 17, 6, 1, '#ff4a4a')
    R(d, 22, 10, 14, 3, '#8a92a4'); R(d, 22, 15, 14, 3, '#8a92a4'); R(d, 22, 20, 14, 1, '#8a92a4')
    if frame:
        R(d, 0, 11, 4, 5, '#fbfaf2'); R(d, 0, 12, 3, 1, '#7a86a8')
    else:
        R(d, 0, 12, 2, 4, '#fbfaf2')
    for cx in (8, 32):
        d.ellipse((cx - 2, 25, cx + 2, 29), fill=hx('#20202a'))
    return outline(im)


def conga(frame=0):
    a = px.guest('#3a6ad8', arms='conga', hat='paper')
    b = px.guest('#e8862a', arms='up' if frame else 'conga', hat='nisse')
    im = Image.new('RGBA', (40, a.height), CLEAR)
    im.alpha_composite(flip(b), (16, frame))
    im.alpha_composite(flip(a), (0, 0 if not frame else 0))
    return im


def gifts():
    im, d = new(18, 18)
    R(d, 0, 8, 12, 10, RED); R(d, 5, 8, 2, 10, GOLD); R(d, 0, 12, 12, 2, GOLD)
    R(d, 9, 3, 9, 8, '#2f9a4a'); R(d, 13, 3, 1, 8, WHITE); R(d, 9, 6, 9, 1, WHITE)
    R(d, 4, 6, 2, 2, GOLD); R(d, 7, 6, 2, 2, GOLD); R(d, 12, 1, 3, 2, WHITE)
    R(d, 12, 11, 6, 7, '#6ec1ff'); R(d, 14, 11, 1, 7, RED)
    return outline(im)


def cork():
    im, d = new(6, 8)
    R(d, 1, 0, 4, 3, '#d8b070'); R(d, 0, 3, 6, 5, '#b88a48'); R(d, 0, 3, 6, 1, '#e8c888')
    return outline(im)


def snaps():
    im, d = new(12, 14)
    R(d, 2, 1, 8, 8, '#cfe6f4'); R(d, 3, 3, 6, 5, '#f6e9a0'); R(d, 2, 1, 1, 8, '#ffffff')
    R(d, 5, 9, 2, 3, '#cfe6f4'); R(d, 2, 12, 8, 2, '#cfe6f4')
    return outline(im)


def life():
    return outline(px.julehjerte().crop((1, 1, 10, 10)), GOLD)


def garland():
    """Guirlande af julehjerter mellem to snore fra loftet. Haenger lavt: slide under."""
    w, h = 44, 130
    im = Image.new('RGBA', (w, h), CLEAR)
    d = ImageDraw.Draw(im)
    rope = hx('#e8e0d0')
    d.line((1, 0, 1, h - 14), fill=rope); d.line((w - 2, 0, w - 2, h - 14), fill=rope)
    for x in range(1, w - 1):
        y = h - 14 + round(3 * (1 - ((x - w / 2) / (w / 2)) ** 2))
        d.point((x, y), fill=rope)
    for i, x0 in enumerate(range(3, w - 6, 7)):
        y0 = h - 13 + round(3 * (1 - ((x0 + 2 - w / 2) / (w / 2)) ** 2))
        c = RED if i % 2 == 0 else WHITE
        R(d, x0, y0, 2, 2, c); R(d, x0 + 3, y0, 2, 2, c); R(d, x0, y0 + 2, 5, 2, c); R(d, x0 + 1, y0 + 4, 3, 1, c); P(d, x0 + 2, y0 + 5, c)
        P(d, x0 + 2, y0 - 1, '#fff6b0')
    return im


def mistletoe():
    w, h = 44, 130
    im = Image.new('RGBA', (w, h), CLEAR)
    d = ImageDraw.Draw(im)
    d.line((22, 0, 22, h - 16), fill=hx('#e8e0d0'))
    b, bd = new(18, 16)
    for (ax, ay, ww, hh) in ((6, 0, 6, 12), (1, 3, 6, 8), (11, 3, 6, 8), (3, 9, 5, 6), (10, 9, 5, 6)):
        bd.ellipse((ax, ay, ax + ww, ay + hh), fill=hx('#2f8a3a'))
    for (ax, ay) in ((8, 4), (4, 7), (13, 6), (6, 11), (11, 11)):
        P(bd, ax, ay, '#5ac06a')
    for (ax, ay) in ((7, 8), (10, 7), (9, 10)):
        R(bd, ax, ay, 2, 2, WHITE)
    R(bd, 7, 0, 5, 2, RED); R(bd, 6, 1, 2, 3, RED); R(bd, 11, 1, 2, 3, RED)
    b = outline(b)
    im.alpha_composite(b, (22 - b.width // 2, h - b.height))
    return im


def flagpole(done):
    im, d = new(22, 46)
    R(d, 3, 2, 2, 44, '#c8ccd8'); R(d, 1, 43, 6, 3, '#8a92a4'); R(d, 2, 0, 4, 3, GOLD)
    c = '#2f9a4a' if done else RED
    d.polygon([(5, 4), (20, 9), (5, 15)], fill=hx(c))
    if done:
        d.line((8, 9, 10, 11), fill=hx(WHITE)); d.line((10, 11, 14, 7), fill=hx(WHITE))
    else:
        R(d, 8, 8, 3, 3, WHITE)
    return outline(im)


def goal_sign():
    im, d = new(34, 50)
    R(d, 15, 12, 3, 38, '#8a92a4'); R(d, 11, 47, 11, 3, '#5a6070')
    R(d, 0, 2, 34, 14, '#2f9a4a'); R(d, 0, 2, 34, 2, '#5ac06a'); R(d, 0, 14, 34, 2, '#1f6a2c')
    text(d, 'GO', 5, 6, WHITE)
    d.polygon([(22, 5), (30, 9), (22, 13)], fill=hx(WHITE)); R(d, 18, 8, 5, 3, WHITE)
    R(d, 14, 0, 5, 3, GOLD)
    return outline(im)


def wardrobe():
    im, d = new(40, 52)
    R(d, 0, 2, 40, 50, '#8a5a2a'); R(d, 0, 2, 40, 3, '#b07a3a'); R(d, 2, 6, 36, 42, '#3a2414')
    R(d, 4, 9, 32, 1, '#c8ccd8')
    R(d, 12, 10, 1, 3, '#c8ccd8')
    R(d, 6, 13, 13, 18, '#cc2f3d'); R(d, 11, 13, 3, 7, WHITE); R(d, 11, 13, 3, 2, '#2f9a4a')
    R(d, 8, 31, 4, 14, '#cc2f3d'); R(d, 13, 31, 4, 14, '#cc2f3d')
    for (ax, ay) in ((7, 16), (16, 18), (8, 24), (15, 27), (9, 35), (15, 40), (10, 42), (17, 22)):
        P(d, ax, ay, WHITE)
    for (ax, ay) in ((9, 20), (16, 24), (14, 35)):
        P(d, ax, ay, '#2f9a4a')
    R(d, 24, 13, 10, 16, '#2f4170'); R(d, 28, 13, 2, 6, WHITE)
    R(d, 30, 10, 1, 3, '#c8ccd8')
    R(d, 0, 48, 40, 4, '#6a421c')
    R(d, 17, 0, 6, 4, GOLD)
    return outline(im)


def bar_sprite():
    im, d = new(70, 50)
    R(d, 0, 22, 70, 28, '#6a3a1e'); R(d, 0, 22, 70, 3, '#b07a4a'); R(d, 0, 25, 70, 1, '#3a1e0e')
    for xx in range(4, 70, 10):
        R(d, xx, 28, 6, 18, '#5a3018')
    R(d, 12, 6, 30, 16, '#c8ccd8'); R(d, 12, 6, 30, 2, WHITE)
    for k, xx in enumerate((16, 26, 36)):
        R(d, xx, 2, 3, 8, '#c8ccd8'); R(d, xx - 1, 0, 5, 3, [RED, GREEN, GOLD][k])
    R(d, 46, 2, 24, 10, K); text(d, 'BAR', 51, 3, GOLD)
    for k in range(3):
        R(d, 48 + k * 6, 14, 4, 8, '#f0a020'); R(d, 48 + k * 6, 13, 4, 2, WHITE)
    return outline(im)


def flag_img(code):
    bg, cross, inner = {'DK': ('#c8102e', '#ffffff', None), 'SE': ('#006aa7', '#fecc00', None), 'NO': ('#ba0c2f', '#ffffff', '#00205b'),
                        'FI': ('#ffffff', '#002f6c', None), 'IS': ('#02529c', '#ffffff', '#dc1e35')}[code]
    im = Image.new('RGBA', (24, 18), hx(K))
    d = ImageDraw.Draw(im)
    d.rectangle((1, 1, 22, 16), fill=hx(bg))
    d.rectangle((7, 1, 10, 16), fill=hx(cross)); d.rectangle((1, 7, 22, 10), fill=hx(cross))
    if inner:
        d.rectangle((8, 1, 9, 16), fill=hx(inner)); d.rectangle((1, 8, 22, 9), fill=hx(inner))
    return im


def small(col, w=4, h=4):
    im, d = new(w, h)
    R(d, 0, 0, w, h, col)
    return im


def star():
    im, d = new(5, 5)
    R(d, 2, 0, 1, 5, GOLD); R(d, 0, 2, 5, 1, GOLD); P(d, 2, 2, '#fff6c0')
    return im


def clock_img():
    im = Image.new('RGBA', (20, 20), CLEAR)
    d = ImageDraw.Draw(im)
    d.ellipse((0, 0, 19, 19), fill=hx(K)); d.ellipse((2, 2, 17, 17), fill=hx(WHITE))
    d.rectangle((9, 4, 10, 10), fill=hx(K)); d.rectangle((9, 9, 14, 10), fill=hx(RED))
    return im


def grey(im):
    g = im.convert('LA').convert('RGBA')
    g.putalpha(Image.eval(im.split()[3], lambda a: a // 2))
    return g


# ---------------------------------------------------------------- atlas
def build_atlas():
    F = {}
    for lk in LOOKS:
        for outfit in ('office', 'xmas'):
            base = f"runner/{lk['id']}/{outfit}"
            F[f'{base}/run0'] = cell(runner('run1', outfit, lk), 14)
            F[f'{base}/run1'] = cell(runner('run2', outfit, lk), 14)
            F[f'{base}/jump'] = cell(runner('jump', outfit, lk), 14)
            F[f'{base}/slide'] = cell(runner_slide(outfit, lk), 15)
            F[f'{base}/swing'] = cell(runner('point', outfit, lk, bag=False), 14, (excuse_bubble(), (58, 6)))
            F[f'{base}/stand'] = cell(runner('stand', outfit, lk, bag=False), 14)
            F[f'{base}/cheer'] = cell(runner('cheer', outfit, lk, bag=False), 14)
            F[f"portrait/{lk['id']}/{outfit}"] = portrait(lk, outfit)
    a, b = cyclist2(); F['enemy/bike0'], F['enemy/bike1'] = x2(a), x2(b)
    a, b = cargo2(); F['enemy/cargo0'], F['enemy/cargo1'] = x2(a), x2(b)
    dw = flip(px.dog_walker()); F['enemy/dogwalk0'], F['enemy/dogwalk1'] = x2(dw), x2(bob(dw))
    F['obst/snowman'] = x2(snowman()); F['obst/snowball'] = x2(snowball())
    F['obst/garland'] = x2(garland()); F['obst/mistletoe'] = x2(mistletoe())
    F['obst/desk'] = x2(desk())
    F['enemy/colleague0'], F['enemy/colleague1'] = x2(flip(colleague(0))), x2(flip(colleague(1)))
    pr = flip(px.printer()); F['enemy/printer0'], F['enemy/printer1'] = x2(pr), x2(bob(pr))
    ch = px.chair(); F['enemy/chair0'], F['enemy/chair1'] = x2(ch), x2(flip(ch))
    F['obst/binders'] = x2(binders()); F['obst/plane'] = x2(plane())
    F['enemy/copier0'], F['enemy/copier1'] = x2(copier(0)), x2(copier(1))
    F['enemy/conga0'], F['enemy/conga1'] = x2(conga(0)), x2(conga(1))
    g = flip(px.guest('#8a4ab0', arms='drink', hat='paper', dress=True, hair='#f2c418')); F['enemy/guest0'], F['enemy/guest1'] = x2(g), x2(bob(g))
    w = flip(px.waiter()); F['enemy/waiter0'], F['enemy/waiter1'] = x2(w), x2(bob(w))
    F['obst/gifts'] = x2(gifts()); F['obst/cork'] = x2(cork())
    F['item/memo'] = x2(px.memo()); F['item/bauble'] = x2(px.bauble()); F['item/hjerte'] = x2(px.julehjerte())
    F['item/snaps'] = x2(snaps()); F['item/life'] = x2(x2(life()).resize((22, 22), Image.NEAREST)) if False else x2(life())
    F['item/beer'] = x2(px.beer())
    F['hud/heart'] = x2(px.julehjerte()); F['hud/heart_empty'] = grey(x2(px.julehjerte())); F['hud/clock'] = clock_img()
    F['obj/flag0'] = x2(flagpole(False)); F['obj/flag1'] = x2(flagpole(True)); F['obj/goal'] = x2(goal_sign())
    F['obj/taxi'] = x2(px.taxi()); F['obj/wardrobe'] = x2(wardrobe()); F['obj/bar'] = x2(bar_sprite())
    F['fx/puff'] = x2(small('#f4f7fb')); F['fx/star'] = x2(star()); F['fx/paper'] = x2(small('#fbfaf2', 3, 4)); F['fx/confetti'] = x2(small(RED, 2, 3))
    for c in ('DK', 'SE', 'NO', 'FI', 'IS'):
        F[f'flag/{c}'] = flag_img(c)
    # pak: hylder efter hoejde
    items = sorted(F.items(), key=lambda kv: (-kv[1].height, kv[0]))
    W, pad = 1024, 2
    x = y = pad; rowh = 0
    pos = {}
    for k, im in items:
        if x + im.width + pad > W:
            x = pad; y += rowh + pad; rowh = 0
        pos[k] = (x, y); x += im.width + pad; rowh = max(rowh, im.height)
    H = y + rowh + pad
    atlas = Image.new('RGBA', (W, H), CLEAR)
    frames = {}
    for k, im in items:
        atlas.paste(im, pos[k])
        frames[k] = {'frame': {'x': pos[k][0], 'y': pos[k][1], 'w': im.width, 'h': im.height}, 'rotated': False, 'trimmed': False,
                     'spriteSourceSize': {'x': 0, 'y': 0, 'w': im.width, 'h': im.height}, 'sourceSize': {'w': im.width, 'h': im.height}}
    atlas.save(ASSETS / 'atlas.png', optimize=True)
    (ASSETS / 'atlas.json').write_text(json.dumps({'frames': frames, 'meta': {'image': 'atlas.png', 'size': {'w': W, 'h': H}, 'scale': '1'}}, indent=1))
    return F


# ---------------------------------------------------------------- baggrunde
def L(w=320, h=180, bg=None):
    im = Image.new('RGBA', (w, h), hx(bg) if bg else CLEAR)
    return im, ImageDraw.Draw(im)


def grad(d, w, y0, y1, cols):
    n = len(cols) - 1
    for y in range(y0, y1):
        t = (y - y0) / max(1, (y1 - y0 - 1)) * n
        i = min(int(t), n - 1); f = t - i
        for x in range(w):
            th = (((x % 2) * 2 + (y % 2)) / 4.0 + 0.125)
            d.point((x, y), fill=hx(cols[i + 1] if f > th else cols[i]))


def paste_b(dst, spr, x, base, fl=False):
    """Laeg en figur i L med foedderne paa linjen base."""
    s = flip(spr) if fl else spr
    dst.alpha_composite(s, (x, base - s.height))


def lights(d, x0, x1, y0, sag=5, period=60, step=4):
    cols = [RED, GOLD, '#3ad46a', '#6ec1ff']
    for x in range(x0, x1):
        y = y0 + int(sag * abs(math.sin((x - x0) / period * math.pi)))
        P(d, x, y, '#2a3a2a')
        if (x - x0) % step == 1:
            P(d, x, y + 1, cols[((x - x0) // step) % 4])


# ----- byen
SKY_CITY = ['#141838', '#24306a', '#4a4690', '#8a5a98', '#d0789a', '#f0a07a']


def city_sky():
    im, d = L(bg='#141838')
    grad(d, 320, 0, 140, SKY_CITY)
    R(d, 0, 140, 320, 40, '#f0a07a')
    r = random.Random(2)
    for _ in range(50):
        P(d, r.randrange(320), r.randrange(0, 40), '#e8ecff')
    d.ellipse((34, 14, 48, 28), fill=hx('#fff2c8')); d.ellipse((38, 12, 52, 26), fill=hx(SKY_CITY[0]))
    return x2(im)


def city_far():
    im, d = L()
    r = random.Random(4)
    x = 0
    while x < 320:
        bw = r.randrange(10, 24); top = r.randrange(84, 112)
        bw = min(bw, 320 - x)
        col = r.choice(['#3a3a6e', '#423f78', '#36406e'])
        R(d, x, top, bw, GY - top, col); R(d, x, top, bw, 1, '#e8eef8')
        for wy in range(top + 3, GY - 4, 4):
            for wx in range(x + 2, x + bw - 1, 3):
                if r.random() < 0.3:
                    P(d, wx, wy, '#f6d37a')
        x += bw
    R(d, 250, 70, 5, 30, '#3e6e6a'); d.polygon([(248, 70), (257, 70), (252, 54)], fill=hx('#3e6e6a'))
    return x2(im)


def hq():
    """Domicilet: lang kontorblok i glas med lyst atrium. Frit tegnet. Navnet som pixeltekst paa taget."""
    w, h = 150, 112
    im, d = L(w, h)
    r = random.Random(7)
    top = 18
    R(d, 6, top + 4, w - 12, h - top - 4, '#2a3f6a')
    R(d, 2, top, w - 4, 5, '#d8dce8'); R(d, 2, top, w - 4, 1, WHITE)
    for fy in range(top + 8, h - 2, 9):
        R(d, 6, fy, w - 12, 2, '#c8d0e0')
        for wx in range(8, w - 10, 5):
            c = '#ffd87a' if r.random() < 0.55 else ('#6a8ac0' if r.random() < 0.5 else '#3a5488')
            R(d, wx, fy + 2, 4, 6, c)
            if c == '#ffd87a' and r.random() < 0.12:
                P(d, wx + 1, fy + 3, '#ff6a6a')
    ax = w // 2 - 12
    R(d, ax, top + 5, 24, h - top - 5, '#86bc25'); R(d, ax + 1, top + 5, 22, h - top - 5, '#a8d860')
    for fy in range(top + 8, h, 9):
        R(d, ax + 1, fy, 22, 1, '#6a9a1a')
    R(d, ax + 4, h - 14, 16, 14, '#fff0b0'); R(d, ax + 11, h - 14, 2, 14, '#c8d0e0')
    R(d, w - 12, top + 4, 6, h - top - 4, '#22355a')
    for xx in range(2, w - 2, 3):
        P(d, xx, top - 1, WHITE)
    big = x2(im)
    bd = ImageDraw.Draw(big)
    t = 'DELOITTE'
    s = 3
    tx = (big.width - text_w(t, s)) // 2
    bd.rectangle((tx - 8, 2, tx + text_w(t, s) + 7, 34), fill=hx('#1a2244'))
    bd.rectangle((tx - 6, 4, tx + text_w(t, s) + 5, 32), fill=hx('#0e1430'))
    text(bd, t, tx, 8, WHITE, s)
    bd.rectangle((tx - 2, 34, tx, 38), fill=hx('#8a92a4')); bd.rectangle((tx + text_w(t, s), 34, tx + text_w(t, s) + 2, 38), fill=hx('#8a92a4'))
    return big


def stall(col):
    im, d = new(34, 30)
    R(d, 2, 12, 30, 18, '#8a5a2a'); R(d, 4, 14, 26, 9, '#3a2414'); R(d, 2, 23, 30, 2, '#b07a3a')
    for i in range(0, 34, 4):
        R(d, i, 4, 4, 8, col if (i // 4) % 2 == 0 else WHITE)
    R(d, 0, 2, 34, 3, WHITE)
    R(d, 7, 16, 4, 6, SKIN); R(d, 7, 15, 4, 2, RED)
    R(d, 14, 18, 3, 4, '#c8102e'); R(d, 19, 18, 3, 4, GOLD); R(d, 24, 17, 3, 5, '#2f9a4a')
    for i, xx in enumerate(range(3, 31, 4)):
        P(d, xx, 12, [GOLD, RED, '#3ad46a'][i % 3])
    return im


def city_mid():
    im, d = L(640, 180)
    r = random.Random(5)
    # fortov bag cykelstien
    R(d, 0, 142, 640, 8, '#8a90a8'); R(d, 0, 142, 640, 1, WHITE)
    for x in range(0, 640, 9):
        P(d, x, 145, '#70768c')
    for base in (0, 320):
        # lave huse og boder, saa domicilet kan ses hen over dem
        hx_ = base + 6
        for (w_, top, col) in ((34, 112, '#b0563a'), (28, 118, '#c8a060'), (32, 108, '#7a8ab0')):
            R(d, hx_, top, w_, 142 - top, col); R(d, hx_, top, w_, 2, WHITE); R(d, hx_, top + 2, 2, 142 - top, light(col)); R(d, hx_ + w_ - 2, top + 2, 2, 142 - top, shade(col))
            for wy in range(top + 6, 134, 10):
                for wx in range(hx_ + 4, hx_ + w_ - 6, 8):
                    lit = r.random() < 0.6
                    R(d, wx, wy, 5, 6, '#ffd87a' if lit else '#3a4a7a'); R(d, wx - 1, wy + 6, 7, 1, WHITE)
            R(d, hx_ + w_ // 2 - 3, 132, 6, 10, '#5a3a1a')
            hx_ += w_ + 1
        paste_b(im, stall(RED), base + 118, 142); paste_b(im, stall('#2f9a4a'), base + 232, 142)
        paste_b(im, px.tree(44, seed=base + 1), base + 160, 143)
        paste_b(im, px.tree(34, seed=base + 2), base + 282, 143)
        for lx in (base + 104, base + 206):
            paste_b(im, px.lamp_post(50), lx, 143)
        lights(d, base, base + 320, 100, sag=8, period=102)
    return x2(im)


def city_ground():
    im, d = L(24, 30, '#5a6080')
    R(d, 0, 0, 24, 2, '#f4f7fb'); R(d, 0, 2, 24, 1, '#c8d4e4')
    for (x, y) in ((4, 6), (15, 9), (9, 14), (20, 18), (2, 22), (13, 26)):
        P(d, x, y, '#7a80a0')
    for (x, y) in ((8, 5), (18, 13), (5, 17), (22, 24)):
        P(d, x, y, '#4a5070')
    R(d, 0, 10, 24, 1, '#525878'); R(d, 4, 20, 8, 1, '#e8eef8')
    return x2(im)


def city_pit():
    im, d = L(24, 30, '#1a1c2c')
    for x in range(0, 24, 6):
        d.polygon([(x, 0), (x + 3, 0), (x + 6, 3), (x + 3, 3)], fill=hx(GOLD))
    R(d, 0, 3, 24, 1, '#0c0d18')
    for (x, y, w_) in ((3, 9, 5), (14, 14, 6), (6, 21, 4)):
        R(d, x, y, w_, 1, '#2a2e44')
    return x2(im)


# ----- kontoret
def office_sky():
    im, d = L(bg='#dfe4ee')
    R(d, 0, 0, 320, 8, '#c8ceda')
    for lx in range(10, 320, 46):
        R(d, lx, 8, 26, 3, '#fffbe8'); R(d, lx, 11, 26, 1, '#c8ceda')
    R(d, 0, 76, 320, 74, '#e8ecf3')
    for x in range(0, 320, 2):
        P(d, x, 76, '#c8ceda')
    R(d, 0, 142, 320, 8, '#cdd3df'); R(d, 0, 142, 320, 1, WHITE)
    return x2(im)


def office_far():
    """Vinduer mod natbyen. Gentages hver 640 px."""
    im, d = L()
    r = random.Random(3)
    gb = 70
    for wx in range(5, 320, 80):
        R(d, wx, 18, 70, gb - 14, '#b8c0d0'); R(d, wx + 2, 20, 66, gb - 20, '#1c2650')
        xx = wx + 2
        while xx < wx + 68:
            bw = r.randrange(5, 12); top = r.randrange(38, 56)
            R(d, xx, top, min(bw, wx + 68 - xx), gb - top, '#323e78'); R(d, xx, top, min(bw, wx + 68 - xx), 1, WHITE)
            for wy in range(top + 3, gb - 1, 3):
                for w2 in range(xx + 1, min(xx + bw, wx + 67), 3):
                    if r.random() < 0.3:
                        P(d, w2, wy, '#f6d37a')
            xx += bw + 1
        R(d, wx + 34, 20, 2, gb - 20, '#b8c0d0'); R(d, wx + 2, 44, 66, 1, '#b8c0d0')
        for _ in range(10):
            P(d, r.randrange(wx + 3, wx + 67), r.randrange(21, 38), WHITE)
        R(d, wx, gb, 70, 3, '#f4f6fa')
    return x2(im)


def office_mid():
    im, d = L(640, 180)
    lights(d, 0, 640, 80, sag=4, period=70, step=6)
    # navnet paa vaeggen (en gang pr. 1280 px)
    R(d, 250, 86, 112, 24, K); R(d, 251, 87, 110, 22, WHITE)
    for base, kinds in ((0, 'pccwc'), (372, 'cwcpc')):
        x = base + 8
        for k in kinds:
            if k == 'c':
                paste_b(im, px.cubicle(['#c88a5a', '#f0b48c', '#8a5a3a'][(x // 7) % 3], ['#6a8ad8', '#e86ab0', '#3aa86a'][(x // 11) % 3]), x, 143); x += 50
            elif k == 'p':
                paste_b(im, px.plant(), x, 143); x += 22
            elif k == 'w':
                R(d, x, 96, 36, 30, '#8a92a4'); R(d, x + 1, 97, 34, 28, '#fbfaf6')            # whiteboard
                d.line((x + 4, 118, x + 12, 110), fill=hx(RED)); d.line((x + 12, 110, x + 20, 114), fill=hx(RED)); d.line((x + 20, 114, x + 30, 102), fill=hx(RED))
                R(d, x + 4, 100, 12, 1, '#7a86a8'); R(d, x + 4, 103, 8, 1, '#7a86a8')
                x += 44
    paste_b(im, px.tree(46, seed=9), 600, 143)
    big = x2(im)
    bd = ImageDraw.Draw(big)
    text(bd, 'DELOITTE', 500 + (224 - text_w('DELOITTE', 3)) // 2, 185, '#1b1b22', 3)
    return big


def office_ground():
    im, d = L(24, 30, '#4e5874')
    for y in range(0, 30, 4):
        for x in range((y // 4) % 2 * 4, 24, 8):
            R(d, x, y, 4, 4, '#465068')
    R(d, 0, 0, 24, 1, '#8a92a8')
    return x2(im)


def office_pit():
    im, d = L(24, 30, '#1a1c2c')
    R(d, 0, 0, 24, 2, GOLD)
    return x2(im)


# ----- festen
def party_sky():
    im, d = L(bg='#140c26')
    grad(d, 320, 0, 150, ['#140c26', '#22143c', '#33184a', '#401c50'])
    R(d, 0, 150, 320, 30, '#401c50')
    for row in range(3):
        y0 = 10 + row * 11
        for x in range(0, 320):
            y = y0 + int(5 * abs(math.sin((x + row * 20) / 22)))
            P(d, x, y, '#3a2a4a')
            if x % 6 == row * 2:
                P(d, x, y + 1, [GOLD, '#fff2c0', RED][row])
    big = x2(im)
    ov = Image.new('RGBA', big.size, CLEAR)
    od = ImageDraw.Draw(ov)
    for x, c in ((110, '#ff4a8a'), (320, '#4ab8ff'), (530, GOLD)):
        col = hx(c)[:3]
        od.polygon([(x - 6, 0), (x + 6, 0), (x + 80, 300), (x - 80, 300)], fill=col + (30,))
    big.alpha_composite(ov)
    return big


def party_far():
    im, d = L()
    R(d, 0, 96, 320, 54, '#2a1a3a')
    for x in range(0, 320, 16):
        R(d, x, 96, 8, 54, '#311f44')
    R(d, 0, 94, 320, 3, '#5a2a4a')
    paste_b(im, px.disco_ball(8), 150, 40)
    for (wx) in (30, 250):
        R(d, wx, 104, 30, 34, '#1c2650'); R(d, wx + 14, 104, 2, 34, '#5a3a5a'); R(d, wx - 1, 103, 32, 1, '#5a3a5a'); R(d, wx - 1, 138, 32, 1, '#5a3a5a')
        for (sx, sy) in ((4, 6), (20, 12), (9, 22), (24, 28), (15, 16)):
            P(d, wx + sx, 104 + sy, WHITE)
    return x2(im)


def party_mid(frame):
    im, d = L(640, 180)
    R(d, 0, 144, 640, 6, '#5a321a')
    for base in (0, 320):
        paste_b(im, px.tree(50, seed=base + 3), base + 6, 146)
        # langbord med dug og mad
        tx = base + 60
        R(d, tx, 124, 96, 4, WHITE); R(d, tx + 2, 128, 92, 12, '#e8e0d0'); R(d, tx + 4, 140, 3, 6, '#5a321a'); R(d, tx + 89, 140, 3, 6, '#5a321a')
        for i, fx_ in enumerate(range(tx + 6, tx + 90, 12)):
            c = ['#c8102e', '#f0a020', '#2f9a4a', '#f6e9a0'][i % 4]
            R(d, fx_, 120, 6, 4, c); R(d, fx_ - 1, 123, 8, 1, '#c8ccd8')
            if i % 3 == 0:
                R(d, fx_ + 8, 114, 1, 8, WHITE); P(d, fx_ + 8, 113, GOLD)
        # gaester bag bordet
        cols = ['#3a6ad8', '#e86ab0', '#2f9a4a', '#e8862a', '#8a4ab0']
        for i, gx in enumerate(range(tx + 4, tx + 86, 18)):
            up = (i + frame) % 2 == 0
            g = px.guest(cols[i % 5], arms='up' if up else 'down', hat=['paper', 'nisse', 'none'][i % 3], dress=i % 2 == 1,
                         skin=[SKIN, '#c88a5a', '#f6c8a8', '#8a5a3a'][i % 4], hair=['#3a2a1a', '#f2c418', '#1b1b22', '#c84a2a'][i % 4])
            g = g.crop((0, 0, g.width, 22))
            im.alpha_composite(g, (gx, 124 - 22 - (1 if up else 0)))
        # dansende par
        for i, gx in enumerate((base + 176, base + 200, base + 262, base + 290)):
            up = (i + frame) % 2 == 1
            g = px.guest(cols[(i + 2) % 5], arms='up' if up else 'drink', hat=['nisse', 'paper'][i % 2], dress=i % 2 == 0,
                         skin=['#f6c8a8', SKIN, '#8a5a3a', '#c88a5a'][i % 4], hair=['#c84a2a', '#3a2a1a', '#1b1b22', '#f2c418'][i % 4])
            paste_b(im, g, gx, 146 - (1 if up else 0), fl=i % 2 == 1)
        # hoejttaler
        R(d, base + 232, 118, 18, 28, '#1b1b22'); d.ellipse((base + 235, 121, base + 246, 132), fill=hx('#3a3f4c')); d.ellipse((base + 237, 135, base + 244, 142), fill=hx('#3a3f4c'))
        nx = base + 240 + (3 if frame else 0)
        R(d, nx, 108 - frame * 2, 1, 5, GOLD); R(d, nx + 1, 108 - frame * 2, 2, 1, GOLD)
    return x2(im)


def party_ground():
    im, d = L(24, 30, '#7a4a2a')
    R(d, 0, 0, 24, 1, '#b07a4a')
    for y in range(0, 30, 5):
        R(d, 0, y + 4, 24, 1, '#5a321a')
        R(d, ((y // 5) % 2) * 12 + 3, y, 1, 5, '#5a321a')
    for (x, y) in ((5, 2), (16, 7), (9, 13), (20, 17), (3, 23), (14, 27)):
        P(d, x, y, '#9a6a3a')
    return x2(im)


def banner_img(txt='DELOITTE CHRISTMAS PARTY'):
    s = 2
    tw = text_w(txt, s)
    im = Image.new('RGBA', (tw + 44, 44), CLEAR)
    d = ImageDraw.Draw(im)
    d.rectangle((6, 0, 7, 12), fill=hx('#8a7a9a')); d.rectangle((tw + 36, 0, tw + 37, 12), fill=hx('#8a7a9a'))
    d.rectangle((0, 10, tw + 43, 37), fill=hx(K))
    d.rectangle((2, 12, tw + 41, 35), fill=hx('#c8102e'))
    d.rectangle((2, 12, tw + 41, 14), fill=hx('#e8404e')); d.rectangle((2, 33, tw + 41, 35), fill=hx('#8a0c20'))
    for k in range(4, tw + 40, 10):
        d.rectangle((k, 38, k + 4, 42), fill=hx(GOLD))
    otext(d, txt, 22, 17, WHITE, s=s)
    return im


# ---------------------------------------------------------------- sammensatte billeder
def compose(sky, far, mid, ground, off=0, landmark=None, lm_pos=None):
    im = sky.copy()
    im.alpha_composite(far)
    if landmark is not None:
        im.alpha_composite(landmark, lm_pos)
    im.alpha_composite(mid.crop((off, 0, off + 640, 360)))
    for x in range(0, 640, 48):
        im.alpha_composite(ground, (x, 300))
    return im


def put(im, spr, x, base):
    s = x2(spr)
    im.alpha_composite(s, (x, base - s.height))


def snowfall(im, n, seed=3):
    d = ImageDraw.Draw(im)
    r = random.Random(seed)
    for _ in range(n):
        x, y = r.randrange(640), r.randrange(360)
        z = r.choice((1, 1, 2, 2, 3))
        d.rectangle((x, y, x + z - 1, y + z - 1), fill=hx('#ffffff') if z > 1 else hx('#c8d8f0'))


def panel_f(d, x, y, w, h, fill='#1a1f44', edge=GOLD, top='#fff0a0'):
    d.rectangle((x, y, x + w - 1, y + h - 1), fill=hx(K))
    d.rectangle((x + 2, y + 2, x + w - 3, y + h - 3), fill=hx(edge))
    d.rectangle((x + 4, y + 4, x + w - 5, y + h - 5), fill=hx(fill))
    d.rectangle((x + 4, y + 4, x + w - 5, y + 5), fill=hx(top))


def title_img(parts):
    im = compose(parts['city_sky'], parts['city_far'], parts['city_mid'], parts['city_ground'], off=0, landmark=parts['hq'], lm_pos=(330, 300 - 16 - parts['hq'].height + 8))
    d = ImageDraw.Draw(im)
    panel_f(d, 24, 30, 292, 112)
    otext(d, 'LATE FOR', 44, 44, WHITE, s=4, sh='#0a0c20')
    otext(d, 'THE PARTY', 44, 86, GOLD, s=4, sh='#0a0c20')
    text(d, 'A CHRISTMAS RUN', 46, 126, '#b8c8f0', 1)
    lk = LOOKS[0]
    put(im, runner('shock', 'office', lk), 396, 320)
    put(im, px.speech('17:42!', GOLD), 432, 252)
    put(im, px.taxi(), 500, 336)
    snowfall(im, 160, 5)
    return im


def cut_taxi(parts):
    im = compose(parts['city_sky'], parts['city_far'], parts['city_mid'], parts['city_ground'], off=300, landmark=parts['hq'], lm_pos=(300, 300 - 8 - parts['hq'].height))
    put(im, px.taxi(), 250, 312)
    put(im, runner('run1', 'office', LOOKS[0]), 170, 304)
    put(im, px.speech('TAXI!'), 210, 236)
    for (mx, my) in ((120, 250), (96, 226), (140, 210)):
        put(im, px.memo(), mx, my)
    snowfall(im, 140, 9)
    return im


def cut_suit():
    im, d = L(bg='#e8e0d4')
    for x in range(0, 320, 8):
        R(d, x, 0, 1, 150, '#d8cfc0')
    R(d, 0, 150, 320, 30, '#8a6a4a'); R(d, 0, 150, 320, 1, '#b08a5a')
    R(d, 200, 40, 44, 110, '#c8a060'); R(d, 203, 43, 38, 104, '#b8d4e8'); R(d, 206, 46, 7, 50, '#e0f0fa')
    R(d, 40, 34, 110, 2, '#8a92a4')
    for k, c in enumerate(('#2f4170', '#2f9a4a', '#6a8ad8', '#2a3654')):
        R(d, 52 + k * 24, 36, 1, 5, '#8a92a4'); R(d, 45 + k * 24, 41, 15, 34, c); R(d, 51 + k * 24, 41, 3, 10, WHITE)
    R(d, 262, 96, 40, 54, '#6a8ab0'); R(d, 262, 96, 40, 3, '#8aa8c8'); R(d, 280, 100, 1, 50, '#4a6a90')
    big = x2(im)
    put(big, runner('stand', 'xmas', LOOKS[0], bag=False), 270, 300)
    put(big, px.bowtie(), 250, 176)
    put(big, px.speech('SUIT UP!'), 300, 196)
    bd = ImageDraw.Draw(big)
    for (sx, sy) in ((250, 240), (330, 250), (240, 280), (346, 214), (300, 170)):
        bd.rectangle((sx, sy - 4, sx + 1, sy + 5), fill=hx(GOLD)); bd.rectangle((sx - 4, sy, sx + 5, sy + 1), fill=hx(GOLD))
    return big


def cut_bar(parts):
    im = compose(parts['party_sky'], parts['party_far'], parts['party_mid'], parts['party_ground'], off=40)
    im.alpha_composite(parts['banner'], ((640 - parts['banner'].width) // 2, 44))
    put(im, bar_sprite(), 380, 304)
    put(im, runner('cheer', 'xmas', LOOKS[0], bag=False), 300, 304)
    put(im, px.speech('CHEERS!'), 250, 220)
    d = ImageDraw.Draw(im)
    r = random.Random(4)
    for _ in range(160):
        x, y = r.randrange(0, 640), r.randrange(60, 300)
        d.rectangle((x, y, x + 2, y + 3), fill=hx(r.choice([RED, GOLD, '#3ad46a', '#6ec1ff', WHITE])))
    return im


def map_img(parts):
    im = Image.new('RGBA', (640, 360), hx('#101430'))
    d = ImageDraw.Draw(im)
    worlds = [
        compose(parts['city_sky'], parts['city_far'], parts['city_mid'], parts['city_ground'], off=180),
        compose(parts['office_sky'], parts['office_far'], parts['office_mid'], parts['office_ground'], off=0),
        compose(parts['party_sky'], parts['party_far'], parts['party_mid'], parts['party_ground'], off=40),
    ]
    for i, w in enumerate(worlds):
        crop = w.crop((200, 60, 396, 330))
        x = 14 + i * 208
        d.rectangle((x - 3, 41, x + 198, 315), fill=hx(K))
        d.rectangle((x - 1, 43, x + 196, 313), fill=hx([ '#6ec1ff', '#86bc25', '#ff7a7a'][i]))
        im.paste(crop, (x, 44))
        ov = Image.new('RGBA', (196, 270), (10, 10, 30, 70))
        im.alpha_composite(ov, (x, 44))
    return im


def main():
    ASSETS.mkdir(exist_ok=True); BG.mkdir(exist_ok=True)
    build_atlas()
    parts = {
        'city_sky': city_sky(), 'city_far': city_far(), 'city_mid': city_mid(), 'city_ground': city_ground(), 'city_pit': city_pit(),
        'office_sky': office_sky(), 'office_far': office_far(), 'office_mid': office_mid(), 'office_ground': office_ground(), 'office_pit': office_pit(),
        'party_sky': party_sky(), 'party_far': party_far(), 'party_mid': party_mid(0), 'party_mid2': party_mid(1), 'party_ground': party_ground(),
        'party_pit': office_pit(), 'hq': hq(), 'banner': banner_img(),
    }
    for k, im in parts.items():
        im.save(BG / f'{k}.png', optimize=True)
    title = title_img(parts); title.save(BG / 'title.png', optimize=True)
    map_img(parts).save(BG / 'map.png', optimize=True)
    cut_taxi(parts).save(BG / 'cut_taxi.png', optimize=True)
    cut_suit().save(BG / 'cut_suit.png', optimize=True)
    cut_bar(parts).save(BG / 'cut_bar.png', optimize=True)
    title.resize((1280, 720), Image.NEAREST).crop((40, 45, 1240, 675)).convert('RGB').save(ROOT / 'preview.png', optimize=True)
    print('grafik bygget i', ASSETS)


if __name__ == '__main__':
    main()
