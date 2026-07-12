import type { Idea, Position } from '@/data/types';

export const BASE_RADIUS = 22;
export const TEXT_EXTRA = 6;
/** 点击热区相对核心半径的倍率 */
export const HIT_RADIUS_SCALE = 1.2;
/** 布局推挤时使用的参考画布尺寸（px） */
export const LAYOUT_REF_SIZE = 500;

const MARGIN = 0.08;

function clamp01(v: number): number {
  return Math.max(MARGIN, Math.min(1 - MARGIN, v));
}

function wrapAngle01(v: number): number {
  let x = v % 1;
  if (x < 0) x += 1;
  return x;
}

function angleDist(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 1 - d);
}

export function getNodeRadius(textLength: number): number {
  return BASE_RADIUS + Math.min(Math.floor(textLength / 10) * TEXT_EXTRA, 18);
}

export function getHitRadius(textLength: number): number {
  return getNodeRadius(textLength) * HIT_RADIUS_SCALE;
}

/** 两节点在柱面角度方向的最小间距（归一化） */
export function minAngleDistanceNorm(textLenA: number, textLenB: number): number {
  return (getHitRadius(textLenA) + getHitRadius(textLenB)) / LAYOUT_REF_SIZE;
}

/** 两节点在高度方向的最小间距（归一化） */
export function minHeightDistanceNorm(textLenA: number, textLenB: number): number {
  return minAngleDistanceNorm(textLenA, textLenB) * 0.85;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i++) {
    h = (h * 31 + value.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** 同簇内允许更紧；异簇之间保持更大间距 */
const INTRA_CLUSTER_FACTOR = 0.42;
const INTER_CLUSTER_FACTOR = 1.35;

function clusterSeparationFactor(ideaA: Idea, ideaB: Idea): number {
  if (ideaA.clusterId && ideaA.clusterId === ideaB.clusterId) return INTRA_CLUSTER_FACTOR;
  return INTER_CLUSTER_FACTOR;
}

/**
 * 柱面推挤：角度方向环绕，高度方向线性；同簇内宽松、异簇间收紧。
 */
export function separateIdeaPositions(ideas: Idea[], maxIterations = 96): Idea[] {
  if (ideas.length <= 1) return ideas;

  const positions: Position[] = ideas.map((idea) => ({ ...idea.position }));

  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false;

    for (let i = 0; i < ideas.length; i++) {
      for (let j = i + 1; j < ideas.length; j++) {
        const sepFactor = clusterSeparationFactor(ideas[i], ideas[j]);
        const minAngle =
          minAngleDistanceNorm(ideas[i].text.length, ideas[j].text.length) * sepFactor;
        const minHeight =
          minHeightDistanceNorm(ideas[i].text.length, ideas[j].text.length) * sepFactor;

        const dAngle = angleDist(positions[i].x, positions[j].x);
        const dy = positions[j].y - positions[i].y;
        const needsAngle = dAngle < minAngle;
        const needsHeight = Math.abs(dy) < minHeight;
        if (!needsAngle && !needsHeight) continue;

        if (needsAngle) {
          let sign = positions[j].x >= positions[i].x ? 1 : -1;
          if (dAngle > 0.5) sign *= -1;
          if (dAngle < 1e-6) {
            const angle = (hashString(ideas[i].id) % 360) / 360;
            sign = angle < 0.5 ? 1 : -1;
          }
          const push = (minAngle - dAngle) / 2 + 0.001;
          positions[i] = { ...positions[i], x: wrapAngle01(positions[i].x - sign * push) };
          positions[j] = { ...positions[j], x: wrapAngle01(positions[j].x + sign * push) };
          moved = true;
        }

        if (needsHeight) {
          const push = (minHeight - Math.abs(dy)) / 2 + 0.001;
          const sign = dy >= 0 ? 1 : -1;
          positions[i] = { ...positions[i], y: clamp01(positions[i].y - sign * push) };
          positions[j] = { ...positions[j], y: clamp01(positions[j].y + sign * push) };
          moved = true;
        }
      }
    }

    if (!moved) break;
  }

  return ideas.map((idea, index) => ({
    ...idea,
    position: positions[index],
  }));
}
