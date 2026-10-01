"""Create a rounded, shareable cat model as GLB + OBJ and a PNG preview.

The generator is intentionally dependency-light (Python + NumPy + Pillow) so the
asset can be rebuilt without Blender. Blender can import either exported model.
"""

from __future__ import annotations

import json
import math
import struct
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "exports" / "gato_apapachable"


@dataclass(frozen=True)
class Part:
    name: str
    material: str
    position: tuple[float, float, float]
    scale: tuple[float, float, float]
    rotation_y: float = 0.0


MATERIALS = {
    "naranja": (0.92, 0.50, 0.17, 1.0),
    "crema": (1.00, 0.76, 0.43, 1.0),
    "blanco": (1.00, 0.98, 0.93, 1.0),
    "cafe": (0.18, 0.075, 0.035, 1.0),
    "rosa": (1.00, 0.48, 0.51, 1.0),
}


# Every component is a true 3D ellipsoid. Their generous intersections are
# deliberate: they form one visually continuous, soft toy-like character.
PARTS = [
    Part("Cuerpo_redondito", "naranja", (0.0, 0.05, 1.45), (1.40, 1.02, 1.48)),
    Part("Pancita", "crema", (0.0, -0.91, 1.38), (0.76, 0.16, 0.89)),
    Part("Pie_izquierdo", "naranja", (-0.67, -0.28, 0.27), (0.67, 0.78, 0.40), -0.10),
    Part("Pie_derecho", "naranja", (0.67, -0.28, 0.27), (0.67, 0.78, 0.40), 0.10),
    Part("Brazo_izquierdo", "naranja", (-0.82, -0.82, 1.52), (0.34, 0.31, 0.88), -0.27),
    Part("Brazo_derecho", "naranja", (0.82, -0.82, 1.52), (0.34, 0.31, 0.88), 0.27),
    Part("Cabeza", "naranja", (0.0, -0.03, 3.35), (1.52, 1.17, 1.27)),
    Part("Oreja_izquierda", "naranja", (-0.91, 0.02, 4.55), (0.59, 0.74, 1.36), -0.14),
    Part("Oreja_derecha", "naranja", (0.91, 0.02, 4.55), (0.59, 0.74, 1.36), 0.14),
    Part("Ojo_izquierdo", "blanco", (-0.54, -1.105, 3.52), (0.24, 0.14, 0.49)),
    Part("Ojo_derecho", "blanco", (0.54, -1.105, 3.52), (0.24, 0.14, 0.49)),
    Part("Pupila_izquierda", "cafe", (-0.54, -1.225, 3.45), (0.095, 0.055, 0.24)),
    Part("Pupila_derecha", "cafe", (0.54, -1.225, 3.45), (0.095, 0.055, 0.24)),
    Part("Nariz", "cafe", (0.0, -1.245, 3.05), (0.14, 0.075, 0.11)),
    Part("Mejilla_izquierda", "rosa", (-0.88, -1.145, 2.98), (0.22, 0.07, 0.14)),
    Part("Mejilla_derecha", "rosa", (0.88, -1.145, 2.98), (0.22, 0.07, 0.14)),
    # A plump curved tail assembled from overlapping rounded volumes.
    Part("Cola_base", "naranja", (1.34, 0.35, 1.14), (0.43, 0.45, 0.83), -0.55),
    Part("Cola_media", "naranja", (1.73, 0.38, 1.66), (0.39, 0.42, 0.82), -0.28),
    Part("Cola_punta", "naranja", (1.79, 0.36, 2.25), (0.38, 0.41, 0.68), 0.18),
]


def sphere_mesh(lat_segments: int = 32, lon_segments: int = 48):
    vertices, normals = [], []
    for lat in range(lat_segments + 1):
        phi = math.pi * lat / lat_segments
        z = math.cos(phi)
        ring = math.sin(phi)
        for lon in range(lon_segments + 1):
            theta = 2.0 * math.pi * lon / lon_segments
            v = (ring * math.cos(theta), ring * math.sin(theta), z)
            vertices.append(v)
            normals.append(v)

    indices = []
    stride = lon_segments + 1
    for lat in range(lat_segments):
        for lon in range(lon_segments):
            a = lat * stride + lon
            b = a + stride
            if lat != 0:
                indices.extend((a, b, a + 1))
            if lat != lat_segments - 1:
                indices.extend((a + 1, b, b + 1))
    return np.asarray(vertices, np.float32), np.asarray(normals, np.float32), np.asarray(indices, np.uint16)


def aligned_append(blob: bytearray, payload: bytes) -> tuple[int, int]:
    while len(blob) % 4:
        blob.append(0)
    offset = len(blob)
    blob.extend(payload)
    return offset, len(payload)


def export_glb(path: Path):
    vertices, normals, indices = sphere_mesh()
    binary = bytearray()
    p_off, p_len = aligned_append(binary, vertices.tobytes())
    n_off, n_len = aligned_append(binary, normals.tobytes())
    i_off, i_len = aligned_append(binary, indices.tobytes())

    material_names = list(MATERIALS)
    doc = {
        "asset": {"version": "2.0", "generator": "MyQwiz rounded cat generator"},
        "scene": 0,
        "scenes": [{"name": "Gato apapachable", "nodes": list(range(len(PARTS)))}],
        "nodes": [],
        "meshes": [],
        "materials": [],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(vertices), "type": "VEC3", "min": [-1, -1, -1], "max": [1, 1, 1]},
            {"bufferView": 1, "componentType": 5126, "count": len(normals), "type": "VEC3"},
            {"bufferView": 2, "componentType": 5123, "count": len(indices), "type": "SCALAR", "min": [int(indices.min())], "max": [int(indices.max())]},
        ],
        "bufferViews": [
            {"buffer": 0, "byteOffset": p_off, "byteLength": p_len, "target": 34962},
            {"buffer": 0, "byteOffset": n_off, "byteLength": n_len, "target": 34962},
            {"buffer": 0, "byteOffset": i_off, "byteLength": i_len, "target": 34963},
        ],
        "buffers": [{"byteLength": len(binary)}],
    }

    for name, rgba in MATERIALS.items():
        doc["materials"].append({
            "name": name,
            "pbrMetallicRoughness": {
                "baseColorFactor": list(rgba),
                "metallicFactor": 0.0,
                "roughnessFactor": 0.82,
            },
        })

    for mat_index, mat_name in enumerate(material_names):
        doc["meshes"].append({
            "name": f"Forma_redonda_{mat_name}",
            "primitives": [{
                "attributes": {"POSITION": 0, "NORMAL": 1},
                "indices": 2,
                "material": mat_index,
                "mode": 4,
            }],
        })

    for part in PARTS:
        q = [0.0, math.sin(part.rotation_y / 2.0), 0.0, math.cos(part.rotation_y / 2.0)]
        doc["nodes"].append({
            "name": part.name,
            "mesh": material_names.index(part.material),
            "translation": list(part.position),
            "rotation": q,
            "scale": list(part.scale),
        })

    json_bytes = json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_bytes += b" " * ((4 - len(json_bytes) % 4) % 4)
    binary += b"\0" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(json_bytes) + 8 + len(binary)
    with path.open("wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
        f.write(json_bytes)
        f.write(struct.pack("<I4s", len(binary), b"BIN\0"))
        f.write(binary)


def rotation_y(angle: float) -> np.ndarray:
    c, s = math.cos(angle), math.sin(angle)
    return np.array([[c, 0.0, s], [0.0, 1.0, 0.0], [-s, 0.0, c]], dtype=np.float64)


def export_obj(path: Path):
    vertices, normals, indices = sphere_mesh()
    mtl_path = path.with_suffix(".mtl")
    lines = [f"mtllib {mtl_path.name}", "s 1"]
    vertex_offset = 1
    for part in PARTS:
        rot = rotation_y(part.rotation_y)
        scale = np.asarray(part.scale)
        pos = np.asarray(part.position)
        transformed = (vertices * scale) @ rot.T + pos
        transformed_normals = (normals / scale) @ rot.T
        transformed_normals /= np.linalg.norm(transformed_normals, axis=1, keepdims=True)
        lines.extend((f"v {x:.6f} {y:.6f} {z:.6f}" for x, y, z in transformed))
        lines.extend((f"vn {x:.6f} {y:.6f} {z:.6f}" for x, y, z in transformed_normals))
        lines.append(f"o {part.name}")
        lines.append(f"usemtl {part.material}")
        for a, b, c in indices.reshape(-1, 3):
            aa, bb, cc = int(a) + vertex_offset, int(b) + vertex_offset, int(c) + vertex_offset
            lines.append(f"f {aa}//{aa} {bb}//{bb} {cc}//{cc}")
        vertex_offset += len(vertices)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    mtl_lines = []
    for name, (r, g, b, _a) in MATERIALS.items():
        mtl_lines.extend([f"newmtl {name}", f"Kd {r:.4f} {g:.4f} {b:.4f}", "Ka 0.0800 0.0800 0.0800", "Ks 0.0500 0.0500 0.0500", "Ns 18.0", "illum 2", ""])
    mtl_path.write_text("\n".join(mtl_lines), encoding="utf-8")


def render_preview(path: Path, size: int = 800):
    # Orthographic ray casting gives a faithful preview without a 3D application.
    eye = np.array([7.2, -12.5, 6.0])
    target = np.array([0.0, 0.0, 2.55])
    forward = target - eye
    forward /= np.linalg.norm(forward)
    right = np.cross(forward, np.array([0.0, 0.0, 1.0]))
    right /= np.linalg.norm(right)
    up = np.cross(right, forward)

    xs = np.linspace(-3.15, 3.15, size)
    zs = np.linspace(3.15, -3.15, size)
    xx, zz = np.meshgrid(xs, zs)
    origins = eye + xx[..., None] * right + zz[..., None] * up
    direction = np.broadcast_to(forward, origins.shape)
    best_t = np.full((size, size), np.inf)
    rgb = np.zeros((size, size, 3), dtype=np.float64)
    rgb[:] = (0.055, 0.064, 0.074)
    light = np.array([-0.55, -0.65, 1.0])
    light /= np.linalg.norm(light)

    for part in PARTS:
        rot = rotation_y(part.rotation_y)
        inv_rot = rot.T
        scale = np.asarray(part.scale)
        center = np.asarray(part.position)
        local_o = ((origins - center) @ inv_rot.T) / scale
        local_d = (direction @ inv_rot.T) / scale
        a = np.sum(local_d * local_d, axis=-1)
        b = 2.0 * np.sum(local_o * local_d, axis=-1)
        c = np.sum(local_o * local_o, axis=-1) - 1.0
        disc = b * b - 4.0 * a * c
        valid = disc >= 0.0
        root = np.sqrt(np.maximum(disc, 0.0))
        t = (-b - root) / (2.0 * a)
        hit = valid & (t > 0.0) & (t < best_t)
        if not np.any(hit):
            continue
        local_p = local_o + t[..., None] * local_d
        local_n = local_p / scale
        world_n = local_n @ rot.T
        world_n /= np.maximum(np.linalg.norm(world_n, axis=-1, keepdims=True), 1e-8)
        diffuse = np.clip(np.sum(world_n * light, axis=-1), 0.0, 1.0)
        shade = 0.43 + 0.57 * diffuse
        base = np.asarray(MATERIALS[part.material][:3])
        color = np.clip(base * shade[..., None], 0.0, 1.0)
        rgb[hit] = color[hit]
        best_t[hit] = t[hit]

    # Subtle vignette and antialiasing through a high quality downsample.
    radius = np.sqrt((xx / 4.4) ** 2 + (zz / 4.4) ** 2)
    rgb *= np.clip(1.05 - 0.22 * radius, 0.72, 1.0)[..., None]
    image = Image.fromarray((np.clip(rgb, 0.0, 1.0) * 255).astype(np.uint8), "RGB")
    image.save(path, quality=95)


def write_readme(path: Path):
    path.write_text(
        """GATO APAPACHABLE 3D\n"
        "=====================\n\n"
        "Archivo recomendado: gato_apapachable.glb\n"
        "Respaldo universal: gato_apapachable.obj + gato_apapachable.mtl\n\n"
        "En Blender: Archivo > Importar > glTF 2.0 (.glb/.gltf) y selecciona el GLB.\n"
        "El modelo está compuesto por piezas 3D suaves con materiales incluidos.\n"
        "Todas las piezas tienen nombre para que sea fácil cambiar color, posición o tamaño.\n"
        "La unidad usada es aproximadamente un metro; el gato mide cerca de 5.9 unidades de alto.\n"
        """,
        encoding="utf-8",
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    export_glb(OUT / "gato_apapachable.glb")
    export_obj(OUT / "gato_apapachable.obj")
    render_preview(OUT / "vista_previa.png")
    write_readme(OUT / "LEEME.txt")
    print(f"Created assets in {OUT}")


if __name__ == "__main__":
    main()
