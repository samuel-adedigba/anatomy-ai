#!/usr/bin/env python3
"""Prepare the reviewed heart source as a semantic, non-Draco GLB.

Run with Blender, not the system Python:

    blender --background --python scripts/anatomy/prepare-heart-asset.py -- \
      --source engines/anatomy-assets/work/heart-source/heart.educational.v1.blend \
      --output engines/anatomy-assets/work/heart-source/heart.educational.v1.glb

This script creates an educational starting point for the cardiac-cycle clip. The
animation and flow paths still require medical and visual review before the output
can be copied into engines/anatomy-assets/models/.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
from mathutils import Matrix, Vector


FPS = 30
FRAME_START = 1
FRAME_ATRIAL_PEAK = 6
FRAME_AV_CLOSED = 7
FRAME_VENTRICULAR_CONTRACTION = 8
FRAME_SEMILUNAR_OPEN_START = 9
FRAME_EJECTION_START = 10
FRAME_VENTRICULAR_PEAK = 14
FRAME_EJECTION_END = 16
FRAME_SEMILUNAR_CLOSED = 17
FRAME_AV_OPEN_START = 19
FRAME_AV_OPEN = 20
FRAME_END = 25
SEMANTIC_TARGETS = {
    "HeartRoot": ("heart.g", "heart"),
    "RightAtrium": ("right atrium", "right atrial wall", "right atrial cavity"),
    "RightVentricle": ("right ventricle", "right ventricular wall", "right ventricular cavity"),
    "LeftAtrium": ("left atrium", "left atrial wall", "left atrial cavity"),
    "LeftVentricle": ("left ventricle", "left ventricular wall", "left ventricular cavity"),
    "TricuspidValve": ("tricuspid valve", "right atrioventricular valve", "right av valve"),
    "PulmonaryValve": ("pulmonary valve",),
    "MitralValve": ("mitral valve", "left atrioventricular valve", "left av valve"),
    "AorticValve": ("aortic valve",),
    "VenaCavae": (
        "superior vena cava",
        "inferior vena cava",
        "inferior vena cava (thoracic part)",
        "inferior vena cava (abdominal part)",
        "vena cava",
        "vena cavae",
    ),
    "PulmonaryArtery": ("pulmonary artery", "pulmonary trunk"),
    "PulmonaryVeins": (
        "left inferior pulmonary vein",
        "left superior pulmonary vein",
        "right inferior pulmonary vein",
        "right superior pulmonary vein",
    ),
    "Aorta": ("ascending aorta", "aortic arch"),
}
FLOW_PATHS = (
    "BodyToRightAtriumPath",
    "RightAtriumToRightVentriclePath",
    "RightVentricleToLungsPath",
    "LungsToLeftAtriumPath",
    "LeftAtriumToLeftVentriclePath",
    "LeftVentricleToBodyPath",
)
FLOW_PATH_IDS = {
    "BodyToRightAtriumPath": "body_to_right_atrium",
    "RightAtriumToRightVentriclePath": "right_atrium_to_right_ventricle",
    "RightVentricleToLungsPath": "right_ventricle_to_lungs",
    "LungsToLeftAtriumPath": "lungs_to_left_atrium",
    "LeftAtriumToLeftVentriclePath": "left_atrium_to_left_ventricle",
    "LeftVentricleToBodyPath": "left_ventricle_to_body",
}
ANIMATION_TARGETS = ("RightAtrium", "LeftAtrium", "RightVentricle", "LeftVentricle")
AV_VALVES = ("TricuspidValve", "MitralValve")
SEMILUNAR_VALVES = ("PulmonaryValve", "AorticValve")
OXYGEN_POOR_PATHS = {
    "BodyToRightAtriumPath",
    "RightAtriumToRightVentriclePath",
    "RightVentricleToLungsPath",
}


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def normalized(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", " ", value.lower())
    return re.sub(r"\s+", " ", value).strip()


def name_variants(value: str) -> set[str]:
    """Return source-name variants without Blender's .g/.j/.001 suffixes."""
    value = normalized(value)
    variants = {value}
    without_number = re.sub(r" \d+$", "", value)
    variants.add(without_number)
    variants.add(re.sub(r" [gj]$", "", without_number))
    return variants


def object_names(obj: bpy.types.Object) -> set[str]:
    names = {obj.name}
    if obj.data:
        names.add(obj.data.name)
    return {variant for name in names for variant in name_variants(name)}


def all_scene_objects() -> list[bpy.types.Object]:
    return list(bpy.context.scene.objects)


def find_matches(aliases: tuple[str, ...]) -> list[bpy.types.Object]:
    aliases_normalized = {normalized(alias) for alias in aliases}
    matches = []
    for obj in all_scene_objects():
        names = object_names(obj)
        if names & aliases_normalized:
            matches.append(obj)
    return matches


def top_level_matches(matches: list[bpy.types.Object]) -> list[bpy.types.Object]:
    matched = set(matches)

    def has_matched_ancestor(obj: bpy.types.Object) -> bool:
        parent = obj.parent
        while parent:
            if parent in matched:
                return True
            parent = parent.parent
        return False

    return [obj for obj in matches if not has_matched_ancestor(obj)]


def make_empty(name: str, parent: bpy.types.Object | None = None) -> bpy.types.Object:
    existing = bpy.data.objects.get(name)
    if existing:
        bpy.data.objects.remove(existing, do_unlink=True)
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    return obj


def parent_preserving_world(
    obj: bpy.types.Object, parent: bpy.types.Object | None
) -> None:
    world_matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world_matrix


def detach_non_target_children(objects: list[bpy.types.Object]) -> None:
    selected = set(objects)
    for obj in objects:
        original_parent = obj.parent
        for child in list(obj.children):
            if child not in selected:
                parent_preserving_world(child, original_parent)


def repair_source_hierarchy() -> None:
    posterior_mitral = bpy.data.objects.get(
        "Posterior leaflet of left atrioventricular valve"
    )
    mitral_parent = bpy.data.objects.get("Left atrioventricular valve.g")
    if posterior_mitral and mitral_parent and posterior_mitral.parent != mitral_parent:
        parent_preserving_world(posterior_mitral, mitral_parent)
        posterior_mitral["source_hierarchy_repair"] = (
            "Moved from right to left atrioventricular valve by anatomical name"
        )


def visible_meshes(root: bpy.types.Object) -> list[bpy.types.Object]:
    objects = [root, *root.children_recursive]
    return [
        obj
        for obj in objects
        if obj.type == "MESH" and obj.data and len(obj.data.polygons) > 0
    ]


def geometry_points(objects: list[bpy.types.Object]) -> list[Vector]:
    points: list[Vector] = []
    seen: set[bpy.types.Object] = set()
    for obj in objects:
        candidates = visible_meshes(obj) if obj.type == "EMPTY" else [obj]
        for candidate in candidates:
            if candidate in seen or candidate.type != "MESH" or not candidate.data.polygons:
                continue
            seen.add(candidate)
            points.extend(
                candidate.matrix_world @ Vector(corner)
                for corner in candidate.bound_box
            )
    return points


def center_of(objects: list[bpy.types.Object]) -> Vector:
    points = geometry_points(objects)
    if points:
        return sum(points, Vector()) / len(points)
    return sum((obj.matrix_world.translation for obj in objects), Vector()) / max(
        len(objects), 1
    )


def make_semantic_groups() -> dict[str, bpy.types.Object]:
    groups: dict[str, bpy.types.Object] = {}
    matched: dict[str, list[str]] = {}
    for semantic, aliases in SEMANTIC_TARGETS.items():
        matches = top_level_matches(
            [
                obj
                for obj in find_matches(aliases)
                if obj.type in {"EMPTY", "MESH", "CURVE", "SURFACE", "META"}
            ]
        )
        if semantic == "HeartRoot" and not matches:
            matches = [obj for obj in all_scene_objects() if obj.type == "MESH"]
        if not matches:
            matched[semantic] = []
            continue
        if semantic in {"VenaCavae", "PulmonaryVeins", "Aorta"}:
            detach_non_target_children(matches)
        group = make_empty(semantic)
        groups[semantic] = group
        matched[semantic] = [obj.name for obj in matches]
        for obj in matches:
            parent_preserving_world(obj, group)
        group["source_objects"] = matched[semantic]
        group["semantic_id"] = f"heart.{semantic[0].lower()}{semantic[1:]}"

    if "HeartRoot" not in groups:
        raise RuntimeError("Could not find a heart object or any mesh objects in the source blend")

    missing = [name for name in SEMANTIC_TARGETS if name not in groups]
    if missing:
        available = sorted(obj.name for obj in all_scene_objects())
        raise RuntimeError(
            "Could not resolve required heart structures: "
            + ", ".join(missing)
            + ". Available source objects include: "
            + ", ".join(available[:40])
        )

    heart_root = groups["HeartRoot"]
    for semantic, group in groups.items():
        if semantic != "HeartRoot" and group.parent is None:
            parent_preserving_world(group, heart_root)
    heart_root["asset_id"] = "heart.educational.v1"
    heart_root["semantic_targets"] = sorted(name for name in groups if name != "HeartRoot")
    return groups


def complete_av_valves(groups: dict[str, bpy.types.Object]) -> None:
    generated = (
        (
            "MitralValve",
            "Posterior leaflet of left atrioventricular valve",
            "Anterior leaflet of left atrioventricular valve",
            math.pi,
            1.05,
        ),
        (
            "TricuspidValve",
            "Inferior leaflet of right atrioventricular valve",
            "Anterior leaflet of right atrioventricular valve",
            (2.0 * math.pi) / 3.0,
            0.95,
        ),
    )
    for semantic, source_name, generated_name, angle, scale in generated:
        if bpy.data.objects.get(generated_name):
            continue
        source = bpy.data.objects.get(source_name)
        group = groups[semantic]
        if not source or source.type != "MESH" or not source.data.polygons:
            raise RuntimeError(
                f"Cannot derive missing {semantic} leaflet from {source_name}"
            )
        points = geometry_points([group])
        extents = [
            max(point[axis] for point in points)
            - min(point[axis] for point in points)
            for axis in range(3)
        ]
        normal_axis_index = extents.index(min(extents))
        normal_axis = Vector((0.0, 0.0, 0.0))
        normal_axis[normal_axis_index] = 1.0
        center = center_of([group])
        duplicate = source.copy()
        duplicate.data = source.data.copy()
        duplicate.name = generated_name
        bpy.context.scene.collection.objects.link(duplicate)
        for property_name in list(duplicate.keys()):
            del duplicate[property_name]
        transform = (
            Matrix.Translation(center)
            @ Matrix.Rotation(angle, 4, normal_axis)
            @ Matrix.Scale(scale, 4)
            @ Matrix.Translation(-center)
        )
        duplicate.matrix_world = transform @ source.matrix_world
        parent_preserving_world(duplicate, group)
        duplicate["generated_simplification"] = True
        duplicate["derived_from"] = source_name
        duplicate["review_status"] = "pending_medical_review"
    groups["MitralValve"]["leaflet_count"] = 2
    groups["TricuspidValve"]["leaflet_count"] = 3


def bounds_for(groups: dict[str, bpy.types.Object]) -> tuple[Vector, Vector]:
    points = geometry_points([groups[name] for name in ANIMATION_TARGETS])
    if not points:
        return Vector((-1, -1, -1)), Vector((1, 1, 1))
    minimum = Vector((min(point.x for point in points), min(point.y for point in points), min(point.z for point in points)))
    maximum = Vector((max(point.x for point in points), max(point.y for point in points), max(point.z for point in points)))
    return minimum, maximum


def midpoint_for(obj: bpy.types.Object, minimum: Vector, maximum: Vector) -> Vector:
    points = geometry_points([obj])
    return sum(points, Vector()) / len(points) if points else (minimum + maximum) / 2


def make_flow_paths(groups: dict[str, bpy.types.Object]) -> None:
    minimum, maximum = bounds_for(groups)
    span = max((maximum - minimum).length, 1e-3)
    centers = {
        name: midpoint_for(group, minimum, maximum)
        for name, group in groups.items()
    }
    path_specs = {
        "BodyToRightAtriumPath": (
            [
                centers["VenaCavae"] + Vector((0, 0, span * 0.45)),
                centers["VenaCavae"],
                centers["RightAtrium"],
            ],
            ("body", "VenaCavae", "RightAtrium"),
        ),
        "RightAtriumToRightVentriclePath": (
            [
                centers["RightAtrium"],
                centers["TricuspidValve"],
                centers["RightVentricle"],
            ],
            ("RightAtrium", "TricuspidValve", "RightVentricle"),
        ),
        "RightVentricleToLungsPath": (
            [
                centers["RightVentricle"],
                centers["PulmonaryValve"],
                centers["PulmonaryArtery"],
                centers["PulmonaryArtery"] + Vector((span * 0.45, 0, span * 0.1)),
            ],
            ("RightVentricle", "PulmonaryValve", "PulmonaryArtery", "lungs"),
        ),
        "LungsToLeftAtriumPath": (
            [
                centers["PulmonaryVeins"] + Vector((span * 0.45, 0, span * 0.1)),
                centers["PulmonaryVeins"],
                centers["LeftAtrium"],
            ],
            ("lungs", "PulmonaryVeins", "LeftAtrium"),
        ),
        "LeftAtriumToLeftVentriclePath": (
            [
                centers["LeftAtrium"],
                centers["MitralValve"],
                centers["LeftVentricle"],
            ],
            ("LeftAtrium", "MitralValve", "LeftVentricle"),
        ),
        "LeftVentricleToBodyPath": (
            [
                centers["LeftVentricle"],
                centers["AorticValve"],
                centers["Aorta"],
                centers["Aorta"] + Vector((0, 0, span * 0.5)),
            ],
            ("LeftVentricle", "AorticValve", "Aorta", "body"),
        ),
    }
    materials = {
        "oxygen_poor_blood": make_flow_material(
            "FlowOxygenPoor", (0.31, 0.50, 0.78, 1.0)
        ),
        "oxygen_rich_blood": make_flow_material(
            "FlowOxygenRich", (0.84, 0.35, 0.35, 1.0)
        ),
    }
    for order, (name, (points, waypoint_names)) in enumerate(path_specs.items(), start=1):
        state = (
            "oxygen_poor_blood"
            if name in OXYGEN_POOR_PATHS
            else "oxygen_rich_blood"
        )
        curve_data = bpy.data.curves.new(name, type="CURVE")
        curve_data.dimensions = "3D"
        curve_data.bevel_depth = span * 0.007
        curve_data.bevel_resolution = 2
        spline = curve_data.splines.new("BEZIER")
        spline.bezier_points.add(len(points) - 1)
        for point, coordinate in zip(spline.bezier_points, points):
            point.co = coordinate
            point.handle_left_type = "AUTO"
            point.handle_right_type = "AUTO"
        path_obj = bpy.data.objects.new(name, curve_data)
        bpy.context.scene.collection.objects.link(path_obj)
        curve_data.materials.append(materials[state])
        path_obj["semantic_id"] = FLOW_PATH_IDS[name]
        path_obj["oxygenation_state"] = state
        path_obj["direction"] = "forward"
        path_obj["flow_order"] = order
        path_obj["waypoints"] = list(waypoint_names)
        path_obj["centerline_y_up"] = [
            coordinate
            for point in points
            for coordinate in (point.x, point.z, -point.y)
        ]
        path_obj["centerline_stride"] = 3
        path_obj["centerline_coordinate_system"] = "y_up"
        make_direction_markers(path_obj, points, materials[state], span)
        parent_preserving_world(path_obj, groups["HeartRoot"])


def make_flow_material(
    name: str, color: tuple[float, float, float, float]
) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.diffuse_color = color
    material.metallic = 0.0
    material.roughness = 0.45
    return material


def make_direction_markers(
    path_obj: bpy.types.Object,
    points: list[Vector],
    material: bpy.types.Material,
    span: float,
) -> None:
    for index, (start, end) in enumerate(zip(points, points[1:]), start=1):
        direction = end - start
        if direction.length < 1e-6:
            continue
        location = start.lerp(end, 0.58)
        bpy.ops.mesh.primitive_cone_add(
            vertices=16,
            radius1=span * 0.016,
            radius2=0.0,
            depth=span * 0.04,
            location=location,
        )
        marker = bpy.context.object
        marker.name = f"{path_obj.name}Direction{index}"
        marker.rotation_mode = "QUATERNION"
        marker.rotation_quaternion = direction.normalized().to_track_quat("Z", "Y")
        marker.data.materials.append(material)
        marker["direction_marker"] = True
        parent_preserving_world(marker, path_obj)


def shape_key(
    obj: bpy.types.Object,
    name: str,
    center: Vector,
    radial_scale: float,
    longitudinal_scale: float,
    twist_degrees: float = 0.0,
    normal_offset: float = 0.0,
) -> bpy.types.ShapeKey:
    if not obj.data.shape_keys:
        obj.shape_key_add(name="Basis")
    target = obj.shape_key_add(name=name)
    inverse = obj.matrix_world.inverted()
    matrix = obj.matrix_world
    normal_matrix = matrix.to_3x3()
    points = [matrix @ vertex.co for vertex in obj.data.vertices]
    z_extent = max((abs(point.z - center.z) for point in points), default=1.0)
    z_extent = max(z_extent, 1e-6)
    for index, (basis_vertex, target_vertex) in enumerate(
        zip(obj.data.vertices, target.data)
    ):
        world = matrix @ basis_vertex.co
        relative = world - center
        height_fraction = max(-1.0, min(1.0, relative.z / z_extent))
        angle = math.radians(twist_degrees * height_fraction)
        cosine = math.cos(angle)
        sine = math.sin(angle)
        x = (relative.x * cosine - relative.y * sine) * radial_scale
        y = (relative.x * sine + relative.y * cosine) * radial_scale
        z = relative.z * longitudinal_scale
        deformed = center + Vector((x, y, z))
        if normal_offset:
            normal = normal_matrix @ basis_vertex.normal
            if normal.length:
                deformed += normal.normalized() * normal_offset
        target_vertex.co = inverse @ deformed
    return target


def average_world_normal(obj: bpy.types.Object) -> Vector:
    normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
    reference = None
    accumulated = Vector()
    for polygon in obj.data.polygons:
        normal = normal_matrix @ polygon.normal
        if normal.length < 1e-6:
            continue
        normal.normalize()
        if reference is None:
            reference = normal.copy()
        elif normal.dot(reference) < 0:
            normal.negate()
        accumulated += normal * max(polygon.area, 1e-6)
    if accumulated.length < 1e-6:
        return Vector((0.0, 0.0, 1.0))
    return accumulated.normalized()


def valve_open_shape_key(
    obj: bpy.types.Object,
    name: str,
    valve_center: Vector,
    downstream: Vector,
    opening_angle_degrees: float,
) -> bpy.types.ShapeKey:
    if not obj.data.shape_keys:
        obj.shape_key_add(name="Basis")
    target = obj.shape_key_add(name=name)
    matrix = obj.matrix_world
    inverse = matrix.inverted()
    points = [matrix @ vertex.co for vertex in obj.data.vertices]
    if not points:
        return target
    leaflet_center = sum(points, Vector()) / len(points)
    plane_normal = average_world_normal(obj)
    if plane_normal.dot(downstream) < 0:
        plane_normal.negate()
    radial = leaflet_center - valve_center
    radial -= plane_normal * radial.dot(plane_normal)
    if radial.length < 1e-6:
        radial = plane_normal.cross(Vector((1.0, 0.0, 0.0)))
        if radial.length < 1e-6:
            radial = plane_normal.cross(Vector((0.0, 1.0, 0.0)))
    radial.normalize()
    radial_distances = [(point - valve_center).dot(radial) for point in points]
    hinge = valve_center + radial * max(radial_distances)
    hinge += plane_normal * (leaflet_center - valve_center).dot(plane_normal)
    hinge_axis = plane_normal.cross(radial).normalized()
    rotation = Matrix.Rotation(math.radians(opening_angle_degrees), 4, hinge_axis)
    for basis_vertex, target_vertex in zip(obj.data.vertices, target.data):
        world = matrix @ basis_vertex.co
        target_vertex.co = inverse @ (hinge + rotation @ (world - hinge))
    return target


def animate_shape_key(
    key: bpy.types.ShapeKey,
    keyframes: tuple[tuple[int, float], ...],
    action_name: str,
) -> None:
    for frame, value in keyframes:
        key.value = value
        key.keyframe_insert(data_path="value", frame=frame, group="Cardiac cycle")
    animation_data = key.id_data.animation_data
    if animation_data and animation_data.action:
        animation_data.action.name = action_name


def make_cardiac_cycle(groups: dict[str, bpy.types.Object]) -> None:
    scene = bpy.context.scene
    scene.render.fps = FPS
    scene.frame_start = FRAME_START
    scene.frame_end = FRAME_END
    scene.frame_set(FRAME_START)

    heart_span = max((bounds_for(groups)[1] - bounds_for(groups)[0]).length, 1e-3)
    chamber_settings = {
        "RightAtrium": ("atrial_systole", 0.95, 0.97, 0.0, 0.0),
        "LeftAtrium": ("atrial_systole", 0.95, 0.97, 0.0, 0.0),
        "RightVentricle": (
            "ventricular_systole",
            0.94,
            0.90,
            4.0,
            heart_span * 0.0015,
        ),
        "LeftVentricle": (
            "ventricular_systole",
            0.92,
            0.86,
            8.0,
            heart_span * 0.002,
        ),
    }
    for semantic, settings in chamber_settings.items():
        name, radial, longitudinal, twist, normal_offset = settings
        center = center_of([groups[semantic]])
        keyframes = (
            (
                (
                    (FRAME_START, 0.0),
                    (FRAME_ATRIAL_PEAK, 1.0),
                    (FRAME_AV_CLOSED, 0.0),
                    (FRAME_END, 0.0),
                )
                if semantic.endswith("Atrium")
                else (
                    (FRAME_START, 0.0),
                    (FRAME_VENTRICULAR_CONTRACTION, 0.0),
                    (FRAME_VENTRICULAR_PEAK, 1.0),
                    (FRAME_EJECTION_END, 0.75),
                    (FRAME_AV_OPEN, 0.0),
                    (FRAME_END, 0.0),
                )
            )
        )
        for mesh in visible_meshes(groups[semantic]):
            key = shape_key(
                mesh,
                name,
                center,
                radial,
                longitudinal,
                twist,
                normal_offset,
            )
            animate_shape_key(
                key,
                keyframes,
                f"CardiacCycle_{semantic}_{normalized(mesh.name).replace(' ', '_')}",
            )
        groups[semantic]["motion_model"] = {
            "radial_scale": radial,
            "longitudinal_scale": longitudinal,
            "twist_degrees": twist,
            "morph": name,
        }

    av_keyframes = (
        (FRAME_START, 1.0),
        (FRAME_ATRIAL_PEAK, 1.0),
        (FRAME_AV_CLOSED, 0.0),
        (FRAME_EJECTION_END, 0.0),
        (FRAME_SEMILUNAR_CLOSED, 0.0),
        (FRAME_AV_OPEN_START, 0.0),
        (FRAME_AV_OPEN, 1.0),
        (FRAME_END, 1.0),
    )
    semilunar_keyframes = (
        (FRAME_START, 0.0),
        (FRAME_VENTRICULAR_CONTRACTION, 0.0),
        (FRAME_SEMILUNAR_OPEN_START, 0.0),
        (FRAME_EJECTION_START, 1.0),
        (FRAME_EJECTION_END, 1.0),
        (FRAME_SEMILUNAR_CLOSED, 0.0),
        (FRAME_AV_OPEN, 0.0),
        (FRAME_END, 0.0),
    )
    valve_flow = {
        "TricuspidValve": ("RightAtrium", "RightVentricle", 58.0),
        "MitralValve": ("LeftAtrium", "LeftVentricle", 58.0),
        "PulmonaryValve": ("RightVentricle", "PulmonaryArtery", 48.0),
        "AorticValve": ("LeftVentricle", "Aorta", 48.0),
    }
    for semantic in (*AV_VALVES, *SEMILUNAR_VALVES):
        center = center_of([groups[semantic]])
        upstream_name, downstream_name, opening_angle = valve_flow[semantic]
        downstream = center_of([groups[downstream_name]]) - center_of(
            [groups[upstream_name]]
        )
        if downstream.length < 1e-6:
            raise RuntimeError(f"Cannot determine downstream direction for {semantic}")
        downstream.normalize()
        keyframes = av_keyframes if semantic in AV_VALVES else semilunar_keyframes
        for mesh in visible_meshes(groups[semantic]):
            key = valve_open_shape_key(
                mesh, "valve_open", center, downstream, opening_angle
            )
            animate_shape_key(
                key,
                keyframes,
                f"CardiacCycle_{semantic}_{normalized(mesh.name).replace(' ', '_')}",
            )
        groups[semantic]["valve_phase"] = (
            "open_during_ventricular_filling"
            if semantic in AV_VALVES
            else "open_during_ventricular_ejection"
        )

    heart_root = groups["HeartRoot"]
    heart_root["animation_review_status"] = "pending_medical_review"
    heart_root["cardiac_cycle_bpm"] = 75
    heart_root["cardiac_cycle_duration_seconds"] = 0.8
    heart_root["cardiac_cycle_phases"] = [
        "atrial_systole",
        "isovolumetric_contraction",
        "ventricular_ejection",
        "isovolumetric_relaxation",
        "ventricular_filling",
    ]
    scene.frame_set(FRAME_START)


def load_source(source: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Source blend does not exist: {source}")
    # The checked-in working source is zstd-wrapped to keep the repository copy
    # smaller, even though it retains the .blend filename. Blender expects the
    # decompressed BLENDER header, so unpack it outside the repository first.
    with source.open("rb") as source_file:
        is_zstd = source_file.read(4) == b"\x28\xb5\x2f\xfd"
    if not is_zstd:
        check_blender_source_version(source)
        bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
        return

    zstd = shutil.which("zstd")
    if not zstd:
        raise RuntimeError(
            f"Source is Zstandard-compressed: {source}. Install zstd or decompress it before running Blender."
        )
    temporary_path = None
    try:
        with tempfile.NamedTemporaryFile(prefix="anatomy-heart-", suffix=".blend", delete=False) as temporary:
            temporary_path = Path(temporary.name)
        with temporary_path.open("wb") as decompressed:
            subprocess.run(
                [zstd, "--quiet", "--decompress", "--stdout", str(source.resolve())],
                check=True,
                stdout=decompressed,
            )
        check_blender_source_version(temporary_path)
        bpy.ops.wm.open_mainfile(filepath=str(temporary_path))
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)


def check_blender_source_version(source: Path) -> None:
    header = source.read_bytes()[:24]
    # v0501 is Blender's file header for Blender 5.0.1. Blender does not expose
    # a supported way to downgrade a .blend file, so fail before open_mainfile.
    if b"v0501" in header and bpy.app.version < (5, 0, 0):
        installed = ".".join(str(part) for part in bpy.app.version)
        raise RuntimeError(
            "The source blend was saved by Blender 5.0.1, but this process is "
            f"Blender {installed}. Run the script with Blender 5.0.1 or newer."
        )


def export_glb(output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists() and not ARGS.overwrite:
        raise FileExistsError(f"Output exists; pass --overwrite to replace it: {output}")
    heart_root = bpy.data.objects["HeartRoot"]
    bpy.ops.object.select_all(action="DESELECT")
    export_objects = [heart_root, *heart_root.children_recursive]
    for obj in export_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = heart_root

    properties = bpy.ops.export_scene.gltf.get_rna_type().properties
    options = {
        "filepath": str(output.resolve()),
        "export_format": "GLB",
        "export_animations": True,
        "export_animation_mode": "ACTIVE_ACTIONS",
        "export_nla_strips_merged_animation_name": "CardiacCycle",
        "export_anim_scene_split_object": False,
        "export_morph": True,
        "export_cameras": False,
        "export_lights": False,
        "export_extras": True,
        "export_draco_mesh_compression_enable": False,
        "use_selection": True,
    }
    options = {key: value for key, value in options.items() if key in properties}
    bpy.ops.export_scene.gltf(**options)


def verify_glb(output: Path) -> dict[str, object]:
    data = output.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise RuntimeError("Export did not produce a valid GLB header")
    version, declared_length = struct.unpack_from("<II", data, 4)
    if version != 2 or declared_length != len(data):
        raise RuntimeError(f"Invalid GLB header: version={version}, declared_length={declared_length}, bytes={len(data)}")
    offset = 12
    document = None
    binary_chunk = None
    while offset < len(data):
        chunk_length, chunk_type = struct.unpack_from("<II", data, offset)
        chunk = data[offset + 8 : offset + 8 + chunk_length]
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.rstrip(b" ").decode("utf-8"))
        elif chunk_type == 0x004E4942:
            binary_chunk = chunk
        offset += 8 + chunk_length
    if document is None or binary_chunk is None:
        raise RuntimeError("Exported GLB must contain JSON and binary chunks")

    def accessor_values(accessor_index: int) -> list[float]:
        accessor = document["accessors"][accessor_index]
        if accessor.get("componentType") != 5126 or accessor.get("type") != "SCALAR":
            raise RuntimeError("Cardiac animation accessors must be scalar floats")
        view = document["bufferViews"][accessor["bufferView"]]
        start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        stride = view.get("byteStride", 4)
        return [
            struct.unpack_from("<f", binary_chunk, start + index * stride)[0]
            for index in range(accessor["count"])
        ]

    def descendant_indices(root_index: int) -> set[int]:
        descendants: set[int] = set()
        pending = [root_index]
        nodes = document.get("nodes", [])
        while pending:
            node_index = pending.pop()
            if node_index in descendants:
                continue
            descendants.add(node_index)
            pending.extend(nodes[node_index].get("children", []))
        return descendants

    def sample_linear(times: list[float], values: list[float], time: float) -> float:
        if time <= times[0]:
            return values[0]
        if time >= times[-1]:
            return values[-1]
        for index in range(1, len(times)):
            if time <= times[index]:
                width = times[index] - times[index - 1]
                fraction = 0.0 if width == 0 else (time - times[index - 1]) / width
                return values[index - 1] + fraction * (
                    values[index] - values[index - 1]
                )
        return values[-1]
    names = {item.get("name") for item in document.get("nodes", []) if item.get("name")}
    missing = [name for name in (*SEMANTIC_TARGETS, *FLOW_PATHS) if name not in names]
    animations = document.get("animations", [])
    animation_names = {
        item.get("name") for item in animations if item.get("name")
    }
    if missing:
        raise RuntimeError(f"Exported GLB is missing semantic nodes: {', '.join(missing)}")
    cardiac_animations = [
        animation for animation in animations if animation.get("name") == "CardiacCycle"
    ]
    if len(cardiac_animations) != 1 or len(animations) != 1:
        raise RuntimeError(
            "Exported GLB must contain one synchronized CardiacCycle animation; "
            f"found {sorted(animation_names)}"
        )
    cardiac_cycle = cardiac_animations[0]
    accessors = document.get("accessors", [])
    time_accessors = [
        accessors[sampler["input"]]
        for sampler in cardiac_cycle.get("samplers", [])
        if sampler.get("input") is not None
    ]
    time_min = min(
        (accessor.get("min", [0.0])[0] for accessor in time_accessors),
        default=0.0,
    )
    time_max = max(
        (accessor.get("max", [0.0])[0] for accessor in time_accessors),
        default=0.0,
    )
    duration = time_max - time_min
    if not 0.79 <= duration <= 0.81:
        raise RuntimeError(
            f"CardiacCycle must be 0.8 seconds at 75 bpm; exported duration is {duration:.3f}s"
        )
    animated_paths = {
        channel.get("target", {}).get("path")
        for channel in cardiac_cycle.get("channels", [])
    }
    if "weights" not in animated_paths:
        raise RuntimeError("CardiacCycle does not animate chamber and valve morph weights")
    morph_names = {
        name
        for mesh in document.get("meshes", [])
        for name in mesh.get("extras", {}).get("targetNames", [])
    }
    missing_morphs = {
        "atrial_systole",
        "ventricular_systole",
        "valve_open",
    } - morph_names
    if missing_morphs:
        raise RuntimeError(
            f"Exported GLB is missing cardiac morph targets: {', '.join(sorted(missing_morphs))}"
        )
    node_by_name = {
        node.get("name"): node for node in document.get("nodes", []) if node.get("name")
    }
    node_index_by_name = {
        node.get("name"): index
        for index, node in enumerate(document.get("nodes", []))
        if node.get("name")
    }
    expected_oxygenation = {
        path_name: (
            "oxygen_poor_blood"
            if path_name in OXYGEN_POOR_PATHS
            else "oxygen_rich_blood"
        )
        for path_name in FLOW_PATHS
    }
    for order, path_name in enumerate(FLOW_PATHS, start=1):
        extras = node_by_name[path_name].get("extras", {})
        centerline = extras.get("centerline_y_up", [])
        if (
            extras.get("semantic_id") != FLOW_PATH_IDS[path_name]
            or extras.get("direction") != "forward"
            or extras.get("oxygenation_state") != expected_oxygenation[path_name]
            or extras.get("flow_order") != order
            or extras.get("centerline_stride") != 3
            or extras.get("centerline_coordinate_system") != "y_up"
            or len(centerline) < 9
            or len(centerline) % 3 != 0
        ):
            raise RuntimeError(f"Flow path metadata is incomplete: {path_name}")

    valve_series: dict[str, list[tuple[list[float], list[float]]]] = {}
    for semantic in (*AV_VALVES, *SEMILUNAR_VALVES):
        descendants = descendant_indices(node_index_by_name[semantic])
        series = []
        for channel in cardiac_cycle.get("channels", []):
            target = channel.get("target", {})
            if target.get("path") != "weights" or target.get("node") not in descendants:
                continue
            sampler = cardiac_cycle["samplers"][channel["sampler"]]
            times = accessor_values(sampler["input"])
            values = accessor_values(sampler["output"])
            if len(times) != len(values):
                raise RuntimeError(f"{semantic} must expose one valve_open weight per keyframe")
            series.append((times, values))
        if not series:
            raise RuntimeError(f"CardiacCycle does not animate {semantic} leaflets")
        valve_series[semantic] = series

    sample_times = sorted(
        {
            time
            for series in valve_series.values()
            for times, _ in series
            for time in times
        }
    )
    sample_times += [
        (start + end) / 2.0 for start, end in zip(sample_times, sample_times[1:])
    ]
    for time in sample_times:
        av_open = max(
            sample_linear(times, values, time)
            for semantic in AV_VALVES
            for times, values in valve_series[semantic]
        )
        semilunar_open = max(
            sample_linear(times, values, time)
            for semantic in SEMILUNAR_VALVES
            for times, values in valve_series[semantic]
        )
        if av_open > 1e-4 and semilunar_open > 1e-4:
            raise RuntimeError(
                "CardiacCycle overlaps AV and semilunar valve opening, eliminating an isovolumetric phase"
            )

    generated_leaflets = (
        "Anterior leaflet of left atrioventricular valve",
        "Anterior leaflet of right atrioventricular valve",
    )
    for leaflet_name in generated_leaflets:
        extras = node_by_name.get(leaflet_name, {}).get("extras", {})
        if (
            extras.get("generated_simplification") is not True
            or extras.get("review_status") != "pending_medical_review"
            or not extras.get("derived_from")
            or "source_hierarchy_repair" in extras
        ):
            raise RuntimeError(f"Generated leaflet provenance is incomplete: {leaflet_name}")
    if "KHR_draco_mesh_compression" in document.get("extensionsRequired", []):
        raise RuntimeError("Exported GLB still requires Draco, which the current viewer cannot decode")
    return {
        "bytes": len(data),
        "nodes": len(names),
        "animations": sorted(animation_names),
        "duration_seconds": round(duration, 3),
        "morphs": sorted(morph_names),
        "flow_paths": len(FLOW_PATHS),
    }


def main() -> None:
    global ARGS
    ARGS = parse_args()
    load_source(ARGS.source)
    repair_source_hierarchy()
    groups = make_semantic_groups()
    complete_av_valves(groups)
    make_flow_paths(groups)
    make_cardiac_cycle(groups)
    export_glb(ARGS.output)
    report = verify_glb(ARGS.output)
    print(json.dumps({"output": str(ARGS.output), **report}, indent=2))
    print("Review required: medical heartbeat review, flow-direction review, licence approval, and Android visual check.", file=sys.stderr)


if __name__ == "__main__":
    main()
