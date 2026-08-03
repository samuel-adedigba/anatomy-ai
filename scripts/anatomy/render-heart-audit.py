#!/usr/bin/env python3
"""Render reference frames from the prepared heart GLB for visual audit."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy
from mathutils import Vector


AUDIT_FRAMES = {
    1: "diastolic-filling",
    6: "atrial-systole",
    8: "isovolumetric-contraction",
    14: "ventricular-systole",
    17: "isovolumetric-relaxation",
    20: "early-filling",
}
CHAMBERS = ("RightAtrium", "RightVentricle", "LeftAtrium", "LeftVentricle")


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    return parser.parse_args(argv)


def chamber_bounds() -> tuple[Vector, Vector]:
    points = []
    for name in CHAMBERS:
        root = bpy.data.objects.get(name)
        if not root:
            continue
        for obj in [root, *root.children_recursive]:
            if obj.type == "MESH":
                points.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    if not points:
        raise RuntimeError("Could not frame the semantic heart chambers")
    minimum = Vector(tuple(min(point[axis] for point in points) for axis in range(3)))
    maximum = Vector(tuple(max(point[axis] for point in points) for axis in range(3)))
    return minimum, maximum


def make_camera(minimum: Vector, maximum: Vector) -> None:
    center = (minimum + maximum) / 2
    size = maximum - minimum
    camera_data = bpy.data.cameras.new("HeartAuditCamera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = max(size.x, size.z) * 1.75
    camera = bpy.data.objects.new("HeartAuditCamera", camera_data)
    bpy.context.scene.collection.objects.link(camera)
    camera.location = center + Vector((0, -max(size.length * 2.5, 0.5), 0))
    camera.rotation_euler = (center - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera


def main() -> None:
    args = parse_args()
    asset = args.asset.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if not asset.is_file():
        raise FileNotFoundError(f"Prepared heart GLB does not exist: {asset}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=str(asset))
    make_camera(*chamber_bounds())

    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.world = bpy.data.worlds.new("HeartAuditWorld")
    scene.world.color = (0.025, 0.035, 0.055)

    for frame, label in AUDIT_FRAMES.items():
        scene.frame_set(frame)
        scene.render.filepath = str(output_dir / f"heart-{frame:02d}-{label}.png")
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {scene.render.filepath}")


if __name__ == "__main__":
    main()
