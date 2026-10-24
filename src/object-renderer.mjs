// Converts document objects to SVG for both the stage and PNG export.
// The editor supplies text measurement and the current inline-edit target;
// this module owns artwork only, never selection, project state, or file I/O.
export const svgNS = 'http://www.w3.org/2000/svg';

export function element(tag, attributes = {}, text) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) {
    node.setAttribute(key, String(value));
  }
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createObjectRenderer(layoutFor, editingId) {
  let clipSerial = 0;

  function appendText(group, object, exporting) {
    if ((!exporting && editingId() === object.id) || !object.text) return;
    const layout = layoutFor(object);
    const clipId = `text-clip-${++clipSerial}`;
    const clip = element('clipPath', { id: clipId });
    let clipShape;
    if (object.type === 'ellipse') {
      clipShape = element('ellipse', {
        cx: object.x + object.w / 2,
        cy: object.y + object.h / 2,
        rx: Math.max(0.5, object.w / 2 - layout.padding),
        ry: Math.max(0.5, object.h / 2 - layout.padding)
      });
    } else {
      clipShape = element('rect', {
        x: object.x + layout.padding,
        y: object.y + layout.padding,
        width: layout.width,
        height: Math.max(1, object.h - layout.padding * 2)
      });
    }
    clip.append(clipShape);
    const definitions = element('defs');
    definitions.append(clip);
    group.append(definitions);

    const anchors = { left: 'start', center: 'middle', right: 'end' };
    const text = element('text', {
      x: layout.x,
      y: layout.top + object.fontSize,
      fill: object.type === 'text' ? object.fill : object.textColor || '#252722',
      'font-family': 'Segoe UI, Arial, sans-serif',
      'font-size': object.fontSize,
      'text-anchor': anchors[layout.align],
      'clip-path': `url(#${clipId})`,
      'pointer-events': 'none'
    });
    for (const [index, line] of layout.lines.entries()) {
      text.append(
        element(
          'tspan',
          {
            x: layout.x,
            dy: index ? layout.lineHeight : 0
          },
          line || ' '
        )
      );
    }
    group.append(text);
  }

  function appendHitArea(group, object) {
    group.append(
      element('rect', {
        x: object.x,
        y: object.y,
        width: Math.abs(object.w),
        height: Math.abs(object.h),
        fill: 'transparent',
        stroke: 'none'
      })
    );
  }

  function renderImage(group, object) {
    const crop = object.crop || { x: 0, y: 0, w: 1, h: 1 };
    const sourceBounds = [
      crop.x * object.pixelWidth,
      crop.y * object.pixelHeight,
      crop.w * object.pixelWidth,
      crop.h * object.pixelHeight
    ];
    const viewport = element('svg', {
      x: object.x,
      y: object.y,
      width: object.w,
      height: object.h,
      viewBox: sourceBounds.join(' '),
      preserveAspectRatio: 'none',
      overflow: 'hidden'
    });
    viewport.append(
      element('image', {
        x: 0,
        y: 0,
        width: object.pixelWidth,
        height: object.pixelHeight,
        href: object.src,
        preserveAspectRatio: 'none'
      })
    );
    group.append(viewport);
    appendHitArea(group, object);
  }

  function shapeGeometry(object, sketch = false) {
    const { x, y, w, h } = object;
    if (object.type === 'rect') {
      return {
        x: x + (sketch ? 1.4 : 0),
        y: y - (sketch ? 0.9 : 0),
        width: sketch ? Math.max(1, w - 2) : w,
        height: sketch ? Math.max(1, h + 1.8) : h,
        rx: (object.radius || 0) + (sketch ? 2 : 0)
      };
    }
    return {
      cx: x + w / 2 + (sketch ? 1.1 : 0),
      cy: y + h / 2 - (sketch ? 1.3 : 0),
      rx: w / 2 + (sketch ? 0.8 : 0),
      ry: h / 2 + (sketch ? 0.5 : 0)
    };
  }

  function renderShape(group, object, style, exporting) {
    group.append(element(object.type, { ...shapeGeometry(object), ...style }));
    if (object.sketch) {
      // Fixed offsets preserve the same sketch contour across redraws/exports.
      group.append(
        element(object.type, {
          ...shapeGeometry(object, true),
          ...style,
          fill: 'none',
          'stroke-width': Math.max(0.7, object.strokeWidth * 0.55),
          transform: `rotate(.35 ${object.x + object.w / 2} ${object.y + object.h / 2})`
        })
      );
    }
    appendText(group, object, exporting);
  }

  function appendStroke(group, object, style, path) {
    group.append(element('path', { d: path, ...style, fill: 'none' }));
    group.append(
      element('path', {
        d: path,
        fill: 'none',
        stroke: 'transparent',
        'stroke-width': Math.max(12, object.strokeWidth)
      })
    );
  }

  function renderLine(group, object, style) {
    const endX = object.x + object.w;
    const endY = object.y + object.h;
    appendStroke(group, object, style, `M ${object.x} ${object.y} L ${endX} ${endY}`);
    if (object.type !== 'arrow') return;
    const angle = Math.atan2(object.h, object.w);
    const length = 13;
    const leftX = endX - length * Math.cos(angle - 0.5);
    const leftY = endY - length * Math.sin(angle - 0.5);
    const rightX = endX - length * Math.cos(angle + 0.5);
    const rightY = endY - length * Math.sin(angle + 0.5);
    group.append(
      element('path', {
        d: `M ${leftX} ${leftY} L ${endX} ${endY} L ${rightX} ${rightY}`,
        ...style,
        fill: 'none'
      })
    );
  }

  return function renderObject(object, exporting = false) {
    const group = element('g', { 'data-id': object.id });
    const style = {
      fill: object.fill,
      stroke: object.stroke,
      'stroke-width': object.strokeWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    };
    switch (object.type) {
      case 'text':
      case 'note':
        if (object.type === 'note') {
          group.append(
            element('rect', {
              x: object.x,
              y: object.y,
              width: Math.abs(object.w),
              height: Math.abs(object.h),
              rx: 3,
              ...style
            })
          );
        }
        appendText(group, object, exporting);
        appendHitArea(group, object);
        break;
      case 'image':
        renderImage(group, object);
        break;
      case 'rect':
      case 'ellipse':
        renderShape(group, object, style, exporting);
        break;
      case 'line':
      case 'arrow':
        renderLine(group, object, style);
        break;
      case 'pen': {
        const path = (object.points || [])
          .map(([x, y], index) => {
            const command = index ? 'L' : 'M';
            return `${command} ${object.x + x * object.w} ${object.y + y * object.h}`;
          })
          .join(' ');
        appendStroke(group, object, style, path);
        break;
      }
    }
    return group;
  };
}
