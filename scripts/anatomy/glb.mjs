const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK_TYPE = 0x4e4f534a;

export function readGlbJson(buffer, fileName) {
  if (buffer.length < 20 || buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error(`${fileName} is not a valid binary glTF file`);
  }

  const version = buffer.readUInt32LE(4);
  const declaredLength = buffer.readUInt32LE(8);
  if (version !== 2) {
    throw new Error(`${fileName} uses unsupported glTF version ${version}`);
  }
  if (declaredLength !== buffer.length) {
    throw new Error(
      `${fileName} declares ${declaredLength} bytes but contains ${buffer.length}`
    );
  }

  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunkStart = offset + 8;
    const chunkEnd = chunkStart + chunkLength;
    if (chunkEnd > buffer.length) {
      throw new Error(`${fileName} contains a truncated GLB chunk`);
    }
    if (chunkType === JSON_CHUNK_TYPE) {
      return JSON.parse(
        buffer
          .subarray(chunkStart, chunkEnd)
          .toString("utf8")
          .replace(/\u0000+$/u, "")
      );
    }
    offset = chunkEnd;
  }

  throw new Error(`${fileName} does not contain a JSON chunk`);
}

export function uniqueNames(items = []) {
  return [...new Set(items.map((item) => item?.name).filter(Boolean))].sort();
}

export function scalarFloatAccessorValues(buffer, document, accessorIndex) {
  let offset = 12;
  let binaryChunk;
  while (offset + 8 <= buffer.length) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    if (chunkType === 0x004e4942) {
      binaryChunk = buffer.subarray(offset + 8, offset + 8 + chunkLength);
      break;
    }
    offset += 8 + chunkLength;
  }
  const accessor = document.accessors?.[accessorIndex];
  const view = document.bufferViews?.[accessor?.bufferView];
  if (!binaryChunk || accessor?.componentType !== 5126 || accessor?.type !== "SCALAR" || !view) {
    throw new Error(`Accessor ${accessorIndex} is not a binary scalar-float accessor`);
  }
  const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const stride = view.byteStride ?? 4;
  return Array.from({ length: accessor.count }, (_, index) =>
    binaryChunk.readFloatLE(start + index * stride)
  );
}

export function morphTargetNames(document) {
  return [
    ...new Set(
      (document.meshes ?? []).flatMap((mesh) =>
        [
          ...(mesh.extras?.targetNames ?? []),
          ...(mesh.primitives ?? []).flatMap(
            (primitive) => primitive.extras?.targetNames ?? []
          ),
        ]
      )
    ),
  ].sort();
}

export function animationDuration(document, animation) {
  const ranges = (animation?.samplers ?? []).map((sampler) => {
    const accessor = document.accessors?.[sampler.input];
    return [accessor?.min?.[0], accessor?.max?.[0]];
  });
  const starts = ranges.map(([start]) => start).filter(Number.isFinite);
  const ends = ranges.map(([, end]) => end).filter(Number.isFinite);
  return starts.length && ends.length ? Math.max(...ends) - Math.min(...starts) : 0;
}

function multiplyMatrices(left, right) {
  const result = new Array(16).fill(0);
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 4; row += 1) {
      for (let index = 0; index < 4; index += 1) {
        result[column * 4 + row] +=
          left[index * 4 + row] * right[column * 4 + index];
      }
    }
  }
  return result;
}

function nodeMatrix(node) {
  if (node.matrix) return node.matrix;
  const [x, y, z, w] = node.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = node.scale ?? [1, 1, 1];
  const [tx, ty, tz] = node.translation ?? [0, 0, 0];
  const xx = x * x;
  const yy = y * y;
  const zz = z * z;
  const xy = x * y;
  const xz = x * z;
  const yz = y * z;
  const wx = w * x;
  const wy = w * y;
  const wz = w * z;
  return [
    (1 - 2 * (yy + zz)) * sx,
    (2 * (xy + wz)) * sx,
    (2 * (xz - wy)) * sx,
    0,
    (2 * (xy - wz)) * sy,
    (1 - 2 * (xx + zz)) * sy,
    (2 * (yz + wx)) * sy,
    0,
    (2 * (xz + wy)) * sz,
    (2 * (yz - wx)) * sz,
    (1 - 2 * (xx + yy)) * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

function transformPoint(matrix, [x, y, z]) {
  return [
    matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12],
    matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13],
    matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14],
  ];
}

export function transformedSceneBounds(document) {
  const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  const nodes = document.nodes ?? [];
  const childNodes = new Set(nodes.flatMap((node) => node.children ?? []));
  const roots = document.scenes?.[document.scene ?? 0]?.nodes ??
    nodes.map((_, index) => index).filter((index) => !childNodes.has(index));
  const minimum = [Infinity, Infinity, Infinity];
  const maximum = [-Infinity, -Infinity, -Infinity];

  function visit(nodeIndex, parentMatrix) {
    const node = nodes[nodeIndex];
    const worldMatrix = multiplyMatrices(parentMatrix, nodeMatrix(node));
    if (Number.isInteger(node.mesh)) {
      for (const primitive of document.meshes?.[node.mesh]?.primitives ?? []) {
        const accessor = document.accessors?.[primitive.attributes?.POSITION];
        if (!accessor?.min || !accessor?.max) continue;
        for (const x of [accessor.min[0], accessor.max[0]]) {
          for (const y of [accessor.min[1], accessor.max[1]]) {
            for (const z of [accessor.min[2], accessor.max[2]]) {
              const point = transformPoint(worldMatrix, [x, y, z]);
              for (let axis = 0; axis < 3; axis += 1) {
                minimum[axis] = Math.min(minimum[axis], point[axis]);
                maximum[axis] = Math.max(maximum[axis], point[axis]);
              }
            }
          }
        }
      }
    }
    for (const child of node.children ?? []) visit(child, worldMatrix);
  }

  for (const root of roots) visit(root, identity);
  return minimum.every(Number.isFinite) && maximum.every(Number.isFinite)
    ? { min: minimum, max: maximum }
    : null;
}
