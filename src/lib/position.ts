import type { Position } from '@/data/types';

const MARGIN = 0.08;
/** 介于旧版(0.34/0.23)与加宽版(0.38/0.28)之间 */
const CLUSTER_RADIUS_X = 0.36;
const CLUSTER_RADIUS_Y = 0.255;

export function randomPosition(): Position {
  return {
    x: MARGIN + Math.random() * (1 - MARGIN * 2),
    y: MARGIN + Math.random() * (1 - MARGIN * 2),
  };
}

function clamp01(v: number): number {
  return Math.max(MARGIN, Math.min(1 - MARGIN, v));
}

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function clusterAnchorPosition(index: number, total: number): Position {
  if (total <= 1) {
    return { x: 0.5, y: 0.5 };
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  const angle = index * golden + seeded(index, 3) * 0.8;
  const depth = 0.58 + seeded(index, 7) * 0.42;
  const radialX = CLUSTER_RADIUS_X * (0.58 + depth * 0.58);
  const radialY = CLUSTER_RADIUS_Y * (0.44 + depth * 0.72);
  const yNoise = (seeded(index, 11) - 0.5) * 0.1;
  return {
    x: clamp01(0.5 + Math.sin(angle) * radialX),
    y: clamp01(0.5 + Math.cos(angle * 0.88) * radialY + yNoise),
  };
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * 在分组锚点附近生成成员位置。
 * spread 取旧版(0.02~0.10)与加宽版(0.06~0.20)的中间值，保留聚堆感。
 */
export function clusteredIdeaPosition(anchor: Position, ideaId: string, rank: number): Position {
  const hash = hashString(ideaId);
  const angle = (((hash % 360) / 360) * Math.PI * 2) + rank * 0.4;
  const depth = ((hash >> 7) % 100) / 100;
  const spread = 0.02 + depth * 0.02 + Math.min(rank, 7) * 0.002;
  const xScale = 1.1 - depth * 0.29;
  const yScale = 0.75 + depth * 0.25;
  return {
    x: clamp01(anchor.x + Math.cos(angle) * spread * xScale),
    y: clamp01(anchor.y + Math.sin(angle) * spread * yScale),
  };
}
