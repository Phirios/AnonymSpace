"use client";

import { createNoise3D } from "simplex-noise";
import { useState, useEffect, useRef } from "react";

type Blob = {
  baseTop: number;
  baseLeft: number;
  size: number;
  color: string;
  speed: number;
  offsetX: number;
  offsetY: number;
};

const colors = ["#60a5fa", "#a855f7", "#22d3ee", "#f472b6"];

const regions = [
  { top: [5, 30], left: [5, 30] },
  { top: [5, 30], left: [60, 85] },
  { top: [55, 80], left: [5, 30] },
  { top: [55, 80], left: [60, 85] },
];

function createInitialBlobs(): Blob[] {
  return Array.from({ length: 4 }).map((_, i) => ({
    baseTop: regions[i].top[0] + Math.random() * (regions[i].top[1] - regions[i].top[0]),
    baseLeft: regions[i].left[0] + Math.random() * (regions[i].left[1] - regions[i].left[0]),
    size: 500 + Math.random() * 300,
    color: colors[i],
    speed: 0.0002 + Math.random() * 0.0002,
    offsetX: Math.random() * 1000,
    offsetY: Math.random() * 1000,
  }));
}

type RenderData = {
  blobs: Blob[];
  positions: { x: number; y: number; scale: number; opacity: number }[];
};

export function BackgroundGlow() {
  const [renderData, setRenderData] = useState<RenderData | null>(null);
  const noise3D = useRef<ReturnType<typeof createNoise3D> | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const blobs = createInitialBlobs();
    noise3D.current = createNoise3D();

    const startTime = performance.now();

    const animate = (time: number) => {
      if (!noise3D.current) return;

      const elapsed = time - startTime;

      const positions = blobs.map((blob) => {
        const t = elapsed * blob.speed;

        const x = noise3D.current!(blob.offsetX, 0, t) * 200;
        const y = noise3D.current!(0, blob.offsetY, t) * 200;
        const scale = 1 + noise3D.current!(blob.offsetX, blob.offsetY, t * 0.5) * 0.15;
        const opacity = 0.5 + noise3D.current!(blob.offsetY, blob.offsetX, t * 0.3) * 0.15;

        return { x, y, scale, opacity };
      });

      setRenderData({ blobs, positions });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  if (!renderData) return null;

  const { blobs, positions } = renderData;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {blobs.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full blur-3xl will-change-transform"
          style={{
            top: `${b.baseTop}%`,
            left: `${b.baseLeft}%`,
            width: b.size,
            height: b.size,
            background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
            transform: `translate(${positions[i]?.x ?? 0}px, ${positions[i]?.y ?? 0}px) scale(${positions[i]?.scale ?? 1})`,
            opacity: positions[i]?.opacity ?? 0.5,
          }}
        />
      ))}
    </div>
  );
}
