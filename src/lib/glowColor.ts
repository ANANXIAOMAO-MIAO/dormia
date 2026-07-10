interface Rgb {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseRgba(color: string): { rgb: Rgb; a: number } | null {
  const rgba = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgba) {
    return {
      rgb: {
        r: Number(rgba[1]),
        g: Number(rgba[2]),
        b: Number(rgba[3]),
      },
      a: rgba[4] !== undefined ? Number(rgba[4]) : 1,
    };
  }

  const hsla = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (!hsla) return null;

  const h = Number(hsla[1]) / 360;
  const s = Number(hsla[2]) / 100;
  const l = Number(hsla[3]) / 100;
  const a = hsla[4] !== undefined ? Number(hsla[4]) : 1;

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { rgb: { r: gray, g: gray, b: gray }, a };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    rgb: {
      r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
    },
    a,
  };
}

function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function toRgba(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
}

/**
 * 浅色背景上的全白光晕色阶。
 */
export function whiteGlowStops(): string[] {
  return [
    'rgba(255, 255, 255, 0.72)',
    'rgba(255, 255, 255, 0.4)',
    'rgba(255, 255, 255, 0.16)',
    'rgba(255, 255, 255, 0)',
  ];
}

/**
 * 从中心色向外渐弱，边缘过渡到透明同色，避免发黑。
 */
export function glowStops(color: string): string[] {
  return buildGlowStops(color, { rich: false });
}

/** 更浓郁的光团色阶，用于深处页浅色背景。 */
export function glowStopsRich(color: string): string[] {
  return buildGlowStops(color, { rich: true });
}

function themeTint(rgb: Rgb, amount: number): Rgb {
  const theme = { r: 179, g: 157, b: 233 };
  return {
    r: Math.round(mix(rgb.r, theme.r, amount)),
    g: Math.round(mix(rgb.g, theme.g, amount)),
    b: Math.round(mix(rgb.b, theme.b, amount)),
  };
}

function buildGlowStops(color: string, opts: { rich: boolean }): string[] {
  const parsed = parseRgba(color);
  if (!parsed) {
    if (opts.rich) {
      return [
        'rgba(186, 162, 238, 0.74)',
        'rgba(200, 182, 244, 0.5)',
        'rgba(218, 208, 250, 0.24)',
        'rgba(236, 232, 252, 0)',
      ];
    }
    return [
      'rgba(178, 164, 236, 0.58)',
      'rgba(198, 188, 242, 0.34)',
      'rgba(220, 214, 248, 0.14)',
      'rgba(236, 232, 252, 0)',
    ];
  }

  const baseRgb = opts.rich ? themeTint(parsed.rgb, 0.12) : parsed.rgb;
  const { a } = parsed;
  const lighten = (amount: number): Rgb => ({
    r: Math.round(mix(baseRgb.r, 255, amount)),
    g: Math.round(mix(baseRgb.g, 255, amount)),
    b: Math.round(mix(baseRgb.b, 255, amount)),
  });

  const center = lighten(opts.rich ? 0.06 : 0.04);
  const mid = lighten(opts.rich ? 0.22 : 0.28);
  const outer = lighten(opts.rich ? 0.48 : 0.52);
  const edge = lighten(opts.rich ? 0.68 : 0.72);

  const baseAlpha = opts.rich ? clamp(a * 1.32, 0.46, 0.76) : clamp(a, 0.32, 0.62);

  return [
    toRgba(center, baseAlpha * 0.95),
    toRgba(mid, baseAlpha * 0.62),
    toRgba(outer, baseAlpha * 0.28),
    toRgba(edge, 0),
  ];
}
