"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  mode: "designing" | "elevation";
};

/** Matches typical OpenAI edit latency (~1–2 min). */
const EXPECTED_MS = 95_000;
const COLS = 22;
const ROWS = 18;

type Glow = { x: number; y: number; r: number; power: number };

function sampleGlowA(t: number): Glow {
  const a = t * Math.PI * 2;
  return {
    x: 0.32 + Math.cos(a) * 0.22 + Math.sin(a * 1.7) * 0.06,
    y: 0.34 + Math.sin(a * 0.9) * 0.2 + Math.cos(a * 1.3) * 0.05,
    r: 0.28,
    power: 1,
  };
}

function sampleGlowB(t: number): Glow {
  const a = t * Math.PI * 2 + 2.1;
  return {
    x: 0.68 + Math.cos(a * 0.85) * 0.2 + Math.sin(a * 1.4) * 0.05,
    y: 0.66 + Math.sin(a) * 0.18 + Math.cos(a * 0.7) * 0.04,
    r: 0.24,
    power: 0.92,
  };
}

export default function DesignGeneratingLoader({ mode: _mode }: Props) {
  const [percent, setPercent] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startPerfRef = useRef(0);
  const rafRef = useRef(0);
  const percentRef = useRef(1);

  /** Percent uses wall clock — independent of canvas RAF. */
  useEffect(() => {
    const started = Date.now();
    percentRef.current = 1;
    setPercent(1);
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - started;
      const eased = 1 - Math.exp(-2.05 * (elapsed / EXPECTED_MS));
      const next = Math.max(1, Math.min(96, Math.round(eased * 96)));
      if (next !== percentRef.current) {
        percentRef.current = next;
        setPercent(next);
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);

  /** Canvas lights — only performance.now() for animation timing. */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    startPerfRef.current = performance.now();

    const paint = (now: number) => {
      const elapsed = Math.max(0, now - startPerfRef.current);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(1, canvas.clientWidth || 420);
      const cssH = Math.max(1, canvas.clientHeight || 420);
      const w = Math.max(1, Math.floor(cssW * dpr));
      const h = Math.max(1, Math.floor(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, cssW, cssH);

      const phase = elapsed / 1000 / 5.2;
      const glows = [sampleGlowA(phase), sampleGlowB(phase * 0.92)];

      for (const g of glows) {
        const gx = g.x * cssW;
        const gy = g.y * cssH;
        const radius = g.r * Math.min(cssW, cssH) * 1.15;
        const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, radius);
        grad.addColorStop(0, `rgba(255, 125, 35, ${0.5 * g.power})`);
        grad.addColorStop(0.4, `rgba(255, 90, 20, ${0.18 * g.power})`);
        grad.addColorStop(1, "rgba(255, 90, 20, 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let r = 0; r < ROWS; r += 1) {
        for (let c = 0; c < COLS; c += 1) {
          const x = (c + 0.5) / COLS;
          const y = (r + 0.5) / ROWS;
          let heat = 0;
          for (const g of glows) {
            const d = Math.hypot(x - g.x, y - g.y);
            const falloff = Math.max(0, 1 - d / g.r);
            heat = Math.max(heat, falloff * falloff * g.power);
          }
          const px = x * cssW;
          const py = y * cssH;
          const size = 1.1 + heat * 1.5;
          const rr = Math.round(70 + heat * 185);
          const gg = Math.round(55 + heat * 70);
          const bb = Math.round(40 + heat * 10);
          ctx.beginPath();
          ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${0.3 + heat * 0.7})`;
          if (heat > 0.35) {
            ctx.shadowColor = `rgba(255, 120, 30, ${heat * 0.55})`;
            ctx.shadowBlur = 6 + heat * 12;
          } else {
            ctx.shadowBlur = 0;
          }
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.shadowBlur = 0;

      rafRef.current = window.requestAnimationFrame(paint);
    };

    rafRef.current = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="w-full max-w-[420px]">
      <div className="chatgpt-create-frame relative aspect-square w-full overflow-hidden rounded-2xl bg-[#050505]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        <svg
          className="chatgpt-create-net chatgpt-create-net-tr pointer-events-none absolute -right-1 -top-1 h-[58%] w-[58%]"
          viewBox="0 0 200 200"
          fill="none"
          aria-hidden
        >
          <g className="chatgpt-create-net-lines" stroke="rgba(255,255,255,0.4)" strokeWidth="0.85">
            <path d="M200 0L105 95" />
            <path d="M200 28L130 100" />
            <path d="M200 55L150 110" />
            <path d="M200 80L165 120" />
            <path d="M175 0L100 110" />
            <path d="M145 0L95 120" />
            <path d="M115 0L90 125" />
            <path d="M200 0C165 45 140 80 105 115" strokeWidth="0.75" />
            <path d="M200 20C170 55 145 85 115 115" strokeWidth="0.7" opacity="0.7" />
          </g>
          <g className="chatgpt-create-spider">
            <path d="M152 92V118" stroke="rgba(210,210,210,0.55)" strokeWidth="0.7" />
            <ellipse cx="152" cy="88" rx="3.2" ry="2.4" fill="rgba(170,170,170,0.8)" />
            <circle cx="149.5" cy="87" r="0.5" fill="rgba(40,40,40,0.8)" />
            <circle cx="154.5" cy="87" r="0.5" fill="rgba(40,40,40,0.8)" />
          </g>
        </svg>

        <svg
          className="chatgpt-create-net chatgpt-create-net-bl pointer-events-none absolute -bottom-1 -left-1 h-[40%] w-[50%]"
          viewBox="0 0 180 120"
          fill="none"
          aria-hidden
        >
          <g className="chatgpt-create-net-lines" stroke="rgba(255,255,255,0.36)" strokeWidth="0.85">
            <path d="M0 120L75 68" />
            <path d="M0 98L58 62" />
            <path d="M0 78L48 58" />
            <path d="M18 120L85 72" />
            <path d="M42 120L95 78" />
            <path d="M65 120L105 85" />
            <path d="M0 120C45 88 78 72 110 68" strokeWidth="0.7" opacity="0.75" />
          </g>
        </svg>

        <p className="absolute left-4 top-3.5 text-[15px] font-medium text-white/95">
          Creating image
        </p>

        <div className="absolute bottom-3 right-3 rounded-full bg-[#1a1a1a]/85 px-2.5 py-1 text-[12px] font-medium tabular-nums tracking-wide text-[#9eb4c8] backdrop-blur-sm">
          {percent}%
        </div>
      </div>
    </div>
  );
}
