/**
 * 清透粉紫雾面色板：淡粉 / 淡紫 / 淡蓝 / 淡绿，与 App 背景同系。
 */
const GLOW_PALETTE = [
  'hsla(286, 40%, 83%, 0.52)', // 淡粉
  'hsla(268, 44%, 79%, 0.52)', // 淡紫
  'hsla(204, 38%, 81%, 0.5)', // 清透淡蓝
  'hsla(168, 34%, 80%, 0.48)', // 清透淡绿
  'hsla(278, 42%, 81%, 0.5)', // 雾粉紫
  'hsla(196, 36%, 82%, 0.48)', // 天青
  'hsla(292, 38%, 84%, 0.48)', // 浅樱
  'hsla(158, 32%, 79%, 0.46)', // 薄荷
] as const;

export const DEFAULT_GLOW_COLOR = GLOW_PALETTE[1];

export function getClusterColor(index: number): string {
  return GLOW_PALETTE[index % GLOW_PALETTE.length];
}

/** 按 cluster 顺序从清透色板取样，保证粉/紫/蓝/绿交错出现。 */
export function getNearbyClusterColor(order: number, total: number): string {
  if (total <= 1) return GLOW_PALETTE[0];
  const idx = Math.round((order / Math.max(1, total - 1)) * (GLOW_PALETTE.length - 1));
  return GLOW_PALETTE[Math.min(GLOW_PALETTE.length - 1, Math.max(0, idx))];
}
