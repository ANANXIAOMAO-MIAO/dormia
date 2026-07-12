import type { Idea } from '@/data/types';
import { getHitRadius } from '@/lib/nodeLayout';

/** 柱面水平展开比例 */
export const CYLINDER_X_SPREAD = 0.38;

export interface CylinderViewState {
  rotation: number;
}

export interface ProjectedPoint {
  x: number;
  y: number;
  depthScale: number;
  opacity: number;
}

export function projectCylinderPoint(
  normAngle: number,
  normHeight: number,
  width: number,
  height: number,
  view: CylinderViewState,
): ProjectedPoint {
  const angle = normAngle * Math.PI * 2 + view.rotation;
  const z = Math.cos(angle);
  const sinA = Math.sin(angle);
  const depthT = (z + 1) / 2;
  const depthScale = 0.52 + 0.48 * depthT;
  const opacity = 0.38 + 0.62 * depthT;
  const x = width * 0.5 + sinA * width * CYLINDER_X_SPREAD * depthScale;
  const y = normHeight * height;
  return { x, y, depthScale, opacity };
}

export interface ViewPadding {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function fitsInBounds(
  rotation: number,
  ideas: Idea[],
  width: number,
  height: number,
  pad: ViewPadding,
  glowRadius: number,
): boolean {
  for (const idea of ideas) {
    const p = projectCylinderPoint(idea.position.x, idea.position.y, width, height, { rotation });
    const r = glowRadius * p.depthScale;
    if (p.x - r < pad.left || p.x + r > width - pad.right) return false;
    if (p.y - r < pad.top || p.y + r > height - pad.bottom) return false;
  }
  return true;
}

/** 限制旋转角，使所有光点在安全区内。 */
export function clampCylinderRotation(
  rotation: number,
  ideas: Idea[],
  width: number,
  height: number,
  pad: ViewPadding,
  glowRadius: number,
): number {
  if (ideas.length === 0 || width <= 0 || height <= 0) return rotation;
  if (fitsInBounds(rotation, ideas, width, height, pad, glowRadius)) return rotation;

  for (let step = 1; step <= 180; step++) {
    const delta = step * 0.015;
    if (fitsInBounds(rotation + delta, ideas, width, height, pad, glowRadius)) return rotation + delta;
    if (fitsInBounds(rotation - delta, ideas, width, height, pad, glowRadius)) return rotation - delta;
  }
  return rotation;
}

export function findIdeaAtPoint(
  ideas: Idea[],
  localX: number,
  localY: number,
  width: number,
  height: number,
  view: CylinderViewState,
  minGlowRadius: number,
): Idea | null {
  let hit: Idea | null = null;
  let bestDist = Infinity;

  for (const idea of ideas) {
    const p = projectCylinderPoint(idea.position.x, idea.position.y, width, height, view);
    const hitR = Math.max(getHitRadius(idea.text.length), minGlowRadius) * p.depthScale;
    const dist = Math.hypot(localX - p.x, localY - p.y);
    if (dist <= hitR && dist < bestDist) {
      bestDist = dist;
      hit = idea;
    }
  }

  return hit;
}
