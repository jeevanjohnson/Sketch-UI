// Pure pixel/crop rules used by project validation and the renderer's image worker.
export function validCrop(crop) {
  if (!crop) return false;
  const finiteBounds = ['x', 'y', 'w', 'h'].every((key) => {
    return typeof crop[key] === 'number' && Number.isFinite(crop[key]);
  });
  return (
    finiteBounds &&
    crop.x >= 0 &&
    crop.y >= 0 &&
    crop.w >= 0.001 &&
    crop.h >= 0.001 &&
    crop.x + crop.w <= 1.000001 &&
    crop.y + crop.h <= 1.000001
  );
}

// Flood only matching background connected to the border (or sampled seed).
// The optional all-colors mode also removes enclosed matching areas.
export function removePlainBackground(
  pixels,
  width,
  height,
  color,
  tolerance = 30,
  connected = true,
  seed = null
) {
  const output = new Uint8ClampedArray(pixels);
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  const softness = 16;
  let read = 0;
  let write = 0;
  const distance = (index) => {
    const i = index * 4;
    return Math.max(
      Math.abs(output[i] - color[0]),
      Math.abs(output[i + 1] - color[1]),
      Math.abs(output[i + 2] - color[2])
    );
  };
  const add = (index) => {
    if (visited[index]) return;
    visited[index] = 1;
    if (distance(index) <= tolerance + softness || output[index * 4 + 3] === 0)
      queue[write++] = index;
  };
  if (connected) {
    for (let x = 0; x < width; x++) {
      add(x);
      add((height - 1) * width + x);
    }
    for (let y = 0; y < height; y++) {
      add(y * width);
      add(y * width + width - 1);
    }
    if (seed)
      add(
        Math.min(height - 1, Math.max(0, seed.y)) * width + Math.min(width - 1, Math.max(0, seed.x))
      );
    while (read < write) {
      const index = queue[read++];
      const x = index % width;
      const factor = Math.max(0, Math.min(1, (distance(index) - tolerance) / softness));
      output[index * 4 + 3] = Math.round(output[index * 4 + 3] * factor);
      if (x > 0) add(index - 1);
      if (x < width - 1) add(index + 1);
      if (index >= width) add(index - width);
      if (index < count - width) add(index + width);
    }
  } else {
    for (let index = 0; index < count; index++) {
      const factor = Math.max(0, Math.min(1, (distance(index) - tolerance) / softness));
      output[index * 4 + 3] = Math.round(output[index * 4 + 3] * factor);
    }
  }
  return output;
}
