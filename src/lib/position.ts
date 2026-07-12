import type { Position } from '@/data/types';

const MARGIN = 0.08;

/**
 * 柱面坐标：x = 归一化角度 [0, 1)，y = 柱面高度 [MARGIN, 1-MARGIN]。
 */
export function randomPosition(): Position {
  return {
    x: Math.random(),
    y: MARGIN + Math.random() * (1 - MARGIN * 2),
  };
}

function clamp01(v: number): number {
  return Math.max(MARGIN, Math.min(1 - MARGIN, v));
}

function wrapAngle01(v: number): number {
  let x = v % 1;
  if (x < 0) x += 1;
  return x;
}

function seeded(index: number, salt: number): number {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** 分组锚点在柱面上的角度与高度 */
export function clusterAnchorPosition(index: number, total: number): Position {
  if (total <= 1) {
    return { x: 0.5, y: 0.5 };
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  const angleRad = index * golden + seeded(index, 3) * 0.8;
  return {
    x: wrapAngle01(angleRad / (Math.PI * 2)),
    y: clamp01(0.34 + seeded(index, 7) * 0.42),
  };
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 同组成员在锚点周围的角向/高度散布基数（归一化） */
const CLUSTER_ANGLE_SPREAD = 0.018;
const CLUSTER_HEIGHT_SPREAD = 0.038;

/** 在分组锚点附近的柱面位置（金角螺旋，同组聚堆） */
export function clusteredIdeaPosition(anchor: Position, ideaId: string, rank: number): Position {
  if (rank === 0) {
    const hash = hashString(ideaId);
    const micro = 0.002;
    return {
      x: wrapAngle01(anchor.x + ((hash % 89) / 89 - 0.5) * micro),
      y: clamp01(anchor.y + (((hash >> 4) % 89) / 89 - 0.5) * micro),
    };
  }

  const hash = hashString(ideaId);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const t = rank + ((hash % 97) / 97) * 0.35;
  const ring = Math.max(1, Math.ceil(Math.sqrt(t * 0.85)));
  const ringScale = 0.72 + (ring - 1) * 0.28;

  const spiral = t * golden + ((hash % 360) / 360) * 0.22;
  const angleOffset = Math.cos(spiral) * CLUSTER_ANGLE_SPREAD * ringScale;
  const heightOffset = Math.sin(spiral) * CLUSTER_HEIGHT_SPREAD * ringScale;

  return {
    x: wrapAngle01(anchor.x + angleOffset),
    y: clamp01(anchor.y + heightOffset),
  };
}
