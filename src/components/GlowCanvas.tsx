import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './GlowCanvas.module.css';
import type { Cluster, Idea } from '@/data/types';
import {
  clampCylinderRotation,
  findIdeaAtPoint,
  projectCylinderPoint,
  type CylinderViewState,
  type ViewPadding,
} from '@/lib/cylinderProjection';
import { glowStopsRich } from '@/lib/glowColor';
import { displayKeyword } from '@/lib/keywordDisplay';
import { DEFAULT_GLOW_COLOR } from '@/lib/palette';

interface GlowCanvasProps {
  ideas: Idea[];
  clusters: Cluster[];
  onSelectIdea: (idea: Idea) => void;
  newIdeaId?: string | null;
}

interface NodeAnim {
  ideaId: string;
  progress: number;
}

const DIFFUSE_CORE = 40;
const DIFFUSE_OUTER = 128;
const GLOW_ALPHA_BOOST = 1.15;
const DRAG_THRESHOLD = 6;
const ROTATION_SENSITIVITY = 0.004;

const VIEW_PAD: ViewPadding = {
  left: 24,
  right: 24,
  top: 16,
  bottom: 32,
};

function hashPhase(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 628) / 100;
}

function getClusterColor(idea: Idea, clusters: Cluster[]): string {
  if (!idea.clusterId) return DEFAULT_GLOW_COLOR;
  return clusters.find((c) => c.id === idea.clusterId)?.color ?? DEFAULT_GLOW_COLOR;
}

function applyDiffuseGradient(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  color: string,
  alphaScale: number,
) {
  const stops = glowStopsRich(color);
  const positions = [0, 0.32, 0.68, 1];
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
  stops.forEach((stop, index) => {
    const match = stop.match(/,\s*([\d.]+)\)/);
    const baseAlpha = match ? Number(match[1]) : 0.3;
    const tinted = stop.replace(
      /,\s*[\d.]+\)/,
      `, ${Math.min(1, baseAlpha * alphaScale * GLOW_ALPHA_BOOST).toFixed(3)})`,
    );
    gradient.addColorStop(positions[index], tinted);
  });
  return gradient;
}

export function GlowCanvas({ ideas, clusters, onSelectIdea, newIdeaId }: GlowCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<CylinderViewState>({ rotation: 0 });
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const animsRef = useRef<Map<string, NodeAnim>>(new Map());
  const rafRef = useRef<number>(0);
  const [view, setView] = useState<CylinderViewState>({ rotation: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!newIdeaId) return;
    animsRef.current.set(newIdeaId, { ideaId: newIdeaId, progress: 0 });
  }, [newIdeaId]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  const applyRotation = useCallback(
    (rotation: number) => {
      const clamped = clampCylinderRotation(rotation, ideas, size.w, size.h, VIEW_PAD, DIFFUSE_OUTER);
      viewRef.current = { rotation: clamped };
      setView({ rotation: clamped });
      return clamped;
    },
    [ideas, size.w, size.h],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, timestamp: number) => {
      ctx.clearRect(0, 0, w, h);
      const currentView = viewRef.current;

      const sorted = [...ideas].sort((a, b) => {
        const za = Math.cos(a.position.x * Math.PI * 2 + currentView.rotation);
        const zb = Math.cos(b.position.x * Math.PI * 2 + currentView.rotation);
        return za - zb;
      });

      for (const idea of sorted) {
        const anim = animsRef.current.get(idea.id);
        if (anim && anim.progress < 1) {
          anim.progress = Math.min(1, anim.progress + 0.014);
        }
        const enter = anim ? anim.progress : 1;
        const eased = enter < 1 ? 1 - Math.pow(1 - enter, 3) : 1;

        const phase = hashPhase(idea.id);
        const breath = 0.86 + 0.14 * Math.sin(timestamp * 0.0011 + phase);
        const projected = projectCylinderPoint(idea.position.x, idea.position.y, w, h, currentView);
        const { x: cx, y: cy, depthScale, opacity: depthOpacity } = projected;
        const outerR = DIFFUSE_OUTER * breath * eased * depthScale;
        const coreR = DIFFUSE_CORE * breath * 0.85 * eased * depthScale;
        const color = getClusterColor(idea, clusters);
        const alphaScale = breath * eased * depthOpacity;

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = applyDiffuseGradient(ctx, cx, cy, outerR, color, alphaScale);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = applyDiffuseGradient(ctx, cx, cy, coreR, color, Math.min(1, alphaScale * 1.08));
        ctx.fill();

        if (idea.isUnread) {
          const pulse = 0.55 + 0.45 * Math.sin(timestamp * 0.006 + idea.id.length);
          const ringR = coreR + 10 + pulse * 8;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${(0.28 + pulse * 0.32) * depthOpacity})`;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        }
      }

      if (ideas.length > 0) {
        rafRef.current = requestAnimationFrame((nextTs) => {
          const c = canvasRef.current?.getContext('2d');
          if (c) draw(c, w, h, nextTs);
        });
      }
    },
    [ideas, clusters],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.w <= 0 || size.h <= 0) return;
    canvas.width = size.w;
    canvas.height = size.h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    cancelAnimationFrame(rafRef.current);
    if (ideas.length === 0) return;
    applyRotation(viewRef.current.rotation);
    draw(ctx, size.w, size.h, performance.now());
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, size, ideas, applyRotation]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = false;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      draggingRef.current = true;
    }
    if (!e.buttons) return;

    applyRotation(viewRef.current.rotation + dx * ROTATION_SENSITIVITY);
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && size.w > 0) draw(ctx, size.w, size.h, performance.now());
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current && ideas.length > 0 && rootRef.current) {
      const rect = rootRef.current.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;
      const hit = findIdeaAtPoint(
        ideas,
        localX,
        localY,
        size.w,
        size.h,
        viewRef.current,
        DIFFUSE_CORE,
      );
      if (hit) onSelectIdea(hit);
    }
    draggingRef.current = false;
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      aria-label="深处：你的念头散布于此"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.anchors} aria-hidden={false}>
        {ideas.map((idea) => {
          const projected = projectCylinderPoint(idea.position.x, idea.position.y, size.w, size.h, view);
          const label = displayKeyword(idea.keyword, idea.text);
          const depthOpacity = projected.opacity;
          return (
            <button
              key={idea.id}
              type="button"
              className={`${styles.anchor} ${idea.isUnread ? styles.unread : ''}`}
              style={{
                left: projected.x,
                top: projected.y,
                transform: `translate(-50%, -50%) scale(${projected.depthScale})`,
                opacity: depthOpacity,
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => onSelectIdea(idea)}
              aria-label={`${label}：${idea.text}`}
            >
              <span className={styles.plus}>+</span>
              <span className={styles.keyword}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
