import type { Idea, Position } from '@/data/types';

export const BASE_RADIUS = 22;
export const TEXT_EXTRA = 6;
/** 点击热区相对核心半径的倍率（较原先 ~1.22 扩大） */
export const HIT_RADIUS_SCALE = 1.2;
/** 布局推挤时使用的参考画布尺寸（px） */
export const LAYOUT_REF_SIZE = 500;

const MARGIN = 0.08;

function clamp01(v: number): number {
  return Math.max(MARGIN, Math.min(1 - MARGIN, v));
}

export function getNodeRadius(textLength: number): number {
  return BASE_RADIUS + Math.min(Math.floor(textLength / 10) * TEXT_EXTRA, 18);
}

export function getHitRadius(textLength: number): number {
  return getNodeRadius(textLength) * HIT_RADIUS_SCALE;
}

/** 两节点中心在归一化坐标下的最小间距，保证热区不重叠 */
export function minCenterDistanceNorm(textLenA: number, textLenB: number): number {
  return (getHitRadius(textLenA) + getHitRadius(textLenB)) / LAYOUT_REF_SIZE;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * 迭代推挤，使任意两点的热区在参考画布尺寸下不重叠。
 */
export function separateIdeaPositions(ideas: Idea[], maxIterations = 96): Idea[] {
  if (ideas.length <= 1) return ideas;

  const positions: Position[] = ideas.map((idea) => ({ ...idea.position }));

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;

    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const minDist = minCenterDistanceNorm(ideas[i].text.length, ideas[j].text.length);
        let dx = positions[j].x - positions[i].x;
        let dy = positions[j].y - positions[i].y;
        let dist = Math.hypot(dx, dy);

        if (dist >= minDist) continue;

        if (dist < 1e-6) {
          const angle = ((hashString(ideas[i].id) % 360) / 360) * Math.PI * 2;
          dx = Math.cos(angle) * minDist;
          dy = Math.sin(angle) * minDist;
          dist = minDist;
        }

        const push = (minDist - dist) / 2 + 0.0015;
        const nx = dx / dist;
        const ny = dy / dist;

        positions[i] = {
          x: clamp01(positions[i].x - nx * push),
          y: clamp01(positions[i].y - ny * push),
        };
        positions[j] = {
          x: clamp01(positions[j].x + nx * push),
          y: clamp01(positions[j].y + ny * push),
        };
        moved = true;
      }
    }

    if (!moved) break;
  }

  return ideas.map((idea, index) => ({
    ...idea,
    position: positions[index],
  }));
}
