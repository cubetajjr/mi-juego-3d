"""Small modelling toolkit on top of bpy used by build_assets.py.

Conventions
- Blender is Z-up and characters face -Y; the glTF exporter turns that into Y-up facing +Z,
  which is what the game expects (rotation.y = atan2(dx, dz)).
- Every asset is an Empty root named after the asset. Animated parts are separate mesh
  objects whose origin sits on the joint, named "<asset>.<part>" so clips bind per clone.
- Clips are NLA tracks named "<asset>|<Clip>"; the exporter merges same-named tracks
  across objects into one glTF animation.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Euler

FPS = 30
MATS = {}
CLASS = {}
# Materials that must stay separate: recoloured per unit, swapped at runtime, or transparent.
KEEP = {'accent', 'glass', 'wing', 'crystal', 'shipLight', 'engineGlow'}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()
    CLASS.clear()
    sc = bpy.context.scene
    sc.render.fps = FPS


def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(hexstr):
    h = hexstr.lstrip('#')
    return tuple(_lin(int(h[i:i + 2], 16)) for i in (0, 2, 4))


def mat(name, col, rough=0.6, metal=0.0, emit=None, es=0.0, alpha=1.0):
    """Principled material, cached by name. `emit` is a hex colour, `es` its strength."""
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value = (*rgb(col), 1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    if emit:
        p.inputs['Emission Color'].default_value = (*rgb(emit), 1)
        # strengths in build_assets.py are authored for bloom; 0.3 keeps the hue under ACES tone mapping
        p.inputs['Emission Strength'].default_value = es * 0.3
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'
    # Most materials only differ in colour: those become vertex colours on three shared
    # "class" materials (matte, metal, glow) so the game draws each part in few calls.
    if name not in KEEP and alpha >= 1:
        m['cls'] = 'glow' if (emit and es >= 1.5) else ('metal' if metal >= 0.45 else 'matte')
        m['vcol'] = (*rgb(emit if m['cls'] == 'glow' else col), 1.0)
    MATS[name] = m
    return m


def class_mat(cls):
    if cls in CLASS:
        return CLASS[cls]
    m = bpy.data.materials.new({'matte': 'kitMatte', 'metal': 'kitMetal', 'glow': 'kitGlow'}[cls])
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor')
    ca.layer_name = 'Col'
    nt.links.new(ca.outputs['Color'], p.inputs['Base Color'])
    p.inputs['Roughness'].default_value = {'matte': 0.68, 'metal': 0.38, 'glow': 0.35}[cls]
    p.inputs['Metallic'].default_value = {'matte': 0.0, 'metal': 0.6, 'glow': 0.0}[cls]
    if cls == 'glow':
        p.inputs['Emission Color'].default_value = (1, 1, 1, 1)
        p.inputs['Emission Strength'].default_value = 1.0
    CLASS[cls] = m
    return m


def _paint(o, m):
    """Write the material colour into the 'Col' corner attribute and swap to its class material."""
    me = o.data
    attr = me.color_attributes.get('Col') or me.color_attributes.new(name='Col', type='FLOAT_COLOR', domain='CORNER')
    col = m['vcol'] if 'cls' in m else (1, 1, 1, 1)
    for d in attr.data:
        d.color = col
    if 'cls' in m:
        me.materials.clear()
        me.materials.append(class_mat(m['cls']))


def _finish(o, m, rot=(0, 0, 0), bevel=0.0, seg=2, subdiv=0, smooth=None):
    o.rotation_euler = Euler([math.radians(a) for a in rot])
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if m is not None:
        o.data.materials.clear()
        o.data.materials.append(m)
        _paint(o, m)
    if bevel > 0:
        md = o.modifiers.new('bev', 'BEVEL')
        md.width = bevel
        md.segments = seg
        md.limit_method = 'ANGLE'
        md.angle_limit = math.radians(40)
        bpy.ops.object.modifier_apply(modifier=md.name)
    if subdiv:
        md = o.modifiers.new('sub', 'SUBSURF')
        md.levels = subdiv
        md.render_levels = subdiv
        bpy.ops.object.modifier_apply(modifier=md.name)
    if smooth is None:
        smooth = 30 if (bevel or subdiv) else 0
    if smooth:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(smooth))
    else:
        bpy.ops.object.shade_flat()
    o.select_set(False)
    return o


def box(size, loc, m, rot=(0, 0, 0), bevel=0.0, seg=2):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.active_object
    o.scale = size
    return _finish(o, m, rot, bevel, seg)


def cyl(r, h, loc, m, verts=16, rot=(0, 0, 0), r2=None, bevel=0.0, smooth=35, cap=True):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=h, location=loc,
                                            end_fill_type='NGON' if cap else 'NOTHING')
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc,
                                        end_fill_type='NGON' if cap else 'NOTHING')
    return _finish(bpy.context.active_object, m, rot, bevel, smooth=smooth)


def cone(r, h, loc, m, verts=8, rot=(0, 0, 0), r2=0.0, smooth=0):
    bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=h, location=loc)
    return _finish(bpy.context.active_object, m, rot, smooth=smooth)


def sphere(r, loc, m, scale=(1, 1, 1), seg=16, rings=10, rot=(0, 0, 0), smooth=60, subdiv=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = bpy.context.active_object
    o.scale = scale
    return _finish(o, m, rot, subdiv=subdiv, smooth=smooth)


def ico(r, loc, m, scale=(1, 1, 1), sub=1, rot=(0, 0, 0), smooth=0, jitter=0.0, seed=0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=r, location=loc)
    o = bpy.context.active_object
    if jitter:
        rnd = random.Random(seed)
        for v in o.data.vertices:
            v.co *= 1 + (rnd.random() - 0.5) * jitter
    o.scale = scale
    return _finish(o, m, rot, smooth=smooth)


def torus(R, r, loc, m, rot=(0, 0, 0), maj=32, mino=8):
    bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mino, location=loc)
    return _finish(bpy.context.active_object, m, rot, smooth=60)


def tube(points, r, m, verts=8):
    """Tapered tube along a polyline; r may be a float or a list (one radius per point)."""
    bm = bmesh.new()
    rs = r if isinstance(r, (list, tuple)) else [r] * len(points)
    rings = []
    for i, p in enumerate(points):
        p = Vector(p)
        d = (Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(i - 1, 0)])).normalized()
        a = d.orthogonal().normalized()
        b = d.cross(a).normalized()
        ring = []
        for k in range(verts):
            t = k / verts * math.tau
            ring.append(bm.verts.new(p + (a * math.cos(t) + b * math.sin(t)) * rs[i]))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(verts):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % verts], rings[i + 1][(k + 1) % verts], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0])))
    bm.faces.new(rings[-1])
    me = bpy.data.meshes.new('tube')
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new('tube', me)
    bpy.context.scene.collection.objects.link(o)
    bpy.context.view_layer.objects.active = o
    return _finish(o, m, smooth=50)


def join(name, pieces, pivot=(0, 0, 0), parent=None):
    """Join pieces into one mesh named `name` with its origin at `pivot` (world space)."""
    bpy.ops.object.select_all(action='DESELECT')
    pieces = [p for p in pieces if p is not None]
    for p in pieces:
        p.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    if len(pieces) > 1:
        bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    o.data.name = name
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    bpy.context.scene.cursor.location = (0, 0, 0)
    o.select_set(False)
    if parent is not None:
        set_parent(o, parent)
    return o


def set_parent(o, parent):
    mw = o.matrix_world.copy()
    o.parent = parent
    o.matrix_world = mw


def root(name, loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.5
    e.location = loc
    bpy.context.scene.collection.objects.link(e)
    return e


def empty(name, loc, parent):
    e = bpy.data.objects.new(name, None)
    e.empty_display_size = 0.2
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    set_parent(e, parent)
    return e


def mirror_x(pts):
    return [(-x, y, z) for (x, y, z) in pts]


def clip(asset, name, tracks, frames):
    """tracks: {obj: {'rot': [(frame, (x,y,z) degrees)...], 'loc': [...], 'scale': [...]}}.
    Loc keys are offsets from the rest location."""
    tname = f"{asset}|{name}"
    for o, chans in tracks.items():
        rest_loc = o.location.copy()
        rest_rot = o.rotation_euler.copy()
        rest_scale = o.scale.copy()
        o.animation_data_create()
        act = bpy.data.actions.new(f"{tname}:{o.name}")
        o.animation_data.action = act
        for f, v in chans.get('rot', []):
            o.rotation_euler = Euler([rest_rot[i] + math.radians(v[i]) for i in range(3)])
            o.keyframe_insert('rotation_euler', frame=f)
        for f, v in chans.get('loc', []):
            o.location = rest_loc + Vector(v)
            o.keyframe_insert('location', frame=f)
        for f, v in chans.get('scale', []):
            o.scale = Vector([rest_scale[i] * v[i] for i in range(3)])
            o.keyframe_insert('scale', frame=f)
        tr = o.animation_data.nla_tracks.new()
        tr.name = tname
        st = tr.strips.new(tname, 1, act)
        st.frame_end = frames + 1
        o.animation_data.action = None
        o.location, o.rotation_euler, o.scale = rest_loc, rest_rot, rest_scale


def cycle(n, amp, phase=0.0, axis=0, frames=24, steps=8, base=(0, 0, 0)):
    """Sinusoidal keys for a looping clip: rotate `amp` degrees on `axis`."""
    keys = []
    for i in range(steps + 1):
        f = 1 + frames * i / steps
        v = list(base)
        v[axis] += amp * math.sin(i / steps * math.tau + phase)
        keys.append((f, tuple(v)))
    return keys
