// Shared by the live SVG editor and PNG export. Measurement is supplied by the host.
export function wrapText(value, width, measure) {
  const lines = [];
  for (const paragraph of String(value || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) {
        line = candidate;
        continue;
      }
      if (line) {
        lines.push(line);
        line = '';
      }
      for (const character of word) {
        if (line && measure(line + character) > width) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function textLayout(object, measure) {
  const shaped = ['rect', 'ellipse'].includes(object.type);
  let defaultPadding = 0;
  if (object.type === 'note') defaultPadding = 14;
  else if (shaped) defaultPadding = 12;
  const padding = object.padding ?? defaultPadding;
  const inset = Math.min(padding, Math.max(0, (Math.min(object.w, object.h) - 1) / 2));
  const width = Math.max(1, object.w - inset * 2);
  const lines = wrapText(object.text, width, measure);
  const lineHeight = object.fontSize * 1.3;
  const height = lines.length * lineHeight;
  const available = Math.max(1, object.h - inset * 2);
  const vertical = object.verticalAlign || (shaped ? 'middle' : 'top');
  const unusedHeight = Math.max(0, available - height);
  let verticalOffset = 0;
  if (vertical === 'middle') verticalOffset = unusedHeight / 2;
  else if (vertical === 'bottom') verticalOffset = unusedHeight;
  const top = object.y + inset + verticalOffset;
  const align = object.align || (shaped ? 'center' : 'left');
  let horizontalOffset = 0;
  if (align === 'center') horizontalOffset = width / 2;
  else if (align === 'right') horizontalOffset = width;
  const x = object.x + inset + horizontalOffset;
  return {
    lines,
    padding: inset,
    width,
    height,
    lineHeight,
    top,
    x,
    align,
    overflow: height > available + 0.1
  };
}
