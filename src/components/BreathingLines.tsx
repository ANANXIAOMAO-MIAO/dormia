import { useEffect, useRef } from 'react';

import styles from './BreathingLines.module.css';

const LINE_COUNT = 7;
const W = 800;
const H = 300;

interface LineState {
  y: number;
  amplitude: number;
  frequency: number;
  phase: number;
  speed: number;
  opacity: number;
}

function buildLines(): LineState[] {
  return Array.from({ length: LINE_COUNT }, (_, i) => ({
    y: H * (0.15 + (i / (LINE_COUNT - 1)) * 0.7),
    amplitude: 12 + Math.random() * 18,
    frequency: 0.006 + Math.random() * 0.004,
    phase: (Math.PI * 2 * i) / LINE_COUNT,
    speed: 0.003 + Math.random() * 0.002,
    opacity: 0.25 + (Math.random() * 0.35),
  }));
}

function buildPath(line: LineState, t: number): string {
  const points: string[] = [];
  const step = W / 60;
  for (let x = 0; x <= W; x += step) {
    const y =
      line.y +
      Math.sin(x * line.frequency + line.phase + t * line.speed) * line.amplitude +
      Math.sin(x * line.frequency * 0.5 + t * line.speed * 0.7) * (line.amplitude * 0.4);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M ${points.join(' L ')}`;
}

export function BreathingLines() {
  const svgRef = useRef<SVGSVGElement>(null);
  const linesRef = useRef<LineState[]>(buildLines());
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = Array.from(svg.querySelectorAll<SVGPathElement>('path'));

    const tick = () => {
      tRef.current += 1;
      linesRef.current.forEach((line, i) => {
        paths[i]?.setAttribute('d', buildPath(line, tRef.current));
      });
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className={styles.container}>
      <svg
        ref={svgRef}
        className={styles.svg}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {linesRef.current.map((line, i) => (
          <path
            key={i}
            fill="none"
            stroke={`rgba(155, 142, 216, ${line.opacity * 0.86})`}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        ))}
      </svg>
    </div>
  );
}
