"""Builds every 3D model of Colonia Nova v4 in Blender and exports them into one GLB.

Run:  python build_assets.py <out.glb>      (with the `bpy` module installed: pip install bpy)

Each asset is an Empty root (named like the asset) placed on its own spot on a grid so
the Blender file stays readable; the game clones roots by name and resets their position.
"""
import sys, math, random
import bpy
sys.path.insert(0, __import__('os').path.dirname(__file__))
from kit_lib import *  # noqa

OUT = sys.argv[-1] if sys.argv[-1].endswith('.glb') else 'kit.glb'
reset()
R = random.Random(7)

# ---------------------------------------------------------------- materials
suit = mat('suit', '#e6ebf1', 0.55)
suitDark = mat('suitDark', '#2a3142', 0.7)
accent = mat('accent', '#ff8a3d', 0.45)
pack = mat('pack', '#aeb8ca', 0.45, 0.4)
visor = mat('visor', '#ffb347', 0.12, 0.9, '#a65a00', 0.8)
gunMetal = mat('gunMetal', '#3a4254', 0.35, 0.8)
plate = mat('plate', '#c9d1dc', 0.45, 0.35)
frame = mat('frame', '#5d6880', 0.4, 0.6)
dark = mat('darkMetal', '#262c3a', 0.5, 0.5)
hazard = mat('hazard', '#f2b84b', 0.5)
hazardBlack = mat('hazardBlack', '#1b1f2a', 0.6)
concrete = mat('concrete', '#8a8d93', 0.92)
sand = mat('sand', '#9d8b68', 1.0)
glass = mat('glass', '#9fe8ff', 0.08, 0.1, '#2a6a90', 0.9, alpha=0.55)
gCyan = mat('glowCyan', '#6fe3ff', 0.3, 0, '#6fe3ff', 4)
gAmber = mat('glowAmber', '#f2b84b', 0.3, 0, '#ffb13b', 4)
gGreen = mat('glowGreen', '#7dffb0', 0.3, 0, '#4dff98', 4)
gRed = mat('glowRed', '#ff4f6a', 0.3, 0, '#ff2f4f', 5)
gOrange = mat('glowOrange', '#ff9f5a', 0.3, 0, '#ff7a1a', 3)
scrapM = mat('scrap', '#d89a35', 0.4, 0.6, '#7a4a00', 0.6)
crystal = mat('crystal', '#7fe9ff', 0.08, 0.1, '#3fd6ff', 2.2)
crystalDim = mat('crystalDim', '#4a6b7a', 0.4)
rock = mat('rock', '#8f6a4e', 0.95)
rock2 = mat('rock2', '#6c4f3e', 0.95)
solar = mat('solar', '#1d3566', 0.2, 0.6, '#0a1a40', 0.4)
burnt = mat('burnt', '#1e1a19', 0.95)
hull = mat('hull', '#d8dde4', 0.4, 0.45)
hullStripe = mat('hullStripe', '#2f5fae', 0.4, 0.3)

# alien materials (each family has a shell, a dark underside and an emissive signal colour)
A = {
    'bicho': (mat('bichoShell', '#9b1f6d', 0.3, 0.1), mat('bichoDark', '#3a0d2c', 0.6), mat('bichoGlow', '#ff4fd8', 0.3, 0, '#ff4fd8', 5)),
    'veloz': (mat('velozShell', '#3f7d1c', 0.35, 0.1), mat('velozDark', '#17300c', 0.6), mat('velozGlow', '#b6ff4f', 0.3, 0, '#9dff4f', 5)),
    'escupidor': (mat('escShell', '#5a2a9c', 0.35, 0.1), mat('escDark', '#24103f', 0.6), mat('escGlow', '#9dff4f', 0.2, 0, '#8cff3a', 4)),
    'volador': (mat('volShell', '#c99a0a', 0.3, 0.2), mat('volDark', '#2a1f08', 0.6), mat('volGlow', '#ffe14f', 0.3, 0, '#ffd21f', 5)),
    'acorazado': (mat('acoShell', '#6a1f14', 0.35, 0.3), mat('acoPlate', '#59606f', 0.35, 0.75), mat('acoGlow', '#ff5a3d', 0.3, 0, '#ff4a1d', 5)),
    'jefe': (mat('jefeShell', '#4a0f2e', 0.3, 0.2), mat('jefeDark', '#1c0612', 0.6), mat('jefeGlow', '#ff7a3d', 0.3, 0, '#ff6a1d', 6)),
}
wing = mat('wing', '#fff3a0', 0.2, 0, '#ffe46a', 1.2, alpha=0.45)
eyeW = mat('alienEye', '#fff4d6', 0.2, 0, '#fff1c4', 3)

SLOT = [0]


def place():
    """Grid position for the next asset in the .blend (purely cosmetic)."""
    i = SLOT[0]
    SLOT[0] += 1
    return ((i % 8) * 12, (i // 8) * 12, 0)


def at(o, base):
    return tuple(o[k] + base[k] for k in range(3))


# ================================================================ astronaut
def astronaut():
    B = place()
    rt = root('astro', B)
    P = lambda *v: at(v, B)
    # torso (pivot at the hips)
    t = [box((0.42, 0.28, 0.2), P(0, 0, 0.98), suitDark, bevel=0.04),
         cyl(0.2, 0.22, P(0, 0, 1.1), suit, 16),
         box((0.6, 0.38, 0.44), P(0, 0, 1.32), suit, bevel=0.07),
         box((0.5, 0.06, 0.2), P(0, -0.19, 1.38), accent, bevel=0.02),
         box((0.16, 0.03, 0.06), P(0, -0.225, 1.25), gCyan),
         box((0.08, 0.03, 0.05), P(-0.16, -0.21, 1.25), gGreen),
         torus(0.19, 0.05, P(0, 0, 1.53), suitDark),
         box((0.5, 0.26, 0.56), P(0, 0.3, 1.3), pack, bevel=0.06),
         cyl(0.075, 0.5, P(-0.14, 0.45, 1.3), accent, 12),
         cyl(0.075, 0.5, P(0.14, 0.45, 1.3), accent, 12),
         box((0.36, 0.04, 0.08), P(0, 0.44, 1.52), dark),
         cyl(0.012, 0.45, P(0.18, 0.4, 1.78), dark, 6),
         sphere(0.04, P(0.18, 0.4, 2.0), gRed, seg=8, rings=6),
         sphere(0.13, P(-0.36, 0, 1.47), accent, (1, 1.05, 0.75)),
         sphere(0.13, P(0.36, 0, 1.47), accent, (1, 1.05, 0.75)),
         box((0.46, 0.3, 0.07), P(0, 0, 0.9), dark, bevel=0.02)]
    for x in (-0.16, 0.16):
        t.append(box((0.1, 0.08, 0.12), P(x, -0.15, 0.97), pack, bevel=0.02))
    torso = join('astro.torso', t, P(0, 0, 0.92), rt)
    # head
    h = [sphere(0.27, P(0, 0, 1.78), suit, seg=20, rings=14),
         sphere(0.225, P(0, -0.1, 1.77), visor, (1.05, 0.72, 0.8), seg=20, rings=12),
         box((0.07, 0.42, 0.06), P(0, 0.02, 2.04), accent, bevel=0.02),
         box((0.08, 0.1, 0.08), P(0.25, -0.04, 1.84), dark, bevel=0.015),
         box((0.04, 0.02, 0.04), P(0.25, -0.1, 1.84), gCyan),
         cyl(0.07, 0.06, P(-0.27, 0, 1.78), dark, 12, rot=(0, 90, 0))]
    head = join('astro.head', h, P(0, 0, 1.53), torso)
    # arms
    for s, nm in ((-1, 'L'), (1, 'R')):
        x = 0.4 * s
        a = [cyl(0.085, 0.32, P(x, 0, 1.27), suit, 12),
             sphere(0.092, P(x, 0, 1.1), suitDark, seg=12, rings=8),
             cyl(0.08, 0.28, P(x, 0, 0.95), suit, 12, r2=0.07),
             box((0.17, 0.12, 0.04), P(x, 0, 1.0), accent, bevel=0.01),
             box((0.12, 0.13, 0.15), P(x, -0.01, 0.77), suitDark, bevel=0.03)]
        arm = join('astro.arm' + nm, a, P(x, 0, 1.44), torso)
        if nm == 'R':
            g = [box((0.08, 0.46, 0.11), P(x, -0.12, 0.72), gunMetal, bevel=0.02),
                 cyl(0.026, 0.28, P(x, -0.48, 0.74), dark, 10, rot=(90, 0, 0)),
                 cyl(0.04, 0.07, P(x, -0.62, 0.74), dark, 10, rot=(90, 0, 0)),
                 box((0.06, 0.1, 0.14), P(x, -0.1, 0.62), accent, bevel=0.01),
                 box((0.085, 0.06, 0.03), P(x, -0.24, 0.785), gCyan),
                 box((0.06, 0.16, 0.09), P(x, 0.16, 0.71), gunMetal, bevel=0.02)]
            gun = join('astro.gun', g, P(x, 0, 0.75), arm)
            gun.rotation_euler = (math.radians(70), 0, 0)
            tl = [cyl(0.03, 0.3, P(x, -0.08, 0.72), dark, 8, rot=(90, 0, 0)),
                  box((0.12, 0.12, 0.1), P(x, -0.27, 0.72), hazard, bevel=0.02),
                  cone(0.035, 0.1, P(x, -0.37, 0.72), gOrange, rot=(90, 0, 0))]
            tool = join('astro.tool', tl, P(x, 0, 0.75), arm)
            tool.rotation_euler = (math.radians(70), 0, 0)
        if nm == 'L':
            arml = arm
        else:
            armr = arm
    legs = {}
    for s, nm in ((-1, 'L'), (1, 'R')):
        x = 0.15 * s
        l = [cyl(0.115, 0.42, P(x, 0, 0.7), suit, 12, r2=0.1),
             box((0.15, 0.06, 0.13), P(x, -0.1, 0.5), accent, bevel=0.02),
             cyl(0.1, 0.38, P(x, 0, 0.3), suit, 12, r2=0.09),
             box((0.2, 0.32, 0.14), P(x, -0.04, 0.07), suitDark, bevel=0.04),
             box((0.18, 0.05, 0.03), P(x, -0.19, 0.03), accent)]
        legs[nm] = join('astro.leg' + nm, l, P(x, 0, 0.92), rt)
    c = [box((0.44, 0.34, 0.36), P(0, -0.42, 1.18), scrapM, bevel=0.03),
         box((0.46, 0.06, 0.38), P(0, -0.42, 1.18), dark),
         box((0.12, 0.02, 0.06), P(0, -0.6, 1.22), gAmber)]
    join('astro.crate', c, P(0, -0.42, 1.18), torso)
    # clips
    clip('astro', 'Idle', {torso: {'rot': cycle(0, 2.5, frames=60)}, head: {'rot': cycle(0, 10, axis=2, frames=60)},
                           arml: {'rot': cycle(0, 4, frames=60)}, armr: {'rot': cycle(0, 4, math.pi, frames=60)}}, 60)
    bob = [(1, (0, 0, 0)), (6, (0, 0, 0.05)), (11, (0, 0, 0)), (16, (0, 0, 0.05)), (21, (0, 0, 0))]
    clip('astro', 'Run', {legs['L']: {'rot': cycle(0, 42, 0, frames=20)}, legs['R']: {'rot': cycle(0, 42, math.pi, frames=20)},
                          arml: {'rot': cycle(0, 38, math.pi, frames=20)}, armr: {'rot': cycle(0, 38, 0, frames=20)},
                          torso: {'rot': [(1, (9, 0, 0)), (21, (9, 0, 0))], 'loc': bob}}, 20)
    clip('astro', 'Work', {armr: {'rot': [(1, (-105, 0, 0)), (7, (-40, 0, 0)), (13, (-105, 0, 0)), (19, (-40, 0, 0)), (25, (-105, 0, 0))]},
                           arml: {'rot': [(1, (-35, 0, 10)), (25, (-35, 0, 10))]},
                           torso: {'rot': [(1, (12, 0, 0)), (13, (16, 0, 0)), (25, (12, 0, 0))]}}, 24)


# ================================================================ aliens
def legs6(name, body, sh, dk, attach, knee_out, foot_out, r=(0.06, 0.05, 0.03), B=(0, 0, 0)):
    out = []
    ys = (-0.25, 0.0, 0.25) if isinstance(attach[1], (int, float)) is False else None
    for i, (side, y) in enumerate([(-1, attach[1][0]), (-1, attach[1][1]), (-1, attach[1][2]),
                                   (1, attach[1][0]), (1, attach[1][1]), (1, attach[1][2])]):
        ax, az = attach[0] * side, attach[2]
        kx, kz = knee_out[0] * side, knee_out[1]
        fx, fz = foot_out[0] * side, foot_out[1]
        pts = [at((ax, y, az), B), at((kx, y * 1.2, kz), B), at((fx, y * 1.45, fz), B)]
        seg = tube(pts, list(r), sh if i % 2 == 0 else dk, 8)
        tip = cone(r[2] * 1.3, 0.12, at((fx, y * 1.45, fz - 0.03), B), dk, 6, rot=(180, 0, 0))
        out.append(join(f'{name}.leg{i + 1}', [seg, tip], at((ax, y, az), B), body))
    return out


def gait(legs, amp=18, frames=16, lift=10):
    tr = {}
    for i, l in enumerate(legs):
        ph = 0 if i in (0, 2, 4) else math.pi
        side = -1 if i < 3 else 1
        keys = []
        for k in range(9):
            f = 1 + frames * k / 8
            t = k / 8 * math.tau + ph
            keys.append((f, (0, side * lift * max(0, math.sin(t)), amp * math.cos(t))))
        tr[l] = {'rot': keys}
    return tr


def bicho():
    B = place(); rt = root('bicho', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['bicho']
    b = [sphere(0.38, P(0, 0.17, 0.44), sh, (1, 1.3, 0.75), seg=18, rings=12),
         sphere(0.27, P(0, -0.2, 0.46), sh, (1, 1, 0.85), seg=16, rings=10),
         torus(0.3, 0.035, P(0, 0.05, 0.47), dk, rot=(0, 0, 0)),
         torus(0.26, 0.03, P(0, 0.35, 0.44), dk)]
    for i in range(5):
        a = i / 5 * math.tau
        b.append(sphere(0.06, P(math.cos(a) * 0.22, 0.2 + math.sin(a) * 0.25, 0.7), gl, seg=8, rings=6))
    for i in range(4):
        b.append(cone(0.05, 0.22, P(0, 0.0 + i * 0.16, 0.74 - i * 0.02), dk, 6, rot=(-25, 0, 0)))
    body = join('bicho.body', b, P(0, 0, 0.44), rt)
    hd = [sphere(0.19, P(0, -0.46, 0.42), dk, (1, 1.15, 0.85), seg=14, rings=10)]
    for x, z in ((-0.08, 0.5), (0.08, 0.5), (-0.13, 0.43), (0.13, 0.43)):
        hd.append(sphere(0.045, P(x, -0.6, z), gl, seg=8, rings=6))
    head = join('bicho.head', hd, P(0, -0.3, 0.44), body)
    mands = []
    for s in (-1, 1):
        m = tube([P(0.08 * s, -0.58, 0.34), P(0.16 * s, -0.72, 0.32), P(0.06 * s, -0.84, 0.3)], [0.04, 0.03, 0.01], sh)
        mands.append(join('bicho.mand' + ('L' if s < 0 else 'R'), [m], P(0.08 * s, -0.58, 0.34), head))
    L = legs6('bicho', body, sh, dk, (0.2, (-0.22, 0.02, 0.26), 0.42), (0.55, 0.62), (0.74, 0.0), B=B)
    tr = gait(L, 20, 16)
    tr[body] = {'loc': [(1, (0, 0, 0)), (5, (0, 0, 0.04)), (9, (0, 0, 0)), (13, (0, 0, 0.04)), (17, (0, 0, 0))]}
    tr[head] = {'rot': cycle(0, 6, axis=2, frames=16)}
    clip('bicho', 'Move', tr, 16)
    clip('bicho', 'Attack', {head: {'rot': [(1, (0, 0, 0)), (5, (-18, 0, 0)), (9, (22, 0, 0)), (16, (0, 0, 0))],
                                    'loc': [(1, (0, 0, 0)), (9, (0, -0.18, 0)), (16, (0, 0, 0))]},
                             mands[0]: {'rot': [(1, (0, 0, 0)), (6, (0, 0, -30)), (9, (0, 0, 25)), (16, (0, 0, 0))]},
                             mands[1]: {'rot': [(1, (0, 0, 0)), (6, (0, 0, 30)), (9, (0, 0, -25)), (16, (0, 0, 0))]}}, 16)


def veloz():
    B = place(); rt = root('veloz', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['veloz']
    b = [sphere(0.22, P(0, 0, 0.62), sh, (0.9, 1.6, 0.85), seg=16, rings=10)]
    for i in range(4):
        b.append(box((0.05, 0.12, 0.025), P(0, -0.2 + i * 0.13, 0.81), gl, rot=(0, 0, 0)))
    b.append(tube([P(0, -0.25, 0.66), P(0, -0.42, 0.8)], [0.1, 0.08], sh))
    for s in (-1, 1):
        b.append(tube([P(0.13 * s, -0.22, 0.56), P(0.18 * s, -0.33, 0.44), P(0.14 * s, -0.4, 0.4)], [0.035, 0.025, 0.015], dk))
    body = join('veloz.body', b, P(0, 0, 0.62), rt)
    tl = tube([P(0, 0.3, 0.64), P(0, 0.55, 0.62), P(0, 0.8, 0.66), P(0, 1.02, 0.74)], [0.12, 0.08, 0.04, 0.01], sh)
    tail = join('veloz.tail', [tl, cone(0.04, 0.16, P(0, 1.06, 0.76), gl, 6, rot=(-75, 0, 0))], P(0, 0.3, 0.64), body)
    hd = [sphere(0.13, P(0, -0.52, 0.86), sh, (0.85, 1.5, 0.8), seg=14, rings=10),
          box((0.16, 0.2, 0.04), P(0, -0.62, 0.79), dk, bevel=0.015),
          sphere(0.035, P(-0.07, -0.6, 0.9), gl, seg=8, rings=6), sphere(0.035, P(0.07, -0.6, 0.9), gl, seg=8, rings=6),
          cone(0.03, 0.12, P(0, -0.46, 0.98), gl, 6, rot=(30, 0, 0))]
    head = join('veloz.head', hd, P(0, -0.42, 0.8), body)
    legs = []
    for s, nm in ((-1, 'L'), (1, 'R')):
        lg = tube([P(0.13 * s, 0.05, 0.6), P(0.16 * s, -0.08, 0.34), P(0.14 * s, 0.1, 0.14), P(0.14 * s, -0.02, 0.02)], [0.075, 0.05, 0.035, 0.03], sh)
        foot = box((0.08, 0.18, 0.04), P(0.14 * s, -0.08, 0.02), dk, bevel=0.01)
        legs.append(join('veloz.leg' + nm, [lg, foot], P(0.13 * s, 0.05, 0.6), body))
    clip('veloz', 'Move', {legs[0]: {'rot': cycle(0, 48, 0, frames=12)}, legs[1]: {'rot': cycle(0, 48, math.pi, frames=12)},
                           tail: {'rot': cycle(0, 14, axis=2, frames=12)},
                           body: {'loc': [(1, (0, 0, 0)), (4, (0, 0, 0.05)), (7, (0, 0, 0)), (10, (0, 0, 0.05)), (13, (0, 0, 0))],
                                  'rot': [(1, (6, 0, 0)), (13, (6, 0, 0))]}}, 12)
    clip('veloz', 'Attack', {head: {'rot': [(1, (0, 0, 0)), (5, (-25, 0, 0)), (8, (30, 0, 0)), (14, (0, 0, 0))]},
                             body: {'rot': [(1, (6, 0, 0)), (8, (18, 0, 0)), (14, (6, 0, 0))]}}, 14)


def escupidor():
    B = place(); rt = root('escupidor', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['escupidor']
    b = [sphere(0.42, P(0, 0.05, 0.45), sh, (1.1, 1.15, 0.8), seg=18, rings=12),
         torus(0.36, 0.04, P(0, 0.05, 0.36), dk)]
    for i in range(6):
        a = i / 6 * math.tau
        b.append(cone(0.06, 0.2, P(math.cos(a) * 0.38, 0.05 + math.sin(a) * 0.4, 0.62), dk, 6, rot=(math.degrees(-math.sin(a)) * 0.5, math.degrees(math.cos(a)) * 0.5, 0)))
    body = join('escupidor.body', b, P(0, 0, 0.45), rt)
    sac = join('escupidor.sac', [sphere(0.3, P(0, 0.22, 0.84), gl, (1, 1.1, 0.9), seg=16, rings=10),
                                 torus(0.24, 0.035, P(0, 0.22, 0.8), dk)], P(0, 0.22, 0.7), body)
    hd = [sphere(0.2, P(0, -0.42, 0.5), dk, (1, 1, 0.9), seg=14, rings=10),
          cyl(0.1, 0.3, P(0, -0.6, 0.52), sh, 12, rot=(90, 0, 0), r2=0.14),
          torus(0.12, 0.03, P(0, -0.75, 0.52), gl, rot=(90, 0, 0)),
          sphere(0.04, P(-0.12, -0.52, 0.64), eyeW, seg=8, rings=6), sphere(0.04, P(0.12, -0.52, 0.64), eyeW, seg=8, rings=6)]
    head = join('escupidor.head', hd, P(0, -0.3, 0.5), body)
    legs = []
    for i, (x, y) in enumerate(((-0.32, -0.22), (0.32, -0.22), (-0.32, 0.3), (0.32, 0.3))):
        s = -1 if x < 0 else 1
        lg = tube([P(x, y, 0.38), P(x + 0.18 * s, y, 0.2), P(x + 0.2 * s, y, 0.0)], [0.09, 0.07, 0.05], sh)
        legs.append(join(f'escupidor.leg{i + 1}', [lg], P(x, y, 0.38), body))
    clip('escupidor', 'Move', {legs[0]: {'rot': cycle(0, 24, 0, frames=20)}, legs[3]: {'rot': cycle(0, 24, 0, frames=20)},
                               legs[1]: {'rot': cycle(0, 24, math.pi, frames=20)}, legs[2]: {'rot': cycle(0, 24, math.pi, frames=20)},
                               body: {'rot': cycle(0, 6, axis=1, frames=20)}, sac: {'scale': [(1, (1, 1, 1)), (11, (1.06, 1.06, 0.95)), (21, (1, 1, 1))]}}, 20)
    clip('escupidor', 'Attack', {sac: {'scale': [(1, (1, 1, 1)), (8, (1.3, 1.3, 1.25)), (11, (0.85, 0.85, 0.85)), (18, (1, 1, 1))]},
                                 head: {'rot': [(1, (0, 0, 0)), (8, (-14, 0, 0)), (11, (12, 0, 0)), (18, (0, 0, 0))]}}, 18)


def volador():
    B = place(); rt = root('volador', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['volador']
    b = [sphere(0.2, P(0, 0, 0), sh, (1, 1.2, 0.95), seg=16, rings=10),
         sphere(0.17, P(0, -0.3, 0.02), dk, (1, 1, 0.9), seg=14, rings=10),
         sphere(0.08, P(-0.1, -0.42, 0.06), gl, seg=10, rings=8), sphere(0.08, P(0.1, -0.42, 0.06), gl, seg=10, rings=8)]
    for s in (-1, 1):
        b.append(tube([P(0.06 * s, -0.44, -0.02), P(0.1 * s, -0.56, -0.1)], [0.025, 0.01], dk))
        for y in (-0.08, 0.06):
            b.append(tube([P(0.12 * s, y, -0.12), P(0.2 * s, y - 0.04, -0.32), P(0.16 * s, y + 0.02, -0.48)], [0.025, 0.018, 0.01], dk))
    body = join('volador.body', b, P(0, 0, 0), rt)
    ab = [sphere(0.2, P(0, 0.34, -0.04), sh, (0.9, 1.5, 0.85), seg=16, rings=10)]
    for i in range(3):
        ab.append(torus(0.16 - i * 0.025, 0.035, P(0, 0.26 + i * 0.13, -0.04 - i * 0.01), dk, rot=(90, 0, 0)))
    ab.append(cone(0.05, 0.22, P(0, 0.68, -0.08), gl, 6, rot=(-100, 0, 0)))
    abd = join('volador.abd', ab, P(0, 0.18, 0), body)
    wings = []
    for s, nm in ((-1, 'L'), (1, 'R')):
        for k, (y, ln) in enumerate(((-0.04, 0.75), (0.12, 0.55))):
            w = box((ln, 0.26 - k * 0.06, 0.012), P(s * (0.12 + ln / 2), y, 0.18), wing, rot=(0, 0, s * (8 + k * 14)))
            vein = box((ln * 0.95, 0.012, 0.016), P(s * (0.12 + ln / 2), y, 0.19), gl, rot=(0, 0, s * (8 + k * 14)))
            wings.append(join(f'volador.wing{nm}{k + 1}', [w, vein], P(s * 0.12, y, 0.18), body))
    tr = {}
    for i, w in enumerate(wings):
        s = -1 if i < 2 else 1
        tr[w] = {'rot': cycle(0, 55, (i % 2) * 0.6, axis=1, frames=6, steps=6, base=(0, s * 5, 0))}
        tr[w]['rot'] = [(f, (v[0], v[1] * s, v[2])) for f, v in tr[w]['rot']]
    tr[abd] = {'rot': cycle(0, 6, frames=6, steps=6)}
    clip('volador', 'Move', tr, 6)
    tr2 = dict(tr)
    tr2[abd] = {'rot': [(1, (0, 0, 0)), (4, (-20, 0, 0)), (7, (45, 0, 0)), (12, (0, 0, 0))]}
    tr2 = {k: (v if k is abd else {'rot': [(f, val) for f, val in v['rot']] + [(f + 6, val) for f, val in v['rot'][1:]]}) for k, v in tr2.items()}
    clip('volador', 'Attack', tr2, 12)


def acorazado():
    B = place(); rt = root('acorazado', B); P = lambda *v: at(v, B)
    sh, pl, gl = A['acorazado']
    b = [sphere(0.62, P(0, 0.1, 0.68), sh, (1, 1.25, 0.72), seg=20, rings=12),
         sphere(0.5, P(0, 0.1, 0.5), pl, (1.05, 1.25, 0.5), seg=16, rings=8)]
    for i in range(5):
        y = -0.4 + i * 0.25
        w = 0.95 - abs(i - 2) * 0.12
        b.append(box((w, 0.2, 0.12), P(0, y, 1.08 - abs(i - 2) * 0.06), pl, rot=(0, 0, 0), bevel=0.04))
    for s in (-1, 1):
        for i in range(3):
            b.append(box((0.08, 0.3, 0.32), P(0.58 * s, -0.25 + i * 0.3, 0.72), pl, rot=(0, 15 * s, 0), bevel=0.03))
        b.append(box((0.03, 0.7, 0.04), P(0.45 * s, 0.1, 0.98), gl, rot=(0, 25 * s, 0)))
    body = join('acorazado.body', b, P(0, 0, 0.68), rt)
    hd = [sphere(0.32, P(0, -0.7, 0.6), pl, (1.1, 0.9, 0.75), seg=16, rings=10),
          cone(0.12, 0.6, P(0, -1.0, 0.82), mat('horn', '#d8c9a8', 0.5), 8, rot=(-65, 0, 0)),
          cone(0.07, 0.3, P(-0.2, -0.86, 0.78), mat('horn', '#d8c9a8', 0.5), 8, rot=(-55, 0, -25)),
          cone(0.07, 0.3, P(0.2, -0.86, 0.78), mat('horn', '#d8c9a8', 0.5), 8, rot=(-55, 0, 25)),
          sphere(0.06, P(-0.17, -0.92, 0.58), gl, seg=8, rings=6), sphere(0.06, P(0.17, -0.92, 0.58), gl, seg=8, rings=6)]
    head = join('acorazado.head', hd, P(0, -0.5, 0.62), body)
    L = legs6('acorazado', body, sh, pl, (0.45, (-0.4, 0.05, 0.5), 0.5), (0.9, 0.72), (1.05, 0.0), r=(0.12, 0.09, 0.06), B=B)
    tr = gait(L, 12, 28, 8)
    tr[body] = {'rot': cycle(0, 3, axis=1, frames=28)}
    clip('acorazado', 'Move', tr, 28)
    clip('acorazado', 'Attack', {head: {'rot': [(1, (0, 0, 0)), (8, (-20, 0, 0)), (12, (25, 0, 0)), (22, (0, 0, 0))]},
                                 body: {'loc': [(1, (0, 0, 0)), (8, (0, 0.15, 0)), (12, (0, -0.35, 0)), (22, (0, 0, 0))]}}, 22)


def jefe():
    B = place(); rt = root('jefe', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['jefe']
    b = [sphere(1.0, P(0, 0.55, 1.05), sh, (1, 1.4, 0.78), seg=22, rings=14),
         sphere(0.65, P(0, -0.55, 1.2), sh, (1, 1, 0.9), seg=20, rings=12),
         sphere(0.42, P(0, 0.55, 1.62), gl, (1, 1.3, 0.6), seg=16, rings=10)]
    for i in range(6):
        b.append(torus(0.85 - abs(i - 2.5) * 0.12, 0.06, P(0, 0.1 + i * 0.22, 1.05), dk, rot=(90, 0, 0)))
    for i in range(9):
        a = i / 9 * math.tau
        b.append(cone(0.13, 0.75, P(math.cos(a) * 0.5, -0.55 + math.sin(a) * 0.45, 1.75), dk, 6,
                      rot=(math.degrees(-math.sin(a)) * 0.6, math.degrees(math.cos(a)) * 0.6, 0)))
    for i in range(7):
        a = i / 7 * math.tau
        b.append(sphere(0.09, P(math.cos(a) * 0.75, 0.6 + math.sin(a) * 1.0, 1.5), gl, seg=8, rings=6))
    body = join('jefe.body', b, P(0, 0, 1.05), rt)
    hd = [sphere(0.42, P(0, -1.15, 1.1), dk, (1, 0.9, 0.8), seg=16, rings=10)]
    for x, z in ((-0.15, 1.25), (0.15, 1.25), (-0.27, 1.12), (0.27, 1.12), (0, 1.33)):
        hd.append(sphere(0.07, P(x, -1.48, z), gl, seg=8, rings=6))
    head = join('jefe.head', hd, P(0, -0.85, 1.1), body)
    claws = []
    for s, nm in ((-1, 'L'), (1, 'R')):
        c = [tube([P(0.55 * s, -0.8, 1.1), P(0.95 * s, -1.3, 1.3), P(0.85 * s, -1.85, 0.9)], [0.16, 0.12, 0.09], sh),
             cone(0.12, 0.6, P(0.75 * s, -2.1, 0.75), dk, 8, rot=(-110, 0, -15 * s)),
             cone(0.1, 0.5, P(0.98 * s, -2.05, 0.8), dk, 8, rot=(-110, 0, 25 * s))]
        claws.append(join('jefe.claw' + nm, c, P(0.55 * s, -0.8, 1.1), body))
    L = legs6('jefe', body, sh, dk, (0.7, (-0.3, 0.4, 1.0), 0.9), (1.6, 1.3), (1.9, 0.0), r=(0.16, 0.12, 0.07), B=B)
    tr = gait(L, 12, 32, 8)
    tr[claws[0]] = {'rot': cycle(0, 8, frames=32)}
    tr[claws[1]] = {'rot': cycle(0, 8, math.pi, frames=32)}
    clip('jefe', 'Move', tr, 32)
    clip('jefe', 'Attack', {claws[0]: {'rot': [(1, (0, 0, 0)), (9, (-45, 0, -10)), (14, (35, 0, 0)), (26, (0, 0, 0))]},
                            claws[1]: {'rot': [(1, (0, 0, 0)), (9, (-45, 0, 10)), (14, (35, 0, 0)), (26, (0, 0, 0))]},
                            head: {'rot': [(1, (0, 0, 0)), (9, (-15, 0, 0)), (14, (10, 0, 0)), (26, (0, 0, 0))]}}, 26)


# ================================================================ buildings
def muro():
    B = place(); rt = root('muro', B); P = lambda *v: at(v, B)
    p = [box((1.9, 0.72, 0.22), P(0, 0, 0.11), concrete, bevel=0.03)]
    for x in (-0.64, 0, 0.64):
        p.append(box((0.6, 0.58, 0.82), P(x, 0, 0.62), plate, bevel=0.04))
        p.append(box((0.5, 0.04, 0.6), P(x, -0.3, 0.64), frame, bevel=0.01))
        for bx in (-0.22, 0.22):
            for bz in (0.38, 0.9):
                p.append(cyl(0.025, 0.03, P(x + bx, -0.33, bz), dark, 6, rot=(90, 0, 0)))
    p.append(box((1.86, 0.03, 0.16), P(0, -0.37, 0.3), hazardBlack))
    for i in range(7):
        p.append(box((0.1, 0.035, 0.22), P(-0.78 + i * 0.26, -0.375, 0.3), hazard, rot=(0, 40, 0)))
    p.append(box((1.98, 0.76, 0.1), P(0, 0, 1.07), frame, bevel=0.02))
    p.append(box((0.16, 0.05, 0.08), P(0, -0.39, 0.86), gAmber))
    for x in (-0.95, 0.95):
        p.append(box((0.12, 0.74, 1.1), P(x, 0, 0.55), frame, bevel=0.02))
    for x in (-0.6, 0.6):
        p.append(box((0.1, 0.4, 0.5), P(x, 0.42, 0.35), frame, rot=(35, 0, 0)))
    join('muro.mesh', p, P(0, 0, 0), rt)


def torreta():
    B = place(); rt = root('torreta', B); P = lambda *v: at(v, B)
    p = [cyl(0.9, 0.42, P(0, 0, 0.21), frame, 6, r2=0.72, bevel=0.03, smooth=0),
         cyl(0.6, 0.06, P(0, 0, 0.44), hazardBlack, 6, smooth=0),
         cyl(0.24, 0.5, P(0, 0, 0.7), dark, 12)]
    for i in range(3):
        a = i / 3 * math.tau
        p.append(box((0.12, 0.5, 0.12), P(math.cos(a) * 0.62, math.sin(a) * 0.62, 0.5), dark, rot=(0, 0, math.degrees(a) + 90), bevel=0.02))
    join('torreta.base', p, P(0, 0, 0), rt)
    h = [box((0.82, 0.82, 0.46), P(0, 0.05, 1.05), plate, bevel=0.07),
         box((0.84, 0.3, 0.3), P(0, -0.42, 0.98), plate, rot=(25, 0, 0), bevel=0.05),
         box((0.86, 0.1, 0.06), P(0, 0.05, 1.28), hazard),
         box((0.3, 0.3, 0.2), P(0.5, 0.1, 1.02), dark, bevel=0.03),
         sphere(0.07, P(0, -0.42, 1.24), gRed, seg=10, rings=8),
         box((0.5, 0.06, 0.04), P(0, 0.48, 1.12), gAmber)]
    for x in (-0.17, 0.17):
        h.append(cyl(0.07, 0.8, P(x, -0.72, 1.02), gunMetal, 10, rot=(90, 0, 0)))
        h.append(cyl(0.1, 0.14, P(x, -1.1, 1.02), dark, 8, rot=(90, 0, 0)))
    join('torreta.head', h, P(0, 0, 1.05), rt)


def laser():
    B = place(); rt = root('laser', B); P = lambda *v: at(v, B)
    p = [cyl(0.9, 0.38, P(0, 0, 0.19), frame, 6, r2=0.75, bevel=0.03, smooth=0),
         cyl(0.4, 0.5, P(0, 0, 0.6), dark, 10, r2=0.3),
         cyl(0.3, 1.7, P(0, 0, 1.55), plate, 10, r2=0.16, bevel=0.02)]
    for i in range(3):
        a = i / 3 * math.tau + 0.5
        p.append(box((0.1, 0.1, 1.4), P(math.cos(a) * 0.45, math.sin(a) * 0.45, 1.0), frame, rot=(math.degrees(math.sin(a)) * 0.25, -math.degrees(math.cos(a)) * 0.25, 0), bevel=0.02))
    for z in (1.05, 1.45, 1.85):
        p.append(torus(0.32 - (z - 1.05) * 0.1, 0.045, P(0, 0, z), gCyan))
    p.append(cyl(0.22, 0.15, P(0, 0, 2.4), dark, 10))
    join('laser.base', p, P(0, 0, 0), rt)
    join('laser.ring', [torus(0.45, 0.06, P(0, 0, 2.6), gCyan)], P(0, 0, 2.6), rt)
    cr = [cone(0.2, 0.34, P(0, 0, 3.02), gCyan, 6), cone(0.2, 0.3, P(0, 0, 2.7), gCyan, 6, rot=(180, 0, 0))]
    join('laser.crystal', cr, P(0, 0, 2.85), rt)


def mortero():
    B = place(); rt = root('mortero', B); P = lambda *v: at(v, B)
    p = [box((1.7, 1.7, 0.36), P(0, 0, 0.18), concrete, bevel=0.04),
         box((1.74, 1.74, 0.08), P(0, 0, 0.4), hazardBlack)]
    for i in range(10):
        a = i / 10 * math.tau
        p.append(box((0.5, 0.3, 0.2), P(math.cos(a) * 0.98, math.sin(a) * 0.98, 0.36), sand, rot=(0, 0, math.degrees(a) + 90), bevel=0.08))
    for x in (-0.55, 0.55):
        p.append(box((0.3, 0.4, 0.25), P(x, 0.55, 0.56), frame, bevel=0.03))
        p.append(box((0.26, 0.05, 0.08), P(x, 0.33, 0.6), hazard))
    join('mortero.base', p, P(0, 0, 0), rt)
    h = [cyl(0.58, 0.4, P(0, 0, 0.72), frame, 12, r2=0.5, bevel=0.03),
         box((0.5, 0.5, 0.25), P(0, 0.1, 0.98), plate, bevel=0.05),
         cyl(0.24, 1.25, P(0, -0.35, 1.35), dark, 12, rot=(42, 0, 0), r2=0.3),
         torus(0.3, 0.06, P(0, -0.73, 1.78), gOrange, rot=(42, 0, 0)),
         cyl(0.05, 0.6, P(0.25, -0.05, 1.05), gunMetal, 8, rot=(42, 0, 0)),
         cyl(0.05, 0.6, P(-0.25, -0.05, 1.05), gunMetal, 8, rot=(42, 0, 0))]
    join('mortero.head', h, P(0, 0, 0.75), rt)


def mina():
    B = place(); rt = root('mina', B); P = lambda *v: at(v, B)
    p = [box((1.7, 1.7, 0.34), P(0, 0, 0.17), frame, bevel=0.03),
         cyl(0.62, 0.06, P(0, 0, 0.36), hazardBlack, 16)]
    for x, y in ((-0.72, -0.72), (0.72, -0.72), (-0.72, 0.72), (0.72, 0.72)):
        p.append(cyl(0.07, 1.8, P(x, y, 1.2), plate, 8))
    for s in (-1, 1):
        p.append(box((0.06, 1.44, 0.06), P(0.72 * s, 0, 1.0), dark, rot=(38, 0, 0)))
    p += [box((1.62, 1.62, 0.16), P(0, 0, 2.06), hazard, bevel=0.03),
          box((1.4, 1.4, 0.1), P(0, 0, 2.18), frame, bevel=0.02),
          box((0.6, 0.6, 0.5), P(0, 0, 2.48), dark, bevel=0.04),
          cyl(0.08, 0.5, P(0.2, 0.2, 2.9), gunMetal, 8),
          box((0.5, 0.5, 0.4), P(-0.95, 0.4, 0.55), plate, bevel=0.04),
          box((1.0, 0.24, 0.06), P(0.45, 0.8, 0.5), dark, rot=(0, -20, 0)),
          box((0.12, 0.06, 0.08), P(0.65, -0.72, 2.0), gAmber)]
    join('mina.frame', p, P(0, 0, 0), rt)
    d = [cone(0.4, 1.1, P(0, 0, 0.95), plate, 10, rot=(180, 0, 0), smooth=25),
         cyl(0.18, 0.5, P(0, 0, 1.7), gunMetal, 10)]
    helix = [(math.cos(t) * (0.05 + 0.35 * (1 - (t / 18))), math.sin(t) * (0.05 + 0.35 * (1 - (t / 18))), 0.45 + t / 18 * 1.0) for t in [i * 0.6 for i in range(31)]]
    d.append(tube([at(v, B) for v in helix], 0.035, hazard, 6))
    join('mina.drill', d, P(0, 0, 1.0), rt)
    pl = [ico(0.42, P(0.95, -0.95, 0.3), scrapM, (1, 1, 0.7), sub=1, jitter=0.5, seed=3)]
    for i in range(5):
        pl.append(box((0.16, 0.12, 0.06), P(0.95 + R.uniform(-0.3, 0.3), -0.95 + R.uniform(-0.3, 0.3), 0.55 + R.uniform(-0.1, 0.1)), scrapM, rot=(R.uniform(0, 90), R.uniform(0, 90), 0)))
    join('mina.pile', pl, P(0.95, -0.95, 0), rt)


def habitat():
    B = place(); rt = root('habitat', B); P = lambda *v: at(v, B)
    p = [cyl(1.4, 0.42, P(0, 0, 0.21), frame, 12, r2=1.3, bevel=0.03),
         sphere(1.18, P(0, 0, 0.42), plate, (1, 1, 0.92), seg=24, rings=16),
         torus(1.17, 0.05, P(0, 0, 0.62), dark, maj=48)]
    for i in range(10):
        a = i / 10 * math.tau
        if abs(math.cos(a) + 0) < 2 and not (math.sin(a) < -0.9):
            p.append(box((0.24, 0.06, 0.16), P(math.cos(a) * 1.12, math.sin(a) * 1.12, 0.9), gCyan, rot=(0, 0, math.degrees(a) + 90)))
    p += [box((0.7, 0.5, 0.9), P(0, -1.12, 0.55), plate, bevel=0.05),
          box((0.46, 0.06, 0.7), P(0, -1.38, 0.5), dark, bevel=0.02),
          box((0.6, 0.08, 0.08), P(0, -1.38, 0.95), accent),
          box((0.08, 0.04, 0.12), P(0.28, -1.42, 0.6), gGreen),
          cyl(0.03, 1.1, P(0.6, 0.5, 1.6), dark, 6),
          cone(0.22, 0.12, P(0.6, 0.5, 2.15), plate, 16, rot=(180, 0, 0), r2=0.02),
          sphere(0.04, P(0.6, 0.5, 2.2), gRed, seg=8, rings=6),
          box((1.1, 0.6, 0.04), P(-1.25, 0.6, 1.05), solar, rot=(30, 0, 0), bevel=0.01),
          box((1.14, 0.64, 0.03), P(-1.25, 0.6, 1.04), frame, rot=(30, 0, 0)),
          cyl(0.04, 0.8, P(-1.25, 0.6, 0.55), dark, 6)]
    join('habitat.mesh', p, P(0, 0, 0), rt)


def cuartel():
    B = place(); rt = root('cuartel', B); P = lambda *v: at(v, B)
    red = mat('barracksRed', '#c8382e', 0.5)
    p = [box((2.6, 2.2, 0.3), P(0, 0, 0.15), frame, bevel=0.03),
         cyl(1.05, 2.4, P(0, 0, 0.3), plate, 20, rot=(90, 0, 0), bevel=0.02)]
    for y in (-0.9, -0.3, 0.3, 0.9):
        p.append(cyl(1.09, 0.08, P(0, y, 0.3), dark, 20, rot=(90, 0, 0)))
    p += [box((0.9, 0.12, 0.85), P(0, -1.2, 0.72), dark, bevel=0.03),
          box((1.1, 0.1, 0.1), P(0, -1.22, 1.2), red),
          box((0.12, 0.06, 0.12), P(0.55, -1.25, 0.95), gRed),
          box((2.1, 0.08, 0.12), P(0, 0, 1.36), red),
          cyl(0.04, 2.3, P(1.1, 0.85, 1.45), plate, 6),
          sphere(0.06, P(1.1, 0.85, 2.62), gAmber, seg=8, rings=6),
          box((0.5, 0.5, 0.45), P(-1.05, -0.8, 0.52), scrapM, bevel=0.03),
          box((0.4, 0.4, 0.35), P(-1.0, -0.8, 0.92), dark, bevel=0.03)]
    join('cuartel.mesh', p, P(0, 0, 0), rt)
    join('cuartel.flag', [box((0.72, 0.03, 0.44), P(1.47, 0.85, 2.3), red, bevel=0.01),
                          box((0.2, 0.035, 0.2), P(1.47, 0.85, 2.3), gAmber)], P(1.1, 0.85, 2.3), rt)


def core():
    B = place(); rt = root('core', B); P = lambda *v: at(v, B)
    p = [cyl(3.6, 0.5, P(0, 0, 0.25), concrete, 8, r2=3.3, bevel=0.05, smooth=0),
         cyl(3.32, 0.06, P(0, 0, 0.52), hazardBlack, 8, smooth=0)]
    for i in range(8):
        a = i / 8 * math.tau + math.tau / 16
        p.append(box((0.38, 0.14, 0.38), P(math.cos(a) * 3.12, math.sin(a) * 3.12, 0.56), gGreen, rot=(0, 0, math.degrees(a))))
    for i in range(4):
        a = i / 4 * math.tau
        for k in range(3):
            p.append(box((1.3, 0.3, 0.16), P(math.cos(a) * (3.8 + k * 0.28), math.sin(a) * (3.8 + k * 0.28), 0.42 - k * 0.14), concrete, rot=(0, 0, math.degrees(a) + 90), bevel=0.03))
    p += [cyl(2.6, 1.75, P(0, 0, 1.38), plate, 8, r2=2.2, bevel=0.06, smooth=0),
          cyl(2.26, 0.28, P(0, 0, 1.62), gGreen, 8, smooth=0),
          cyl(2.0, 0.22, P(0, 0, 2.2), frame, 16)]
    for i in range(8):
        a = i / 8 * math.tau
        p.append(box((0.6, 0.08, 0.32), P(math.cos(a) * 2.42, math.sin(a) * 2.42, 1.0), mat('window', '#9fe8ff', 0.2, 0, '#6fd8ff', 2.5), rot=(0, 0, math.degrees(a) + 90)))
        p.append(box((0.12, 0.3, 1.7), P(math.cos(a + 0.39) * 2.45, math.sin(a + 0.39) * 2.45, 1.38), frame, rot=(0, 0, math.degrees(a + 0.39)), bevel=0.02))
    for i in range(4):
        a = i / 4 * math.tau + math.tau / 8
        p.append(cyl(0.32, 1.1, P(math.cos(a) * 3.0, math.sin(a) * 3.0, 1.05), accent, 12, bevel=0.02))
        p.append(torus(0.33, 0.04, P(math.cos(a) * 3.0, math.sin(a) * 3.0, 1.4), dark))
        p.append(tube([P(math.cos(a) * 2.75, math.sin(a) * 2.75, 1.3), P(math.cos(a) * 2.5, math.sin(a) * 2.5, 1.9)], 0.06, dark))
    p += [sphere(1.9, P(0, 0, 2.2), glass, (1, 1, 0.75), seg=24, rings=12),
          cyl(0.05, 2.6, P(2.0, -0.9, 2.9), plate, 6)]
    join('core.base', p, P(0, 0, 0), rt)
    join('core.beacon', [sphere(0.16, P(2.0, -0.9, 4.25), gRed, seg=10, rings=8)], P(2.0, -0.9, 4.25), rt)
    sp = [cyl(0.32, 2.9, P(0, 0, 2.2 + 1.45), plate, 8, r2=0.14, bevel=0.02),
          torus(0.28, 0.04, P(0, 0, 2.9), gGreen), torus(0.22, 0.04, P(0, 0, 3.7), gGreen)]
    join('core.spire', sp, P(0, 0, 2.2), rt)
    g = [cone(0.75, 0.9, P(0, 0, 6.45), mat('coreGem', '#7dffb0', 0.15, 0, '#2bff7a', 3.5), 6), cone(0.75, 0.9, P(0, 0, 5.55), mat('coreGem', '#7dffb0', 0.15, 0, '#2bff7a', 3.5), 6, rot=(180, 0, 0))]
    join('core.gem', g, P(0, 0, 6.0), rt)
    for i in range(3):
        join(f'core.ring{i + 1}', [torus(1.15 + i * 0.32, 0.05, P(0, 0, 6.0), gGreen, maj=48)], P(0, 0, 6.0), rt)


# ================================================================ world: ship, POIs, props
def esperanza():
    """The crashed colony ship. Nose points -Y; the game tilts and buries it."""
    B = place(); rt = root('esperanza', B); P = lambda *v: at(v, B)
    prof = [(-7.5, 0.25), (-6.8, 1.0), (-5.5, 1.7), (-3.5, 2.1), (0, 2.25), (3.5, 2.2), (5.5, 1.9), (6.6, 1.5)]
    p = [tube([P(0, y, 2.3) for y, _ in prof], [r for _, r in prof], hull, 20)]
    for y in (-3.0, -0.5, 2.0, 4.5):
        p.append(torus(2.18 - abs(y) * 0.05, 0.07, P(0, y, 2.3), frame, rot=(90, 0, 0), maj=40))
    p.append(box((0.2, 11.0, 0.5), P(2.15, -0.5, 2.6), hullStripe))
    p.append(box((0.2, 11.0, 0.5), P(-2.15, -0.5, 2.6), hullStripe))
    p.append(sphere(1.1, P(0, -6.0, 3.0), glass, (0.9, 1.3, 0.55), seg=20, rings=10))
    for i in range(10):
        p.append(box((0.08, 0.36, 0.22), P(2.17, -4.5 + i * 0.95, 3.4), mat('window', '#9fe8ff', 0.2, 0, '#6fd8ff', 2.5)))
    # intact wing (right) and snapped wing (left)
    p.append(box((5.5, 3.2, 0.25), P(4.6, 1.2, 1.6), hull, rot=(0, -8, -12), bevel=0.05))
    p.append(box((5.2, 0.3, 0.27), P(4.6, -0.3, 1.65), hullStripe, rot=(0, -8, -12)))
    p.append(box((2.2, 2.6, 0.25), P(-3.0, 1.4, 1.5), hull, rot=(0, 25, 18), bevel=0.05))
    for k in range(5):
        p.append(box((0.3, 0.2, 0.18), P(-4.0 - R.random() * 0.4, 0.4 + k * 0.5, 1.2 + R.random() * 0.3), burnt, rot=(R.uniform(0, 60), R.uniform(0, 60), 0)))
    # engines
    for x, z in ((0, 3.2), (-1.4, 1.6), (1.4, 1.6)):
        p.append(cyl(0.75, 2.6, P(x, 6.4, z), frame, 16, rot=(90, 0, 0), bevel=0.03))
        p.append(cyl(0.85, 0.9, P(x, 7.9, z), dark, 16, rot=(90, 0, 0), r2=0.6))
    # scorch and panels
    for i in range(14):
        p.append(box((R.uniform(0.6, 1.8), R.uniform(0.6, 1.6), 0.04), P(R.uniform(-1.6, 1.6), R.uniform(-5, 5), 4.45), burnt, rot=(0, 0, R.uniform(0, 90))))
    for i in range(6):
        p.append(box((1.2, 0.9, 0.06), P(R.choice((-1, 1)) * 1.95, R.uniform(-4, 4), R.uniform(1.6, 3.2)), plate, rot=(0, 90, 0)))
    p.append(cyl(0.05, 1.6, P(-0.8, 1.5, 5.2), dark, 6))
    join('esperanza.hull', p, P(0, 0, 0), rt)
    join('esperanza.dish', [cone(0.8, 0.35, P(-0.8, 1.5, 6.1), plate, 20, rot=(150, 0, 0), r2=0.08),
                            cyl(0.04, 0.5, P(-0.8, 1.3, 6.3), dark, 6, rot=(-30, 0, 0))], P(-0.8, 1.5, 6.0), rt)
    for i, (x, y, z) in enumerate(((1.6, -2.5, 4.0), (1.6, 0.5, 4.1), (-1.6, 2.5, 4.0), (0, 4.5, 4.4), (-1.6, -1.0, 4.1))):
        join(f'esperanza.light{i + 1}', [sphere(0.16, P(x, y, z), mat('shipLight', '#7dffb0', 0.3, 0, '#4dff98', 5), seg=10, rings=8)], P(x, y, z), rt)
    for i, (x, z) in enumerate(((0, 3.2), (-1.4, 1.6), (1.4, 1.6))):
        join(f'esperanza.engine{i + 1}', [cyl(0.55, 0.1, P(x, 8.3, z), mat('engineGlow', '#ffb36a', 0.3, 0, '#ff7a1a', 6), 16, rot=(90, 0, 0))], P(x, 8.3, z), rt)


def deposit():
    B = place(); rt = root('deposit', B); P = lambda *v: at(v, B)
    join('deposit.rock', [ico(0.95, P(0, 0, 0.15), rock, (1.2, 1.0, 0.45), sub=1, jitter=0.4, seed=11),
                          ico(0.5, P(0.8, 0.5, 0.1), rock2, (1, 1, 0.6), sub=1, jitter=0.4, seed=12)], P(0, 0, 0), rt)
    cr = []
    for i in range(8):
        a = R.uniform(0, math.tau); r = R.uniform(0, 0.7); h = R.uniform(0.7, 2.0); w = R.uniform(0.14, 0.3)
        x, y = math.cos(a) * r, math.sin(a) * r
        tilt = (R.uniform(-25, 25), R.uniform(-25, 25), R.uniform(0, 60))
        cr.append(cyl(w, h, P(x, y, h / 2 + 0.1), crystal, 6, rot=tilt, smooth=0))
        cr.append(cone(w, w * 1.6, P(x, y, h + 0.1 + w * 0.8), crystal, 6, rot=tilt))
    join('deposit.crystals', cr, P(0, 0, 0), rt)


def nest():
    B = place(); rt = root('nest', B); P = lambda *v: at(v, B)
    sh, dk, gl = A['bicho']
    p = [ico(1.6, P(0, 0, 0.2), sh, (1, 1, 0.62), sub=2, jitter=0.35, seed=5),
         ico(1.0, P(0.9, 0.7, 0.1), dk, (1, 1, 0.6), sub=2, jitter=0.4, seed=6),
         cyl(2.6, 0.06, P(0, 0, 0.03), mat('goo', '#2a0a24', 0.2, 0, '#5a0a4a', 0.6), 24)]
    for i in range(8):
        a = i / 8 * math.tau
        p.append(tube([P(math.cos(a) * 1.2, math.sin(a) * 1.2, 0.5), P(math.cos(a) * 1.9, math.sin(a) * 1.9, 0.9), P(math.cos(a) * 2.4, math.sin(a) * 2.4, 0.1)], [0.14, 0.1, 0.04], dk))
    for i in range(6):
        a = i / 6 * math.tau + 0.4
        p.append(sphere(0.22, P(math.cos(a) * 1.25, math.sin(a) * 1.25, 0.75), gl, (1, 1, 1.3), seg=10, rings=8))
    join('nest.mound', p, P(0, 0, 0), rt)
    join('nest.eye', [sphere(0.5, P(0, 0, 1.35), gl, seg=16, rings=12), sphere(0.22, P(0, -0.38, 1.4), mat('pupil', '#120008', 0.3), (1, 0.4, 1.4), seg=10, rings=8)], P(0, 0, 1.35), rt)


def wreck():
    B = place(); rt = root('wreck', B); P = lambda *v: at(v, B)
    p = [sphere(0.9, P(0, 0, 0.6), hull, (1, 1.6, 0.85), seg=18, rings=12, rot=(0, 0, 25)),
         sphere(0.4, P(-0.35, -1.1, 0.85), glass, (1, 1, 0.7), seg=12, rings=8),
         box((2.4, 0.1, 1.0), P(0.9, 0.6, 0.3), hull, rot=(20, 10, 30), bevel=0.03),
         box((0.4, 0.4, 0.3), P(-1.5, -0.6, 0.15), burnt, rot=(10, 20, 30)),
         cyl(0.35, 0.5, P(0.2, 1.4, 0.55), dark, 12, rot=(80, 0, 25))]
    for i in range(6):
        p.append(box((0.6, 0.5, 0.04), P(R.uniform(-1.2, 1.2), R.uniform(-1.4, 1.4), 1.0), burnt, rot=(R.uniform(-30, 30), R.uniform(-30, 30), R.uniform(0, 90))))
    join('wreck.pod', p, P(0, 0, 0), rt)
    join('wreck.crate', [box((0.9, 0.7, 0.6), P(1.6, -1.0, 0.3), scrapM, bevel=0.03),
                         box((0.92, 0.1, 0.62), P(1.6, -1.0, 0.3), dark),
                         box((0.2, 0.05, 0.2), P(1.6, -1.37, 0.35), gAmber)], P(1.6, -1.0, 0), rt)
    join('wreck.lid', [box((0.94, 0.74, 0.12), P(1.6, -1.0, 0.66), hazard, bevel=0.02)], P(1.6, -0.63, 0.66), rt)


def pickups():
    B = place(); rt = root('scrap', B); P = lambda *v: at(v, B)
    join('scrap.mesh', [torus(0.22, 0.08, P(0, 0, 0), scrapM, rot=(90, 0, 0), maj=10, mino=6),
                        box((0.16, 0.16, 0.34), P(0.05, 0, 0), dark, rot=(0, 20, 40), bevel=0.02),
                        cyl(0.06, 0.4, P(-0.05, 0, 0), scrapM, 6, rot=(0, 60, 0))], P(0, 0, 0), rt)
    B = place(); rt = root('shard', B); P = lambda *v: at(v, B)
    join('shard.mesh', [cone(0.22, 0.4, P(0, 0, 0.2), crystal, 6), cone(0.22, 0.3, P(0, 0, -0.15), crystal, 6, rot=(180, 0, 0))], P(0, 0, 0), rt)


def rocks():
    for i in range(5):
        B = place(); rt = root(f'rock{i + 1}', B); P = lambda *v: at(v, B)
        m = rock if i % 2 == 0 else rock2
        pcs = [ico(1.0, P(0, 0, 0.35), m, (1.0 + R.random() * 0.5, 0.9 + R.random() * 0.4, 0.55 + R.random() * 0.4), sub=1 + (i % 2), jitter=0.45, seed=20 + i)]
        if i >= 2:
            pcs.append(ico(0.5, P(0.9, 0.3, 0.15), rock2, (1, 1, 0.7), sub=1, jitter=0.5, seed=40 + i))
        join(f'rock{i + 1}.mesh', pcs, P(0, 0, 0), rt)
    for i in range(3):
        B = place(); rt = root(f'cliff{i + 1}', B); P = lambda *v: at(v, B)
        pcs = []
        for k in range(4):
            pcs.append(ico(2.2, P(k * 2.6 - 3.9, R.uniform(-0.6, 0.6), 1.8 + R.random() * 1.6), rock if k % 2 else rock2,
                           (1.2, 1.0, 1.3 + R.random() * 0.8), sub=1, jitter=0.45, seed=60 + i * 4 + k))
        join(f'cliff{i + 1}.mesh', pcs, P(0, 0, 0), rt)


def flora():
    stem = mat('stem', '#4c3d5e', 0.7)
    caps = [mat('capCyan', '#6fe3ff', 0.35, 0, '#43d4ff', 2.5), mat('capViolet', '#c77dff', 0.35, 0, '#b05cff', 2.5), mat('capLime', '#9dff4f', 0.35, 0, '#7dff2f', 2.0)]
    for i, cp in enumerate(caps):
        B = place(); rt = root(f'shroom{i + 1}', B); P = lambda *v: at(v, B)
        pcs = []
        for k in range(3 + i):
            a = R.uniform(0, math.tau); r = R.uniform(0, 0.4); h = R.uniform(0.5, 1.6)
            x, y = math.cos(a) * r, math.sin(a) * r
            pcs.append(tube([P(x, y, 0), P(x * 1.3, y * 1.3, h * 0.6), P(x * 1.5, y * 1.5, h)], [0.08, 0.06, 0.05], stem, 6))
            pcs.append(sphere(0.22 + h * 0.15, P(x * 1.5, y * 1.5, h), cp, (1, 1, 0.45), seg=12, rings=8))
        join(f'shroom{i + 1}.mesh', pcs, P(0, 0, 0), rt)
    B = place(); rt = root('coral', B); P = lambda *v: at(v, B)
    pcs = []
    for k in range(7):
        a = k / 7 * math.tau; h = R.uniform(0.8, 1.8)
        pcs.append(tube([P(0, 0, 0), P(math.cos(a) * 0.2, math.sin(a) * 0.2, h * 0.5), P(math.cos(a) * 0.4, math.sin(a) * 0.4, h)], [0.1, 0.07, 0.05], mat('coralM', '#6a2c7a', 0.6), 6))
        pcs.append(sphere(0.08, P(math.cos(a) * 0.4, math.sin(a) * 0.4, h), caps[1], seg=8, rings=6))
    join('coral.mesh', pcs, P(0, 0, 0), rt)
    B = place(); rt = root('sporetree', B); P = lambda *v: at(v, B)
    pcs = [tube([P(0, 0, 0), P(0.3, 0.1, 1.2), P(-0.1, 0.2, 2.4), P(0.2, 0, 3.4)], [0.28, 0.2, 0.15, 0.1], stem, 8)]
    for k in range(6):
        a = k / 6 * math.tau
        pcs.append(tube([P(0.15, 0.05, 2.8), P(math.cos(a) * 1.0, math.sin(a) * 1.0, 3.3), P(math.cos(a) * 1.4, math.sin(a) * 1.4, 2.9)], [0.08, 0.05, 0.03], stem, 6))
        pcs.append(sphere(0.2, P(math.cos(a) * 1.4, math.sin(a) * 1.4, 2.75), caps[0], (1, 1, 1.3), seg=10, rings=8))
    join('sporetree.mesh', pcs, P(0, 0, 0), rt)


def props():
    B = place(); rt = root('crate', B); P = lambda *v: at(v, B)
    join('crate.mesh', [box((0.9, 0.9, 0.8), P(0, 0, 0.4), frame, bevel=0.04), box((0.94, 0.94, 0.1), P(0, 0, 0.6), hazard),
                        box((0.5, 0.04, 0.2), P(0, -0.47, 0.35), dark)], P(0, 0, 0), rt)
    B = place(); rt = root('barrel', B); P = lambda *v: at(v, B)
    join('barrel.mesh', [cyl(0.32, 0.9, P(0, 0, 0.45), accent, 14, bevel=0.02), torus(0.33, 0.03, P(0, 0, 0.2), dark), torus(0.33, 0.03, P(0, 0, 0.7), dark),
                         cyl(0.1, 0.06, P(0.12, 0, 0.92), dark, 8)], P(0, 0, 0), rt)
    B = place(); rt = root('lamp', B); P = lambda *v: at(v, B)
    join('lamp.mesh', [cyl(0.2, 0.15, P(0, 0, 0.08), frame, 8), cyl(0.05, 2.0, P(0, 0, 1.1), plate, 8),
                       box((0.5, 0.12, 0.08), P(0.2, 0, 2.08), dark, bevel=0.02), box((0.36, 0.08, 0.03), P(0.25, 0, 2.03), gAmber)], P(0, 0, 0), rt)
    B = place(); rt = root('antenna', B); P = lambda *v: at(v, B)
    pcs = [box((0.8, 0.8, 0.2), P(0, 0, 0.1), concrete, bevel=0.03)]
    for i in range(3):
        a = i / 3 * math.tau
        pcs.append(tube([P(math.cos(a) * 0.35, math.sin(a) * 0.35, 0.2), P(0, 0, 3.2)], 0.04, frame, 6))
    pcs += [cyl(0.05, 1.0, P(0, 0, 3.6), plate, 6), sphere(0.08, P(0, 0, 4.15), gRed, seg=8, rings=6),
            cone(0.5, 0.25, P(0.2, 0, 2.6), plate, 16, rot=(120, 0, 90), r2=0.05)]
    join('antenna.mesh', pcs, P(0, 0, 0), rt)
    B = place(); rt = root('solar', B); P = lambda *v: at(v, B)
    join('solar.mesh', [cyl(0.05, 0.9, P(0, 0, 0.45), dark, 6), box((1.6, 1.0, 0.05), P(0, 0, 0.95), solar, rot=(25, 0, 0), bevel=0.01),
                        box((1.66, 1.06, 0.03), P(0, 0, 0.93), frame, rot=(25, 0, 0))], P(0, 0, 0), rt)


for fn in (astronaut, bicho, veloz, escupidor, volador, acorazado, jefe, muro, torreta, laser, mortero, mina, habitat, cuartel, core,
           esperanza, deposit, nest, wreck, pickups, rocks, flora, props):
    fn()
    print('built', fn.__name__, flush=True)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animation_mode='NLA_TRACKS', export_apply=True,
                          export_yup=True, export_extras=False, export_lights=False, export_cameras=False)
print('exported', OUT)
