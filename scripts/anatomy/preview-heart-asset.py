#!/usr/bin/env python3
"""Open the prepared heart GLB in Blender and play its animation timeline."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy


REQUIRED_NODES = (
    "HeartRoot",
    "RightAtrium",
    "RightVentricle",
    "LeftAtrium",
    "LeftVentricle",
    "TricuspidValve",
    "PulmonaryValve",
    "MitralValve",
    "AorticValve",
    "VenaCavae",
    "PulmonaryArtery",
    "PulmonaryVeins",
    "Aorta",
    "BodyToRightAtriumPath",
    "RightAtriumToRightVentriclePath",
    "RightVentricleToLungsPath",
    "LungsToLeftAtriumPath",
    "LeftAtriumToLeftVentriclePath",
    "LeftVentricleToBodyPath",
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", required=True, type=Path)
    return parser.parse_args(argv)


def frame_and_play() -> None:
    for window in bpy.context.window_manager.windows:
        screen = window.screen
        for area in screen.areas:
            if area.type != "VIEW_3D":
                continue
            region = next(
                (region for region in area.regions if region.type == "WINDOW"),
                None,
            )
            if not region:
                continue
            space = area.spaces.active
            space.shading.type = "MATERIAL"
            space.clip_end = 100000.0
            with bpy.context.temp_override(
                window=window,
                screen=screen,
                area=area,
                region=region,
            ):
                bpy.ops.view3d.view_all(center=True)
                if not bpy.context.screen.is_animation_playing:
                    bpy.ops.screen.animation_play()
            return


def main() -> None:
    args = parse_args()
    asset = args.asset.resolve()
    if not asset.is_file():
        raise FileNotFoundError(f"Prepared heart GLB does not exist: {asset}")

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    bpy.ops.import_scene.gltf(filepath=str(asset))

    missing = [name for name in REQUIRED_NODES if bpy.data.objects.get(name) is None]
    if missing:
        raise RuntimeError(f"Preview asset is missing nodes: {', '.join(missing)}")

    animations = sorted(action.name for action in bpy.data.actions)
    if "CardiacCycle" not in animations:
        raise RuntimeError("Preview asset does not contain CardiacCycle")

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = 25
    scene.frame_set(1)

    bpy.ops.object.select_all(action="SELECT")
    heart_root = bpy.data.objects.get("HeartRoot")
    if heart_root:
        bpy.context.view_layer.objects.active = heart_root

    print(f"Previewing: {asset}")
    print(f"Animations: {', '.join(animations)}")
    print("Timeline: frames 1-25 at 30 fps (75 bpm). Press Space to pause/play and Left Arrow to restart.")
    bpy.app.timers.register(frame_and_play, first_interval=0.5)


if __name__ == "__main__":
    main()
