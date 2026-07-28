'use client';

import { useEffect, useRef } from 'react';
import { useMotionCapability } from '@/lib/motion/useReducedMotion.js';
import { SAND, FIELD, GRAIN_COLORS } from '@/lib/motion/config.js';
import { buildHash, neighbours } from './spatial-hash.js';

// FIELD.linkColor / FIELD.dotColor arrive as full rgba() strings so the
// tuned base alpha lives in config.js, not here. We only need the r,g,b
// and base-alpha components of linkColor to fade it by distance.
const LINK_RGBA = FIELD.linkColor.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);

function pickGrainColor() {
  const t = Math.random();
  let acc = 0;
  for (const c of GRAIN_COLORS) {
    acc += c[3];
    if (t < acc) return c;
  }
  return GRAIN_COLORS[GRAIN_COLORS.length - 1];
}

/**
 * Interactive particle field + sand-grain cursor trail.
 *
 * Physics ported from docs/design/prototypes/sand-tuner.html (the client-tuned
 * reference implementation) — background particle drift/linking, then sand
 * grains with friction, gravity and life decay. Values come from
 * lib/motion/config.js; nothing here re-derives or overrides them.
 *
 * Renders nothing and schedules no work at all when the user has asked for
 * reduced motion or is on a coarse (touch) pointer — see useMotionCapability().
 * CSS `prefers-reduced-motion` cannot stop a canvas RAF loop, so this hook is
 * the only gate.
 */
export default function ParticleField() {
  const { enabled } = useMotionCapability();
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let particles = [];
    let grains = [];
    let mx = -9999;
    let my = -9999;
    let pmx = -9999;
    let pmy = -9999;
    let hasPointer = false;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      let count = Math.round((width * height) / FIELD.density);
      if (width < 768) count = Math.round(count / 2);

      particles = new Array(count).fill(null).map((_, i) => ({
        i,
        x: Math.random() * width,
        y: Math.random() * height,
        dx: Math.random() - 0.5,
        dy: Math.random() - 0.5,
        r: Math.random() * 1.3 + 0.6,
      }));
    }

    function onPointerMove(e) {
      pmx = mx;
      pmy = my;
      mx = e.clientX;
      my = e.clientY;
      hasPointer = true;

      if (pmx < -900) return;
      const ddx = mx - pmx;
      const ddy = my - pmy;
      const speed = Math.hypot(ddx, ddy);
      const k = Math.min(SAND.grainsPerMove, Math.max(1, Math.round(speed / 6)));

      for (let j = 0; j < k; j++) {
        const a = Math.atan2(ddy, ddx) + (Math.random() - 0.5) * 1.4;
        const v = Math.min(6, speed * SAND.speed) * (0.35 + Math.random() * 0.9);
        const col = pickGrainColor();
        grains.push({
          x: mx + (Math.random() - 0.5) * 4,
          y: my + (Math.random() - 0.5) * 4,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: 1,
          r: Math.random() * 1.6 + 0.7,
          col,
        });
      }
      if (grains.length > SAND.maxGrains) {
        grains.splice(0, grains.length - SAND.maxGrains);
      }
    }

    function onPointerLeave() {
      hasPointer = false;
      mx = -9999;
      my = -9999;
      pmx = -9999;
      pmy = -9999;
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);

      const driftSpeed = FIELD.drift * 2.4;
      const hash = buildHash(particles, FIELD.linkDistance);
      const drawn = new Set();

      for (const p of particles) {
        if (hasPointer) {
          const rdx = p.x - mx;
          const rdy = p.y - my;
          const d = Math.hypot(rdx, rdy);
          if (d < FIELD.repelRadius && d > 0) {
            p.x += (rdx / d) * 1.0;
            p.y += (rdy / d) * 1.0;
          }
        }

        p.x += p.dx * driftSpeed;
        p.y += p.dy * driftSpeed;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = FIELD.dotColor;
        ctx.fill();

        for (const q of neighbours(hash, p, FIELD.linkDistance)) {
          const pairKey = p.i < q.i ? `${p.i}-${q.i}` : `${q.i}-${p.i}`;
          if (drawn.has(pairKey)) continue;
          drawn.add(pairKey);

          const l = Math.hypot(p.x - q.x, p.y - q.y);
          if (l >= FIELD.linkDistance) continue;
          const alpha = LINK_RGBA[3] * (1 - l / FIELD.linkDistance);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(${LINK_RGBA[0]},${LINK_RGBA[1]},${LINK_RGBA[2]},${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      for (let g = grains.length - 1; g >= 0; g--) {
        const s = grains[g];
        s.vx *= SAND.settle;
        s.vy *= SAND.settle;
        s.vy += SAND.gravity;
        s.x += s.vx;
        s.y += s.vy;
        s.life -= SAND.trailDecay;
        if (s.life <= 0) {
          grains.splice(g, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.col[0]},${s.col[1]},${s.col[2]},${s.life.toFixed(2)})`;
        ctx.fill();
      }
    }

    let rafId = null;
    let isVisible = document.visibilityState !== 'hidden';
    let isIntersecting = true;

    function isActive() {
      return isVisible && isIntersecting;
    }

    function loop() {
      rafId = null;
      if (!isActive()) return;
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function stop() {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function maybeResume() {
      if (isActive() && rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    }

    function onVisibilityChange() {
      isVisible = document.visibilityState !== 'hidden';
      if (isVisible) maybeResume();
      else stop();
    }

    const observer = new IntersectionObserver(
      (entries) => {
        isIntersecting = entries[entries.length - 1].isIntersecting;
        if (isIntersecting) maybeResume();
        else stop();
      },
      { threshold: 0 },
    );
    observer.observe(canvas);

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    maybeResume();

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
