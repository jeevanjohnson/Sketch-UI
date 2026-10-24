import { removePlainBackground } from './image-processing.mjs';
self.onmessage = ({ data }) => {
  const result = removePlainBackground(new Uint8ClampedArray(data.pixels), data.width, data.height, data.color, data.tolerance, data.connected, data.seed);
  self.postMessage(result.buffer, [result.buffer]);
};
