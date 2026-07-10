import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './GlowCanvas.module.css';
import type { Cluster, Idea } from '@/data/types';
import { glowStopsRich } from '@/lib/glowColor';
import { displayKeyword } from '@/lib/keywordDisplay';
import { DEFAULT_GLOW_COLOR } from '@/lib/palette';

interface GlowCanvasProps {
  ideas: Idea[];
  clusters: Cluster[];
  onSelectIdea: (idea: Idea) => void;
  newIdeaId?: string | null;
}

interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}

interface NodeAnim {
  ideaId: string;
  progress: number;
}

const DIFFUSE_CORE = 40;
const DIFFUSE_OUTER = 128;
const GLOW_ALPHA_BOOST = 1.15;

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

function projectPoint(
  idea: Idea,
  width: number,
  height: number,
  view: ViewState,
): { x: number; y: number } {
  return {
    x: idea.position.x * width * view.scale + view.offsetX,
    y: idea.position.y * height * view.scale + view.offsetY,
  };
}

export function GlowCanvas({ ideas, clusters, onSelectIdea, newIdeaId }: GlowCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const draggingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const animsRef = useRef<Map<string, NodeAnim>>(new Map());
  const rafRef = useRef<number>(0);
  const [view, setView] = useState<ViewState>({ offsetX: 0, offsetY: 0, scale: 1 });
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

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, timestamp: number) => {
      ctx.clearRect(0, 0, w, h);
      const currentView = viewRef.current;

      for (const idea of ideas) {
        const anim = animsRef.current.get(idea.id);
        if (anim && anim.progress < 1) {
          anim.progress = Math.min(1, anim.progress + 0.014);
        }
        const enter = anim ? anim.progress : 1;
        const eased = enter < 1 ? 1 - Math.pow(1 - enter, 3) : 1;

        const phase = hashPhase(idea.id);
        const breath = 0.86 + 0.14 * Math.sin(timestamp * 0.0011 + phase);
        const { x: cx, y: cy } = projectPoint(idea, w, h, currentView);
        const outerR = DIFFUSE_OUTER * breath * eased * currentView.scale;
        const coreR = DIFFUSE_CORE * breath * 0.85 * eased * currentView.scale;
        const color = getClusterColor(idea, clusters);

        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fillStyle = applyDiffuseGradient(ctx, cx, cy, outerR, color, breath * eased);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
        ctx.fillStyle = applyDiffuseGradient(ctx, cx, cy, coreR, color, Math.min(1, breath * eased * 1.08));
        ctx.fill();

        if (idea.isUnread) {
          const pulse = 0.55 + 0.45 * Math.sin(timestamp * 0.006 + idea.id.length);
          const ringR = coreR + 10 + pulse * 8;
          ctx.beginPath();
          ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + pulse * 0.32})`;
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
    draw(ctx, size.w, size.h, performance.now());
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw, size, ideas]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = false;
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) draggingRef.current = true;
    if (!e.buttons) return;

    const next = {
      ...viewRef.current,
      offsetX: viewRef.current.offsetX + dx,
      offsetY: viewRef.current.offsetY + dy,
    };
    viewRef.current = next;
    setView(next);
    lastPosRef.current = { x: e.clientX, y: e.clientY };

    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && size.w > 0) draw(ctx, size.w, size.h, performance.now());
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.06 : 0.94;
    const next = {
      ...viewRef.current,
      scale: Math.max(0.5, Math.min(2.2, viewRef.current.scale * factor)),
    };
    viewRef.current = next;
    setView(next);
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx && size.w > 0) draw(ctx, size.w, size.h, performance.now());
  };

  return (
    <div
      ref={rootRef}
      className={styles.root}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      aria-label="深处：你的念头散布于此"
    >
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.anchors} aria-hidden={false}>
        {ideas.map((idea) => {
          const { x, y } = projectPoint(idea, size.w, size.h, view);
          const label = displayKeyword(idea.keyword, idea.text);
          return (
            <button
              key={idea.id}
              type="button"
              className={`${styles.anchor} ${idea.isUnread ? styles.unread : ''}`}
              style={{ left: x, top: y }}
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
