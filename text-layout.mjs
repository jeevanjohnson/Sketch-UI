// Shared by the live SVG editor and PNG export. Measurement is supplied by the host.
export function wrapText(value, width, measure) {
  const lines = [];
  for (const paragraph of String(value || '').split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= width) { line = candidate; continue; }
      if (line) { lines.push(line); line = ''; }
      for (const character of word) {
        if (line && measure(line + character) > width) { lines.push(line); line = ''; }
        line += character;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function textLayout(object, measure) {
  const shaped = ['rect', 'ellipse'].includes(object.type);
  const padding = object.padding ?? (object.type === 'note' ? 14 : shaped ? 12 : 0);
  const inset = Math.min(padding, Math.max(0, (Math.min(object.w, object.h) - 1) / 2));
  const width = Math.max(1, object.w - inset * 2);
  const lines = wrapText(object.text, width, measure);
  const lineHeight = object.fontSize * 1.3;
  const height = lines.length * lineHeight;
  const available = Math.max(1, object.h - inset * 2);
  const vertical = object.verticalAlign || (shaped ? 'middle' : 'top');
  const top = object.y + inset + (vertical === 'middle' ? Math.max(0, (available - height) / 2) : vertical === 'bottom' ? Math.max(0, available - height) : 0);
  const align = object.align || (shaped ? 'center' : 'left');
  const x = object.x + inset + (align === 'center' ? width / 2 : align === 'right' ? width : 0);
  return { lines, padding: inset, width, height, lineHeight, top, x, align, overflow: height > available + .1 };
}
