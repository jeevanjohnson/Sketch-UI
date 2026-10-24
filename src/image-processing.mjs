export function validCrop(crop) {
  return crop && ['x', 'y', 'w', 'h'].every(k => typeof crop[k] === 'number' && Number.isFinite(crop[k])) && crop.x >= 0 && crop.y >= 0 && crop.w >= .001 && crop.h >= .001 && crop.x + crop.w <= 1.000001 && crop.y + crop.h <= 1.000001;
}

// Flood only matching background connected to the border (or sampled seed).
// The optional all-colors mode also removes enclosed matching areas.
export function removePlainBackground(pixels, width, height, color, tolerance = 30, connected = true, seed = null) {
  const output = new Uint8ClampedArray(pixels);
  const count = width * height;
  const visited = new Uint8Array(count);
  const queue = new Int32Array(count);
  const softness = 16;
  let read = 0, write = 0;
  const distance = index => {
    const i = index * 4;
    return Math.max(Math.abs(output[i] - color[0]), Math.abs(output[i + 1] - color[1]), Math.abs(output[i + 2] - color[2]));
  };
  const add = index => {
    if (visited[index]) return;
    visited[index] = 1;
    if (distance(index) <= tolerance + softness || output[index * 4 + 3] === 0) queue[write++] = index;
  };
  if (connected) {
    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
    if (seed) add(Math.min(height - 1, Math.max(0, seed.y)) * width + Math.min(width - 1, Math.max(0, seed.x)));
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
    for (let i = 0; i < count; i++) output[i * 4 + 3] = Math.round(output[i * 4 + 3] * Math.max(0, Math.min(1, (distance(i) - tolerance) / softness)));
  }
  return output;
}
